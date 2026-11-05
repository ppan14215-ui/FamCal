/**
 * Asks the "verstehen" function what a sentence means (Julian 27.10.:
 * "Handy hört, Claude versteht"). Only in the real app and only when signed
 * in; null means "ask the rules instead" (offline, slow, not understood).
 */
import { fetch as streamFetch } from 'expo/fetch';
import { supabase } from './cloud';
import { getAuth } from './auth';
import { TODAY, NOW } from './dates';
import { persons } from '../theme/tokens';
import { TERMIN_ICON_NAMES, type Understood } from './talk';
import { LANG, tx } from '../i18n/lang';
import { toast, get } from '../state/store';

/** The family's own lists, so Claude can put things on the Watchlist or the Ostsee packing list (Julian 29.10.). */
const myLists = () => get().lists.filter((l) => l.id !== 'wissen').map((l) => ({ id: l.id, name: l.name })).slice(0, 40);

/** The rules have answered already; Claude may take longer for a sentence with many Termine (Julian 28.10.). */
const WAIT_MS = 15000;

export const canUnderstand = () => !!supabase && !!getAuth().session;

/** Claude did not answer (server error, no key): said once, so nobody wonders why the rules guessed. */
let toldDown = false;

/** A cap was hit (Julian 05.11. 22:13: cap AI use). One calm line, once per app launch and reason; the rules keep answering. */
const told = new Set<string>();
export async function limitHint(error: unknown) {
  const res = (error as { context?: Response } | null)?.context;
  if (res && res.status >= 500 && !toldDown) {
    toldDown = true;
    toast(tx('Claude ist gerade nicht erreichbar', "Claude can't be reached right now"), undefined, { kind: 'warn', sub: tx('Ich nehme solange einfache Regeln. Bitte prüf die Einträge.', "I'll use simple rules meanwhile. Please check what I add.") });
    return;
  }
  if (!res || res.status !== 429) return;
  const body = await res.json().catch(() => null);
  const why = body?.reason === 'month' && body?.tier === 'gratis' ? 'free' : body?.reason === 'month' ? 'month' : body?.reason === 'day' ? 'day' : '';
  if (!why || told.has(why)) return;
  told.add(why);
  const sub = tx('Bis dahin verstehe ich dich mit einfachen Regeln. Bitte prüf die Einträge kurz.', 'Until then I use simple rules. Please check what I add.');
  if (why === 'free') toast(tx('Die 30 Sätze für diesen Monat sind verbraucht', 'Your 30 sentences for this month are used up'), undefined, { kind: 'warn', sub: tx('Ich verstehe dich weiter mit einfachen Regeln, mit Plus wieder mit Claude.', 'I keep understanding you with simple rules; Plus brings Claude back.') });
  else if (why === 'day') toast(tx('Für heute habt ihr viel erledigt. Ab morgen bin ich wieder ganz da.', 'You got a lot done today. I’m fully back tomorrow.'), undefined, { kind: 'info', sub });
  else toast(tx('Euer Monat mit Claude ist voll. Am Monatsersten geht es weiter.', 'Your month with Claude is full. It continues on the 1st.'), undefined, { kind: 'info', sub });
}

/** The open card's conversation (Julian 28.10.: weitersprechen statt Sackgasse): what was said, what the app asked, and the card as JSON. */
export type Convo = { history: { said: string; app?: string }[]; draft?: string; recent?: boolean };

export async function understandOnline(text: string, convo?: Convo): Promise<Understood | null> {
  if (!supabase || !getAuth().session) return null;
  const call = supabase.functions
    .invoke<Understood & { left: number | null }>('verstehen', { body: { text, today: TODAY, now: NOW, names: { J: persons.J.name, T: persons.T.name }, lang: LANG, icons: TERMIN_ICON_NAMES, lists: myLists(), ...convo } })
    .then(async ({ data, error }) => {
      if (error || !data) { await limitHint(error); return null; }
      if (data.left === 5) toast(tx('Noch 5 Sätze gratis in diesem Monat', '5 free sentences left this month'), undefined, { kind: 'info' });
      return data;
    })
    .catch(() => null);
  const late = new Promise<null>((r) => setTimeout(() => r(null), WAIT_MS));
  return Promise.race([call, late]);
}

/** What Claude has said so far, read from the half-written JSON (Julian 28.10.: show what is happening). */
export type Glimpse = { kind?: string; title?: string; date?: string; start?: string; dish?: string };

const field = (raw: string, k: string) => raw.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];

/**
 * Like understandOnline, but the answer streams in and `onPartial` hears each
 * new piece (kind, title, date, start) as soon as Claude has written it.
 * Falls back to the plain call if streaming does not work on this phone.
 */
export async function understandLive(text: string, convo: Convo | undefined, onPartial: (p: Glimpse) => void): Promise<Understood | null> {
  const session = getAuth().session;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabase || !session || !url) return null;
  const ctrl = new AbortController();
  const late = setTimeout(() => ctrl.abort(), WAIT_MS);
  try {
    const res = await streamFetch(`${url}/functions/v1/verstehen`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      body: JSON.stringify({ text, today: TODAY, now: NOW, names: { J: persons.J.name, T: persons.T.name }, lang: LANG, icons: TERMIN_ICON_NAMES, lists: myLists(), ...convo, stream: true }),
    });
    if (!res.ok || !res.body) { await limitHint({ context: res as unknown as Response }); return null; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let raw = '';
    let seen = '';
    let done: (Understood & { left: number | null }) | null = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, cut).replace(/^data:\s*/, '');
        buf = buf.slice(cut + 2);
        let ev: { t?: string; done?: Understood & { left: number | null }; error?: string };
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.t) {
          raw += ev.t;
          const p: Glimpse = { kind: field(raw, 'kind'), title: field(raw, 'title'), date: field(raw, 'date'), start: field(raw, 'start'), dish: field(raw, 'dish') };
          const key = JSON.stringify(p);
          if (key !== seen) { seen = key; onPartial(p); }
        }
        if (ev.done) done = ev.done;
        if (ev.error) return null;
      }
    }
    if (done?.left === 5) toast(tx('Noch 5 Sätze gratis in diesem Monat', '5 free sentences left this month'), undefined, { kind: 'info' });
    return done;
  } catch {
    // Aborted after WAIT_MS, or no streaming here: one plain try is not worth the wait, the rules answer.
    return null;
  } finally {
    clearTimeout(late);
  }
}
