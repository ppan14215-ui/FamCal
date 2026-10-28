/**
 * One calendar for both parents (Julian 27.10.). After sign-in the family and
 * its Termine come from Supabase; every change in the store goes back up, and
 * the partner's changes come in live. The screens keep working on the local
 * store as before, sync only watches it.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './cloud';
import { get, set, subscribe, actions } from '../state/store';
import type { CalEvent, Bring, Person } from '../state/types';
import { watchComments, stopComments } from './comments';
import type { ClayName } from './clayIcons';

export type Family = { id: string; name: string; invite_code: string; partner_name?: string | null; ics_token?: string | null };
type Row = {
  id: string; family_id: string; title: string; sub: string | null; icon: string; date: string; end_date: string | null;
  start_time: string; end_time: string | null; all_day: boolean; who: 'J' | 'T' | 'both' | null; place: string | null;
  bring: Bring[]; repeat: string | null; reminder: string | null; source: string | null; origin?: string | null; origin_id?: string | null; work?: boolean | null;
  people?: string[] | null; note?: string | null; countdown?: boolean | null; repeat_until?: string | null; skip_dates?: string[] | null;
};

const toRow = (e: CalEvent, family_id: string): Row => ({
  id: e.id, family_id, title: e.title, sub: e.sub ?? null, icon: e.icon, date: e.date, end_date: e.endDate ?? null,
  start_time: e.start, end_time: e.end ?? null, all_day: !!e.allDay, who: e.who, place: e.place ?? null,
  bring: e.bring ?? [], repeat: e.repeat ?? null, reminder: e.reminder ?? null, source: e.source ?? null, work: !!e.work,
  people: e.people ?? [], note: e.note ?? null, countdown: !!e.countdown, repeat_until: e.repeatUntil ?? null, skip_dates: e.skipDates ?? [],
});

const NEW_COLS = ['people', 'note', 'countdown', 'repeat_until', 'skip_dates'] as const;
let legacy = false;
const rowFor = (e: CalEvent, family_id: string) => {
  const r: Partial<Row> = toRow(e, family_id);
  if (legacy) NEW_COLS.forEach((k) => delete r[k]);
  return r;
};

const fromRow = (r: Row): CalEvent => ({
  id: r.id, title: r.title, sub: r.sub ?? undefined, icon: r.icon as ClayName, date: r.date, endDate: r.end_date ?? undefined,
  start: r.start_time, end: r.end_time ?? undefined, allDay: r.all_day || undefined, who: r.who, place: r.place ?? undefined,
  bring: r.bring?.length ? r.bring : undefined, repeat: r.repeat ?? undefined, reminder: r.reminder ?? undefined, source: r.source ?? undefined, work: r.work || undefined,
  people: r.people?.length ? r.people : undefined, note: r.note ?? undefined, countdown: r.countdown || undefined,
  repeatUntil: r.repeat_until ?? undefined, skipDates: r.skip_dates?.length ? r.skip_dates : undefined,
});

/** Termine read live from the phone's calendars (and their work blocks) stay on the phone; spoken working hours are shared (Julian 28.10.). */
const shared = (e: CalEvent) => !e.cal && (!e.work || /^(Gesagt|Said)/.test(e.source ?? ''));
const key = (e: CalEvent) => JSON.stringify(e);

let family: Family | null = null;
let me: 'J' | 'T' = 'J';
/** What the server has, by id, so only real changes go up and incoming ones do not echo back. */
let known = new Map<string, string>();
let lastEvents: CalEvent[] | null = null;
let stopStore: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let pushing = Promise.resolve();

export const getFamily = () => family;
export const myRole = () => me;

/** Called once a session exists. Returns the family, or an error to show. */
export async function startSync(name?: string): Promise<{ family?: Family; error?: string }> {
  if (!supabase) return { error: 'offline' };
  stopSync();
  const fam = await supabase.rpc('my_family', { name: name ?? '' });
  if (fam.error) return { error: fam.error.message };
  family = fam.data as Family;

  const [members, events, people] = await Promise.all([
    supabase.from('family_members').select('user_id, role, display_name').eq('family_id', family.id),
    supabase.from('events').select('*').eq('family_id', family.id),
    supabase.from('family_people').select('id, name, kind, color, birthday').eq('family_id', family.id),
  ]);
  if (members.error) return { error: members.error.message };
  if (events.error) return { error: events.error.message };

  const uid = (await supabase.auth.getUser()).data.user?.id;
  const names = { J: '', T: '' };
  for (const m of members.data) {
    names[m.role as 'J' | 'T'] = m.display_name;
    if (m.user_id === uid) me = m.role as 'J' | 'T';
  }
  if (name && !names[me]) names[me] = name;
  // Partner not joined yet: the name typed in onboarding is kept on the family, so it survives every sync.
  const other = me === 'J' ? 'T' : 'J';
  if (!names[other]) {
    const typed = get().names[other];
    if (family.partner_name) names[other] = family.partner_name;
    else if (typed && !get().demo) { names[other] = typed; void setPartnerName(typed); }
  }
  actions.setNames(names);

  const remote = (events.data as Row[]).map(fromRow);
  known = new Map(remote.map((e) => [e.id, key(e)]));
  // Anything entered before signing in on this phone goes up with the rest.
  const local = get().events.filter((e) => shared(e) && !known.has(e.id));
  set((s) => ({ demo: false, events: [...s.events.filter((e) => !shared(e)), ...remote, ...local] }));
  lastEvents = get().events;
  push();

  // Kinder und Großeltern (Julian 28.10.). Before the table existed this simply returns an error and nothing changes.
  if (!people.error) {
    const remoteP = (people.data as PRow[]).map(fromPRow);
    knownP = new Map(remoteP.map((p) => [p.id, JSON.stringify(p)]));
    const localP = get().people.filter((p) => !knownP.has(p.id) && !get().demo);
    actions.setPeople([...remoteP, ...localP]);
    peopleOn = true;
  }
  lastPeople = get().people;
  pushPeople();
  watchComments(family.id);

  stopStore = subscribe(() => {
    if (get().events !== lastEvents) { lastEvents = get().events; push(); }
    if (get().people !== lastPeople) { lastPeople = get().people; pushPeople(); }
  });
  channel = supabase
    .channel(`events:${family.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${family.id}` }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id: string }).id;
        known.delete(id);
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      } else {
        const e = fromRow(p.new as Row);
        if (known.get(e.id) === key(e)) return;
        known.set(e.id, key(e));
        set((s) => ({ events: [...s.events.filter((x) => x.id !== e.id), e] }));
      }
      lastEvents = get().events;
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'family_people', filter: `family_id=eq.${family.id}` }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id: string }).id;
        knownP.delete(id);
        actions.setPeople(get().people.filter((x) => x.id !== id));
      } else {
        const one = fromPRow(p.new as PRow);
        if (knownP.get(one.id) === JSON.stringify(one)) return;
        knownP.set(one.id, JSON.stringify(one));
        actions.setPeople([...get().people.filter((x) => x.id !== one.id), one]);
      }
      lastPeople = get().people;
    })
    .subscribe();
  return { family };
}

/** Sends what changed since the server last saw it. Runs one at a time so two quick edits never cross. */
function push() {
  pushing = pushing.then(async () => {
    if (!supabase || !family) return;
    const now = get().events.filter(shared);
    const ids = new Set(now.map((e) => e.id));
    const changed = now.filter((e) => known.get(e.id) !== key(e));
    const gone = [...known.keys()].filter((id) => !ids.has(id));
    if (changed.length) {
      let { error } = await supabase.from('events').upsert(changed.map((e) => rowFor(e, family!.id)));
      // Before the 28.10. migration the new columns do not exist yet; send the old shape instead of failing.
      if (error && !legacy && /column|schema cache/i.test(error.message)) {
        legacy = true;
        ({ error } = await supabase.from('events').upsert(changed.map((e) => rowFor(e, family!.id))));
      }
      if (!error) changed.forEach((e) => known.set(e.id, key(e)));
      else console.warn('[sync] upsert', error.message);
    }
    if (gone.length) {
      const { error } = await supabase.from('events').delete().in('id', gone);
      if (!error) gone.forEach((id) => known.delete(id));
      else console.warn('[sync] delete', error.message);
    }
  }).catch((e) => console.warn('[sync]', e));
}

type PRow = { id: string; name: string; kind: Person['kind']; color: string; birthday: string | null };
const fromPRow = (r: PRow): Person => ({ id: r.id, name: r.name, kind: r.kind, color: r.color, birthday: r.birthday ?? undefined });
let knownP = new Map<string, string>();
let lastPeople: Person[] | null = null;
let peopleOn = false;

function pushPeople() {
  pushing = pushing.then(async () => {
    if (!supabase || !family || !peopleOn) return;
    const now = get().people;
    const ids = new Set(now.map((p) => p.id));
    const changed = now.filter((p) => knownP.get(p.id) !== JSON.stringify(p));
    const gone = [...knownP.keys()].filter((id) => !ids.has(id));
    if (changed.length) {
      const { error } = await supabase.from('family_people').upsert(changed.map((p) => ({ family_id: family!.id, id: p.id, name: p.name, kind: p.kind, color: p.color, birthday: p.birthday ?? null })));
      if (!error) changed.forEach((p) => knownP.set(p.id, JSON.stringify(p)));
      else console.warn('[sync] people', error.message);
    }
    if (gone.length) {
      const { error } = await supabase.from('family_people').delete().eq('family_id', family.id).in('id', gone);
      if (!error) gone.forEach((id) => knownP.delete(id));
    }
  }).catch((e) => console.warn('[sync]', e));
}

export async function setMyName(name: string) {
  if (!supabase || !family) return;
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (uid) await supabase.from('family_members').update({ display_name: name }).eq('family_id', family.id).eq('user_id', uid);
}

/** The partner's name before they join (Julian 28.10.). */
export async function setPartnerName(name: string) {
  if (!supabase || !family) return;
  const { error } = await supabase.from('families').update({ partner_name: name.trim().slice(0, 40) || null }).eq('id', family.id);
  if (error) console.warn('[sync] partner name', error.message);
  else family = { ...family, partner_name: name.trim() || null };
}

/** Abo Link (Julian 28.10.): a new token makes the old link stop working. */
export async function renewIcsToken(): Promise<string | null> {
  if (!supabase || !family) return null;
  const { data, error } = await supabase.rpc('renew_ics_token');
  if (error || !data) return null;
  family = { ...family, ics_token: data as string };
  return data as string;
}

/** Partner joins the other's family with the six letter code. */
export async function joinFamily(code: string, name?: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { error } = await supabase.rpc('join_family', { code, name: name ?? '' });
  if (error) return { error: error.message };
  const res = await startSync(name);
  return { error: res.error };
}

export function stopSync() {
  stopStore?.(); stopStore = null;
  if (channel) supabase?.removeChannel(channel);
  channel = null;
  stopComments();
  family = null;
  known = new Map();
  knownP = new Map();
  peopleOn = false;
}
