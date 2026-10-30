/**
 * Der Assistent (Julian 30.10.: "eine Intelligenz davor schalten, wie du, die
 * versteht, was alles in der App möglich ist und Funktionen ausführen kann").
 * The app sends the sentence and what the family has (Termine, Listen,
 * Aufgaben) to the "assistent" function; Claude answers with actions. They are
 * run here, on the local store, as one plan with one Rückgängig, so it is
 * always clear what the machine did. Unclear means Claude asks first; clear
 * means it is done at once (Julian 30.10.).
 *
 * A switch in the settings (per phone) picks this or the old way, to compare.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch as streamFetch } from 'expo/fetch';
import { supabase } from './cloud';
import { getAuth } from './auth';
import { getPref, setPref } from './prefs';
import { TODAY, NOW, addDays, WD_SHORT, weekday, long, hm, short } from './dates';
import { persons } from '../theme/tokens';
import { LANG, tx } from '../i18n/lang';
import { get, set, actions } from '../state/store';
import type { CalEvent, List, Task, Who } from '../state/types';
import { fromModel, TERMIN_ICON_NAMES, type Understood } from './talk';
import { replyPlan, listFromClaude, gameStart, pointsPlan, liste, type Plan, type Result } from './act';
import { isPoints, players, total } from './points';
import { myRole } from './sync';
import { sendAsk, feedTail } from './feed';
import { newId, itemText } from '../data/sample';

// ─── Switch ────────────────────────────────────────────────────────────────

const KEY = 'famcal.assistent';
let on = getPref('assistent') === '1';
const subs = new Set<() => void>();
AsyncStorage.getItem(KEY).then((v) => { if (v != null && (v === '1') !== on) { on = v === '1'; subs.forEach((l) => l()); } }).catch(() => {});
export function setAgent(v: boolean) {
  on = v;
  setPref('assistent', v ? '1' : '0');
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
  subs.forEach((l) => l());
}
export const agentOn = () => on;
export const useAgent = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => on, () => on);

// ─── What Claude sees ──────────────────────────────────────────────────────

const day = (d: string) => `${d} ${WD_SHORT[weekday(d)]}`;
const whoTag = (w: Who | undefined) => (w === 'both' ? 'beide' : w ? w : '');
const clip = (s: string | undefined, n = 60) => (s ?? '').replace(/[\n\r|]/g, ' ').slice(0, n);

function eventLine(e: CalEvent) {
  const time = e.allDay ? 'ganztägig' : `${e.start}${e.end ? `-${e.end}` : ''}`;
  const span = e.endDate ? ` bis ${day(e.endDate)}` : '';
  const tags = [
    whoTag(e.who),
    e.place ? `Ort ${clip(e.place, 40)}` : '',
    // Work blocks are stored day by day; their repeat text is only a note, so it must not look like a series.
    e.repeat && !e.work ? `${clip(e.repeat, 40)}${e.repeatUntil ? ` bis ${e.repeatUntil}` : ''}` : '',
    e.skipDates?.length ? `ohne ${e.skipDates.slice(-6).join(', ')}` : '',
    e.work ? 'Arbeitstag, einzelner Eintrag' : '',
    e.bring?.length ? `mit ${e.bring.map((b) => clip(b.t, 30)).join(', ')}` : '',
    e.cal === 'feiertage' ? 'Feiertag' : e.cal ? 'aus verbundenem Kalender, nur lesen' : '',
  ].filter(Boolean).join('; ');
  return `${e.id} | ${day(e.date)}${span} | ${time} | ${clip(e.title)}${e.sub ? ` (${clip(e.sub, 40)})` : ''}${tags ? ` | ${tags}` : ''}`;
}

/**
 * The family's state as short lines with ids, so Claude can find "den
 * Zahnarzt am Freitag" and change it. Bounded: about two weeks back and four
 * months ahead, series that still run, open entries of every list.
 */
export function snapshot(): string {
  const { events, lists, tasks, people } = get();
  const from = addDays(TODAY, -14);
  const to = addDays(TODAY, 120);
  const runs = (e: CalEvent) => !!e.repeat && e.date <= to && (!e.repeatUntil || e.repeatUntil >= from);
  const evs = events
    .filter((e) => runs(e) || ((e.endDate ?? e.date) >= from && e.date <= to))
    .filter((e) => e.cal !== 'feiertage' || (e.date >= TODAY && e.date <= addDays(TODAY, 60)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .slice(0, 220);
  const listLines = lists.slice(0, 20).map((l: List) => {
    if (isPoints(l)) {
      return `Punkteliste ${l.id} "${clip(l.name)}": ${players(l).map((p) => `${p.id} ${clip(p.name, 30)} ${total(p)}`).join(', ') || 'noch keine Spieler'}`;
    }
    const all = l.sections.flatMap((s) => s.items);
    const open = all.filter((i) => !i.done).slice(0, 50);
    const done = all.filter((i) => i.done).slice(-10);
    return [`Liste ${l.id} "${clip(l.name)}"${open.length ? '' : ' (leer)'}`, ...open.map((i) => `  ${i.id}: ${clip(itemText(i))}${i.who ? ` (${i.who})` : ''}`), ...(done.length ? [`  abgehakt: ${done.map((i) => `${i.id}: ${clip(itemText(i), 30)}`).join(', ')}`] : [])].join('\n');
  });
  const openTasks = tasks.filter((t: Task) => !t.done).slice(0, 40);
  const doneTasks = tasks.filter((t: Task) => t.done).slice(-5);
  const taskLines = [...openTasks, ...doneTasks].map((t) => `${t.id}: ${clip(t.title)}${t.due ? ` bis ${day(t.due)}` : ''}${t.who ? ` (${whoTag(t.who)})` : ''}${t.done ? ' erledigt' : ''}`);
  return [
    people.length ? `Familie außer den Eltern: ${people.map((p) => clip(p.name, 30)).join(', ')}` : '',
    `Termine (id | Tag | Zeit | Titel | Details):\n${evs.map(eventLine).join('\n') || '(keine)'}`,
    `Listen (die Liste einkauf ist die Einkaufsliste):\n${listLines.join('\n') || '(keine)'}`,
    `Aufgaben:\n${taskLines.join('\n') || '(keine)'}`,
  ].filter(Boolean).join('\n\n');
}

/** The chat a moment ago, so "nein, um 16 Uhr" knows what it is about. Only the last half hour. */
function chatHistory(): { said: string; app?: string }[] {
  const since = new Date(Date.now() - 30 * 60000).toISOString();
  return feedTail(6).filter((f) => f.at >= since && !f.undone).map((f) => ({ said: f.said, app: f.kind === 'made' ? f.say ?? f.text : f.ask ? tx(`Frage an ${persons[f.ask.to].name}`, `Asked ${persons[f.ask.to].name}`) : undefined }));
}

// ─── Asking ────────────────────────────────────────────────────────────────

export type Action = { tool: string; input: Record<string, any> };
export type AgentAnswer = { actions: Action[]; text: string };

const WAIT_MS = 15000;

/** Where the sentence was said: on a list or a Termin, a sentence without another target belongs there. */
export function screenOf(ctx: { kind: string; id?: string }): string {
  if (ctx.kind === 'liste' && ctx.id) { const l = listOf(ctx.id); return l ? `Offen ist die Liste ${l.id} "${clip(l.name)}". Ein Satz ohne anderes Ziel gehört auf diese Liste.` : ''; }
  if (ctx.kind === 'termin' && ctx.id) { const e = get().events.find((x) => x.id === ctx.id.split('~')[0]); return e ? `Offen ist der Termin ${e.id} "${clip(e.title)}"${ctx.id.includes('~') ? ` am ${ctx.id.split('~')[1]}` : ''}. Ein Satz ohne anderes Ziel ändert diesen Termin.` : ''; }
  return '';
}

/** What the app sends for one sentence; the test list (scripts/eval-assistent) sends exactly this too. */
export function agentBody(said: string, history: { said: string; app?: string }[], screen = '') {
  return { text: said, today: TODAY, now: NOW, names: { J: persons.J.name, T: persons.T.name }, me: myRole(), lang: LANG, icons: TERMIN_ICON_NAMES, snapshot: snapshot(), history, screen };
}

export async function askAgent(said: string, lines: { said: string; app?: string }[], screen = '', onSay?: (say: string) => void): Promise<AgentAnswer | null> {
  const session = getAuth().session;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabase || !session || !url) return null;
  const history = [...chatHistory(), ...lines.slice(0, -1)].slice(-6);
  const body = { ...agentBody(said, history, screen), stream: true };
  const ctrl = new AbortController();
  const late = setTimeout(() => ctrl.abort(), WAIT_MS);
  try {
    // Julian 30.10.: "Okay, verstanden, mach ich". The sentence arrives first, while the actions are still being written.
    const res = await streamFetch(`${url}/functions/v1/assistent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let done: AgentAnswer | null = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, cut).replace(/^data:\s*/, '');
        buf = buf.slice(cut + 2);
        let ev: { say?: string; done?: AgentAnswer; error?: string };
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.say) onSay?.(ev.say);
        if (ev.done && Array.isArray(ev.done.actions)) done = ev.done;
        if (ev.error) return null;
      }
    }
    return done;
  } catch {
    return null;
  } finally {
    clearTimeout(late);
  }
}

// ─── Doing ─────────────────────────────────────────────────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => (x as string).trim()) : []);
const whoOf = (v: unknown): Who => (v === 'J' || v === 'T' || v === 'both' ? v : null);
const q = (t: string) => tx(`„${t}“`, `“${t}”`);
const listOf = (id: string) => get().lists.find((l) => l.id === id) ?? get().lists.find((l) => l.name.toLowerCase() === id.toLowerCase());
const findItem = (l: List, id: string) => l.sections.flatMap((x) => x.items).find((i) => i.id === id || i.name.toLowerCase() === id.toLowerCase());
/** The Termine an action names, by id or ids; read-only calendars are left out. */
const eventsOf = (i: Record<string, any>) => [...new Set([s(i.id), ...arr(i.ids)].filter(Boolean).map((x) => x.split('~')[0]))].map((id) => get().events.find((e) => e.id === id)).filter((e): e is CalEvent => !!e && !e.cal).slice(0, 200);
const whenOf = (e: CalEvent) => `${long(e.date)}${e.allDay ? '' : `, ${hm(e.start)}`}`;

/** What Claude said as a Termin, read the way the old path reads it, so work days, series and icons stay the same. */
function terminOf(a: Action, said: string): CalEvent[] {
  const i = a.input;
  const date = s(i.date);
  if (!ISO.test(date) || !s(i.title)) return [];
  const m: Understood = {
    kind: 'termin', title: s(i.title), sub: s(i.sub) || null, date, end_date: ISO.test(s(i.end_date)) ? s(i.end_date) : null,
    start: HHMM.test(s(i.start)) ? s(i.start) : null, end: HHMM.test(s(i.end)) ? s(i.end) : null, who: whoOf(i.who),
    place: s(i.place) || null, repeat: s(i.repeat) || null, bring: arr(i.bring), steps: [], question: s(i.ask_time) || null,
    suggest_bring: arr(i.suggest_bring), icon: s(i.icon) || null, work: !!i.work, follows: true,
  };
  const r = fromModel(m, said, get().events, () => newId('e'));
  return r?.kind === 'added' ? [r.event, ...(r.more ?? [])] : [];
}

/** One step with its undo; plans from the old path (lists, recipes, games) run as they are. */
type Op = { step: string; plan?: Plan; run: () => { lit: string[]; events?: string[]; text: string; undo?: () => void; result?: Result; go?: string } | null };

function fromPlan(p: Plan): Op {
  return {
    plan: p,
    step: `${p.head ?? ''}${p.head && p.steps.length ? ': ' : ''}${p.steps.join(', ')}`.replace(/\.,/g, ',').slice(0, 160),
    run: () => {
      const out = p.run();
      const r = out.result;
      const lit = out.lit ?? (out.land ? [out.land] : []);
      if (r?.kind === 'done') return { lit, events: r.events, text: r.text, undo: r.undo, go: out.go };
      if (r?.kind === 'event') return { lit: [r.event.id], events: [r.event.id], text: tx(`${q(r.event.title)} steht im Kalender.`, `${q(r.event.title)} is in the calendar.`), undo: () => actions.removeEvent(r.event.id), result: r, go: out.go };
      return { lit, text: '', result: r, go: out.go };
    },
  };
}

function opOf(a: Action, said: string): Op | null {
  const i = a.input ?? {};
  switch (a.tool) {
    case 'termin_aendern': {
      // Several at once (Julian 30.10.: "Ändere jeden Mittwoch Arbeit auf Büro" changed only one day): ids holds them all.
      const evs = eventsOf(i);
      if (!evs.length) return null;
      const patchOf = (e: CalEvent) => {
        const patch: Partial<CalEvent> = {};
        if (s(i.title)) patch.title = s(i.title);
        if (typeof i.sub === 'string') patch.sub = s(i.sub) || undefined;
        if (evs.length === 1 && ISO.test(s(i.date))) patch.date = s(i.date);
        if (typeof i.end_date === 'string') patch.endDate = ISO.test(s(i.end_date)) ? s(i.end_date) : undefined;
        if (HHMM.test(s(i.start))) { patch.start = s(i.start); patch.allDay = false; }
        if (HHMM.test(s(i.end))) patch.end = s(i.end);
        if (i.all_day === true) { patch.allDay = true; patch.start = '00:00'; patch.end = undefined; }
        if (i.who !== undefined) patch.who = whoOf(i.who);
        if (typeof i.place === 'string') patch.place = s(i.place) || undefined;
        if (typeof i.repeat === 'string' && !e.work) patch.repeat = s(i.repeat) || undefined;
        if (s(i.icon) && (TERMIN_ICON_NAMES as string[]).includes(s(i.icon))) patch.icon = s(i.icon) as CalEvent['icon'];
        if (typeof i.work === 'boolean') patch.work = i.work || undefined;
        if (typeof i.reminder === 'string') patch.reminder = i.reminder || undefined;
        // A new start without an end keeps the old length.
        if (patch.start && !patch.end && e.end && !e.allDay) {
          const len = (Number(e.end.slice(0, 2)) * 60 + Number(e.end.slice(3))) - (Number(e.start.slice(0, 2)) * 60 + Number(e.start.slice(3)));
          const m = Math.min(1439, Number(patch.start.slice(0, 2)) * 60 + Number(patch.start.slice(3)) + Math.max(15, len));
          patch.end = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        }
        return patch;
      };
      const bring = arr(i.add_bring);
      const changes = evs.map((e) => ({ e, patch: patchOf(e) })).filter((c) => Object.keys(c.patch).length || bring.length);
      if (!changes.length) return null;
      const [first] = changes;
      const after = { ...first.e, ...first.patch };
      const many = changes.length > 1;
      const days = changes.map((c) => short(c.e.date)).join(', ');
      return {
        step: many ? tx(`${changes.length} Termine ändern: ${days}`, `Change ${changes.length} events: ${days}`) : tx(`${q(first.e.title)} ändern: ${whenOf(after)}`, `Change ${q(first.e.title)}: ${whenOf(after)}`),
        run: () => {
          changes.forEach(({ e, patch }) => { actions.updateEvent(e.id, patch); bring.forEach((t) => actions.addBring(e.id, t)); });
          const ids = changes.map((c) => c.e.id);
          return {
            lit: ids, events: ids,
            text: many ? tx(`${changes.length} Termine geändert: ${days}.`, `${changes.length} events changed: ${days}.`) : tx(`${q(after.title)} geändert, ${whenOf(after)}.`, `${q(after.title)} changed, ${whenOf(after)}.`),
            undo: () => changes.forEach((c) => actions.restoreEvent(c.e)),
          };
        },
      };
    }
    case 'termin_loeschen': {
      const evs = eventsOf(i);
      if (!evs.length) return null;
      if (evs.length > 1) {
        const days = evs.map((e) => short(e.date)).join(', ');
        return {
          step: tx(`${evs.length} Termine löschen: ${days}`, `Delete ${evs.length} events: ${days}`),
          run: () => { evs.forEach((e) => actions.removeEvent(e.id)); return { lit: [], text: tx(`${evs.length} Termine gelöscht: ${days}.`, `${evs.length} events deleted: ${days}.`), undo: () => evs.forEach((e) => actions.addEvent(e)) }; },
        };
      }
      const e = evs[0];
      const one = e.repeat && !e.work && ISO.test(s(i.date)) ? s(i.date) : '';
      return {
        step: one ? tx(`${q(e.title)} am ${long(one)} streichen`, `Drop ${q(e.title)} on ${long(one)}`) : tx(`${q(e.title)} löschen`, `Delete ${q(e.title)}`),
        run: () => {
          if (one) actions.skipOccurrence(`${e.id}~${one}`);
          else actions.removeEvent(e.id);
          return { lit: [], text: one ? tx(`${q(e.title)} fällt am ${long(one)} aus.`, `${q(e.title)} is off on ${long(one)}.`) : tx(`${q(e.title)} ist gelöscht.`, `${q(e.title)} is deleted.`), undo: () => (one ? actions.restoreEvent(e) : actions.addEvent(e)) };
        },
      };
    }
    case 'liste_eintragen': {
      const l = listOf(s(i.list));
      const items = arr(i.items);
      if (!items.length) return null;
      return fromPlan(l ? liste(items.join(', '), l.id, l.id === 'aufgaben' ? undefined : items) : listFromClaude({ kind: 'liste', list: 'neu', name: s(i.list), items }, said));
    }
    case 'liste_neu':
      return fromPlan(listFromClaude({ kind: 'liste', list: 'neu', name: s(i.name) || tx('Neue Liste', 'New list'), items: arr(i.items) }, said));
    case 'rezept':
      return fromPlan(listFromClaude({ kind: 'liste', list: 'einkauf', items: arr(i.items), dish: s(i.dish), extra: arr(i.extra), variants: arr(i.variants), have: arr(i.have) }, said));
    case 'eintrag_abhaken':
    case 'eintrag_aendern':
    case 'eintrag_loeschen': {
      const l = listOf(s(i.list));
      const it = l && findItem(l, s(i.item));
      if (!l || !it) return null;
      const name = itemText(it);
      const before = l;
      const restore = () => set((st) => ({ lists: st.lists.map((x) => (x.id === before.id ? before : x)) }));
      if (a.tool === 'eintrag_abhaken') {
        const done = i.done !== false;
        if (it.done === done) return null;
        return { step: done ? tx(`${name} abhaken`, `Tick off ${name}`) : tx(`${name} wieder offen`, `${name} open again`), run: () => { actions.toggleItem(l.id, it.id); return { lit: [it.id], text: done ? tx(`${name} ist abgehakt.`, `${name} is ticked off.`) : tx(`${name} ist wieder offen.`, `${name} is open again.`), undo: restore, go: '/listen' }; } };
      }
      if (a.tool === 'eintrag_aendern') {
        const t = s(i.text);
        if (!t) return null;
        return { step: tx(`${name} wird ${t}`, `${name} becomes ${t}`), run: () => { actions.editItem(l.id, it.id, t); return { lit: [it.id], text: tx(`${t} steht auf ${q(l.name)}.`, `${t} is on ${q(l.name)}.`), undo: restore, go: '/listen' }; } };
      }
      return { step: tx(`${name} von ${q(l.name)} nehmen`, `Take ${name} off ${q(l.name)}`), run: () => { set((st) => ({ lists: st.lists.map((x) => (x.id !== l.id ? x : { ...x, sections: x.sections.map((sec) => ({ ...sec, items: sec.items.filter((y) => y.id !== it.id) })) })) })); return { lit: [], text: tx(`${name} ist von ${q(l.name)} weg.`, `${name} is off ${q(l.name)}.`), undo: restore }; } };
    }
    case 'liste_loeschen': {
      const l = listOf(s(i.list));
      if (!l || l.id === 'einkauf' || l.id === 'aufgaben') return null;
      const at = get().lists.findIndex((x) => x.id === l.id);
      return { step: tx(`Liste ${q(l.name)} löschen`, `Delete list ${q(l.name)}`), run: () => { set((st) => ({ lists: st.lists.filter((x) => x.id !== l.id) })); return { lit: [], text: tx(`Die Liste ${q(l.name)} ist gelöscht.`, `The list ${q(l.name)} is deleted.`), undo: () => set((st) => (st.lists.some((x) => x.id === l.id) ? {} : { lists: [...st.lists.slice(0, at), l, ...st.lists.slice(at)] })) }; } };
    }
    case 'aufgabe_neu': {
      const title = s(i.title).replace(/^./, (c) => c.toUpperCase());
      if (!title) return null;
      const due = ISO.test(s(i.due)) ? s(i.due) : undefined;
      const who = whoOf(i.who);
      return {
        step: `${tx('Aufgabe', 'Task')}: ${title}${due ? tx(', bis ', ', by ') + long(due) : ''}`,
        run: () => { const id = actions.addTask(title, due, who === 'both' ? null : who); return { lit: [id], text: tx(`${q(title)} steht bei den Aufgaben.`, `${q(title)} is on your tasks.`), undo: () => set((st) => ({ tasks: st.tasks.filter((t) => t.id !== id) })), go: '/listen' }; },
      };
    }
    case 'aufgabe_erledigt':
    case 'aufgabe_aendern':
    case 'aufgabe_loeschen': {
      const t = get().tasks.find((x) => x.id === s(i.id));
      if (!t) return null;
      const at = get().tasks.findIndex((x) => x.id === t.id);
      const restore = () => set((st) => ({ tasks: st.tasks.some((x) => x.id === t.id) ? st.tasks.map((x) => (x.id === t.id ? t : x)) : [...st.tasks.slice(0, at), t, ...st.tasks.slice(at)] }));
      if (a.tool === 'aufgabe_erledigt') {
        const done = i.done !== false;
        if (t.done === done) return null;
        return { step: done ? tx(`${q(t.title)} erledigt`, `${q(t.title)} done`) : tx(`${q(t.title)} wieder offen`, `${q(t.title)} open again`), run: () => { actions.toggleTask(t.id); return { lit: [t.id], text: done ? tx(`${q(t.title)} ist erledigt.`, `${q(t.title)} is done.`) : tx(`${q(t.title)} ist wieder offen.`, `${q(t.title)} is open again.`), undo: restore }; } };
      }
      if (a.tool === 'aufgabe_loeschen') {
        return { step: tx(`${q(t.title)} löschen`, `Delete ${q(t.title)}`), run: () => { set((st) => ({ tasks: st.tasks.filter((x) => x.id !== t.id) })); return { lit: [], text: tx(`${q(t.title)} ist gelöscht.`, `${q(t.title)} is deleted.`), undo: restore }; } };
      }
      const patch: Partial<Task> = {};
      if (s(i.title)) patch.title = s(i.title);
      if (typeof i.due === 'string') { patch.due = ISO.test(s(i.due)) ? s(i.due) : undefined; patch.dueLabel = undefined; }
      if (typeof i.who === 'string') patch.who = whoOf(i.who) === 'both' ? null : whoOf(i.who);
      if (!Object.keys(patch).length) return null;
      const title = patch.title ?? t.title;
      return { step: tx(`${q(t.title)} ändern`, `Change ${q(t.title)}`), run: () => { set((st) => ({ tasks: st.tasks.map((x) => (x.id === t.id ? { ...x, ...patch } : x)) })); return { lit: [t.id], text: tx(`${q(title)} geändert${patch.due ? `, bis ${long(patch.due)}` : ''}.`, `${q(title)} changed${patch.due ? `, by ${long(patch.due)}` : ''}.`), undo: restore }; } };
    }
    case 'spiel_neu':
      return s(i.game) ? fromPlan(gameStart(s(i.game), arr(i.players))) : null;
    case 'spiel_runde': {
      const l = listOf(s(i.list));
      const scores = (Array.isArray(i.scores) ? i.scores : []).filter((x: any) => x && typeof x.who === 'string' && Number.isFinite(Number(x.points)));
      if (!l || !isPoints(l) || !scores.length) return null;
      const p = pointsPlan(l, scores.map((x: any) => `${x.who} ${Math.round(Number(x.points))}`).join(', '));
      return p ? fromPlan(p) : null;
    }
    case 'partner_fragen': {
      const question = s(i.question);
      if (!question) return null;
      const to = myRole() === 'J' ? 'T' : 'J';
      return { step: tx(`${persons[to].name} fragen: ${question}`, `Ask ${persons[to].name}: ${question}`), run: () => { sendAsk(question, said); return { lit: [], text: '' }; } };
    }
  }
  return null;
}

/**
 * Julian 30.10.: "Er sollte auch immer antworten". Claude's own sentence is
 * shown as its message above the card; what changed stays visible on the card.
 * Cards that still ask something (a time, which recipe, a clash) keep their question.
 */
function withSay(p: Plan, say: string): Plan {
  if (!say) return p;
  return {
    ...p,
    run: () => {
      const out = p.run();
      const r = out.result;
      if (r?.kind === 'done') return { ...out, result: { ...r, say } };
      if (r?.kind === 'event' && !r.needsTime && !r.ask && !r.suggest) return { ...out, lit: [r.event.id], result: { kind: 'done', say, text: tx(`${q(r.event.title)} steht im Kalender.`, `${q(r.event.title)} is in the calendar.`), events: [r.event.id], undo: () => actions.removeEvent(r.event.id) } };
      return out;
    },
  };
}

/**
 * What the app does with Claude's answer: a question back (nothing changes),
 * an answer, or one plan for all actions with one Rückgängig.
 */
export function agentPlan(r: AgentAnswer, said: string): { ask: string } | Plan | null {
  const p = planOf(r, said);
  const say = s(r.actions.find((a) => a.tool === 'antworten')?.input?.text);
  return p && !('ask' in p) && r.actions.some((a) => a.tool !== 'antworten') ? withSay(p, say) : p;
}

function planOf(r: AgentAnswer, said: string): { ask: string } | Plan | null {
  const ask = r.actions.find((a) => a.tool === 'nachfragen');
  if (ask) return { ask: s(ask.input?.question) || tx('Wie meinst du das?', 'What do you mean?') };
  const answer = r.actions.find((a) => a.tool === 'antworten');
  const rest = r.actions.filter((a) => a.tool !== 'antworten');
  // Termine together, the way the old path adds several: work days and clashes stay as they were.
  const made = rest.filter((a) => a.tool === 'termin_neu').map((a) => terminOf(a, said)).filter((x) => x.length);
  const termine = made.flat();
  const others = rest.filter((a) => a.tool !== 'termin_neu');
  if (!others.length && termine.length) {
    const [event, ...more] = termine;
    // One line per thing said, not per day: work until Christmas is one line.
    const steps = made.map((es) => { const a = es[0]; const z = es[es.length - 1]; const end = z.endDate ?? z.date; return `${a.title}, ${whenOf(a)}${end !== a.date ? tx(` bis ${long(end)}`, ` to ${long(end)}`) : ''}.`; });
    const ask = rest.map((a) => s(a.input?.ask_time)).find(Boolean);
    const one = termine.length === 1 && event.allDay && !event.endDate && !!ask;
    return replyPlan({ kind: 'added', event, more: more.length ? more : undefined, steps, needsTime: one, ask: one ? ask : undefined });
  }
  const ops = [...(termine.length ? [fromPlan(replyPlan({ kind: 'added', event: termine[0], more: termine.slice(1), steps: [] }))] : []), ...others.map((a) => opOf(a, said)).filter(Boolean) as Op[]];
  if (!ops.length) {
    if (!answer) return null;
    const ids = arr(answer.input?.events).filter((id) => get().events.some((e) => e.id === id));
    return { steps: [], run: () => ({ result: { kind: 'answer', reply: { kind: 'answer', text: s(answer.input?.text), events: ids.map((id) => get().events.find((e) => e.id === id)!) } } }) };
  }
  // One list, recipe or game keeps its own card and steps (ticking off ingredients, asking which recipe).
  if (ops.length === 1 && ops[0].plan) return ops[0].plan;
  return {
    head: ops.length === 1 ? undefined : tx(`Ich erledige ${ops.length} Dinge`, `Doing ${ops.length} things`),
    steps: ops.map((o) => o.step),
    run: () => {
      const done = ops.map((o) => o.run()).filter(Boolean) as NonNullable<ReturnType<Op['run']>>[];
      // A clash or a recipe from one part keeps its card when it is the only thing that happened.
      const special = done.find((d) => d.result && d.result.kind !== 'done' && d.result.kind !== 'event');
      if (special && done.length === 1) return { result: special.result, go: special.go };
      const texts = done.map((d) => d.text).filter(Boolean);
      const lit = done.flatMap((d) => d.lit);
      const events = done.flatMap((d) => d.events ?? []);
      const undos = done.map((d) => d.undo).filter(Boolean).reverse() as (() => void)[];
      const text = texts.join(' ') || tx('Erledigt.', 'Done.');
      return { land: lit[0], lit, go: done.find((d) => d.go)?.go, result: { kind: 'done', text, undo: undos.length ? () => undos.forEach((u) => u()) : undefined, events: events.length ? events : undefined, note: !lit.length && !undos.length } };
    },
  };
}

