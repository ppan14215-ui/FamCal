/**
 * One calendar for both parents (Julian 27.10.). After sign-in the family and
 * its Termine come from Supabase; every change in the store goes back up, and
 * the partner's changes come in live. The screens keep working on the local
 * store as before, sync only watches it.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { setFamily } from './analytics';
import { supabase, allRows } from './cloud';
import { get, set, subscribe, actions, setMeRole, colorsReady } from '../state/store';
import type { CalEvent, Bring, Person } from '../state/types';
import { watchComments, stopComments } from './comments';
import type { ClayName } from './clayIcons';
import { applyFamilyKi, onSaveOhneKi } from './privat';
import { applyFamilyDur, onSaveTermDur, termDur } from './dauer';
import { readCache, writeCache, clearCache } from './cache';
import { THEMES } from '../theme/tokens';
import { colorsTouched, redrawIfTouched } from '../theme/mode';
import { ROLES, cleanColors, sameColors, mergeColors, rolesToTake, firstUpload, type Role, type FamilyColors } from './familyColors';

export type Family = { id: string; name: string; invite_code: string; ohne_ki?: boolean | null; termin_dauer?: number | null; partner_name?: string | null; ics_token?: string | null; vacation?: Partial<Record<'J' | 'T', number>> | null; colors?: FamilyColors | null; land?: string | null; country?: string | null; ort?: string | null };
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

/** Termine read live from the phone's calendars stay on the phone; spoken working hours and synced work blocks are shared (Julian 28.10., 29.10.). */
const shared = (e: CalEvent) => !e.cal && (!e.work || /^(Gesagt|Said)/.test(e.source ?? '') || e.id.startsWith('imp-'));
const key = (e: CalEvent) => JSON.stringify(e);

let family: Family | null = null;
let me: 'J' | 'T' = 'J';
/** What the server has, by id, so only real changes go up and incoming ones do not echo back. */
let known = new Map<string, string>();
let lastEvents: CalEvent[] | null = null;
let stopStore: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let pushing = Promise.resolve();

/**
 * The parents' colours are the family's (Julian 17.11.: "Ja, und Farben für beide Handys"); families.colors holds
 * the place in the colour row by role. A colour chosen here and not confirmed by the server yet wins over what the
 * family has, like an unsent Termin; it is remembered across a restart.
 */
const COLOR_ROW = Math.max(...THEMES.map((t) => t.colors.length));
const UNSENT_KEY = 'famcal.colors.unsent';
const unsentColors = new Set<Role>();
const unsentReady = AsyncStorage.getItem(UNSENT_KEY).then((kept) => { ROLES.forEach((p) => { if (kept?.includes(p)) unsentColors.add(p); }); }).catch(() => {});
let lastColors: Record<Role, number> = { J: get().colors.J, T: get().colors.T };
let takingColors = false;
const keepUnsent = () => { (unsentColors.size ? AsyncStorage.setItem(UNSENT_KEY, [...unsentColors].join('')) : AsyncStorage.removeItem(UNSENT_KEY)).catch(() => {}); };
// The phone's own saved colours come back a moment after start; that is not a choice.
let coloursBack = false;
void colorsReady.then(() => { coloursBack = true; lastColors = { J: get().colors.J, T: get().colors.T }; });
// A colour chosen on this phone is marked at once, also while there is no network (the family is known from the
// cache): it goes up as soon as the server is reached. The family's colours arriving, the sample family and a
// sign out are no choice.
subscribe(() => {
  const c = get().colors;
  if (c.J === lastColors.J && c.T === lastColors.T) return;
  const before = lastColors;
  lastColors = { J: c.J, T: c.T };
  if (!coloursBack || takingColors || !family || get().demo) return;
  // Every change of the store passes here: a hiccup with the colours must never stop anything else.
  try {
    ROLES.forEach((p) => { if (c[p] !== before[p]) unsentColors.add(p); });
    keepUnsent();
    if (live) saveColors();
  } catch (e) { console.warn('[sync] colors', e); }
});

/** The family's colours come onto this phone, and the pages draw again. A choice still waiting here stays. */
function takeColors(c: FamilyColors) {
  const roles = rolesToTake(c, get().colors, unsentColors);
  takingColors = true;
  try { roles.forEach((p) => actions.setColor(p, c[p]!)); } finally { takingColors = false; }
  lastColors = { J: get().colors.J, T: get().colors.T };
  if (roles.length) { colorsTouched(); redrawIfTouched(); }
}

/** A colour was chosen on this phone: it goes to the family. Runs in line with the Termine, so a catch up never crosses it. */
function saveColors() {
  pushing = pushing.then(async () => {
    if (!supabase || !family || !unsentColors.size) return;
    const fam = family.id;
    // The whole object is written, so the server's colours are read first and only what was chosen here goes over them.
    const cur = await supabase.from('families').select('colors').eq('id', fam).maybeSingle();
    // Not there (no network, or the column does not exist yet): it stays marked and goes with the next catch up.
    if (cur.error) { console.warn('[sync] colors', cur.error.message); return; }
    if (family?.id !== fam) return;
    const server = cleanColors((cur.data as { colors?: unknown } | null)?.colors, COLOR_ROW);
    const roles = [...unsentColors];
    const next = mergeColors(server, get().colors, roles);
    if (!sameColors(next, server)) {
      const { error } = await supabase.from('families').update({ colors: next }).eq('id', fam);
      if (error) { console.warn('[sync] colors', error.message); return; }
    }
    if (family?.id !== fam) return;
    family = { ...family, colors: next };
    // Changed again while this was on its way: that one stays marked, its own save follows.
    roles.forEach((p) => { if (get().colors[p] === next[p]) unsentColors.delete(p); });
    keepUnsent();
    // What the other phone chose for the other parent comes along.
    takeColors(next);
  }).catch((e) => console.warn('[sync]', e));
}

export const getFamily = () => family;

/**
 * Whether this run of the app has the family's Termine yet. Until then a chat card cannot tell a
 * deleted Termin from one still loading; it said "Nicht mehr im Kalender" and "Im Kalender" at once
 * (Julian 04.11.). Cards wait for this before they call a Termin gone.
 */
let loaded = false;
const loadSubs = new Set<() => void>();
const setLoaded = (v: boolean) => { if (loaded === v) return; loaded = v; loadSubs.forEach((f) => f()); };
export const eventsLoaded = () => loaded;
export function useEventsLoaded(): boolean {
  return useSyncExternalStore((f) => { loadSubs.add(f); return () => { loadSubs.delete(f); }; }, () => loaded, () => loaded);
}
export const myRole = () => me;

/** Called once a session exists. Returns the family, or an error to show. */
export async function startSync(name?: string): Promise<{ family?: Family; error?: string }> {
  if (!supabase) return { error: 'offline' };
  // Everything is read first; a phone without network keeps what it has (from the cache) and tries again.
  let fam;
  try { fam = await supabase.rpc('my_family', { name: name ?? '' }); } catch (e) { return { error: String(e) }; }
  if (fam.error) return { error: fam.error.message };
  const got = fam.data as Family;
  let members, events, people;
  try {
    [members, events, people] = await Promise.all([
      supabase.from('family_members').select('user_id, role, display_name').eq('family_id', got.id),
      allRows<Row>((a, b) => supabase!.from('events').select('*').eq('family_id', got.id).order('id').range(a, b)),
      supabase.from('family_people').select('id, name, kind, color, birthday').eq('family_id', got.id),
    ]);
  } catch (e) { return { error: String(e) }; }
  if (members.error) return { error: members.error.message };
  if (events.error) return { error: events.error.message };
  // What the server confirmed last time (cache), so changes made here meanwhile are told apart from deletions elsewhere.
  const prev = prevKnown && prevFamily === got.id ? prevKnown : new Map<string, string>();
  prevKnown = null;
  stopSync();
  family = got;
  // Ohne KI holds for the whole family (Julian 05.11.): the partner's switch reaches this phone here.
  applyFamilyKi(family.ohne_ki);
  // The Standarddauer is the family's too (Julian 19.11.): one set on this phone before the family had one goes up once.
  if (family.termin_dauer != null) applyFamilyDur(family.termin_dauer);
  else if (termDur() && 'termin_dauer' in family) void saveTermDur(termDur());

  const uid = (await supabase.auth.getSession()).data.session?.user.id;
  const names = { J: '', T: '' };
  for (const m of members.data) {
    names[m.role as 'J' | 'T'] = m.display_name;
    if (m.user_id === uid) { me = m.role as 'J' | 'T'; setMeRole(me); }
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
  setFamily(family.id, { members: members.data.length });
  // Urlaubstage and Bundesland are the family's: what this phone set before signing in goes up once.
  const vac = { ...get().vacation, ...(family.vacation ?? {}) };
  set(() => ({ vacation: vac }));
  if (Object.keys(vac).length > Object.keys(family.vacation ?? {}).length) void saveVacation();
  if (family.country || family.land) {
    set(() => ({ country: family!.country ?? 'DE', land: family!.land ?? '', city: family!.ort ?? get().city }));
    actions.ensureHolidays();
  } else if (get().land || get().country !== 'DE') void saveLand();
  // The parents' colours are the family's as well: what the family has holds here. A choice made on this phone
  // that never reached the server stays, and a family without a colour for someone takes this phone's once.
  // Whatever goes wrong with the colours, the Termine below still sync.
  try {
    await Promise.all([colorsReady, unsentReady]);
    // Signed out meanwhile: there is no family to take colours from.
    if (family?.id === got.id) {
      const famColors = cleanColors(family.colors, COLOR_ROW);
      family = { ...family, colors: famColors };
      firstUpload(famColors, get().colors).forEach((p) => unsentColors.add(p));
      takeColors(famColors);
      if (unsentColors.size) { keepUnsent(); saveColors(); }
    }
  } catch (e) { console.warn('[sync] colors', e); }

  const remote = (events.data as Row[]).map(fromRow);
  const mine = new Map(get().events.filter(shared).map((e) => [e.id, e]));
  const merged: CalEvent[] = [];
  known = new Map(remote.map((e) => [e.id, key(e)]));
  for (const r of remote) {
    const here = mine.get(r.id);
    // Deleted on this phone while offline, and nobody changed it since: stays deleted (push sends it).
    if (!here) { if (prev.get(r.id) !== key(r)) merged.push(r); continue; }
    // Changed here and not sent yet: this phone's version goes up.
    merged.push(prev.has(r.id) && prev.get(r.id) !== key(here) ? here : r);
  }
  // Only on this phone: new (entered offline or before signing in), goes up. Known before but gone from the server: deleted elsewhere.
  for (const [id, e] of mine) if (!known.has(id) && !prev.has(id)) merged.push(e);
  set((s) => ({ demo: false, events: [...s.events.filter((e) => !shared(e)), ...merged] }));
  actions.ensureHolidays();
  lastEvents = get().events;
  setLoaded(true);
  live = true;
  if (uid) writeCache({ uid, family, me, names: get().names });
  saveEvents();
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
  // Fotos der Personen Kreise (Julian 14.11.): privat für die Familie, jedes Handy hält seine Kopie.
  void import('./photoSync').then((m) => m.syncPhotos(family!.id, !people.error)).catch(() => {});
  watchComments(family.id);
  // Listen, Aufgaben und der Familienchat (Julian 29.10.).
  void import('./listSync').then((m) => m.startListSync(family!.id)).catch(() => {});
  void import('./feed').then((m) => m.startFeed(family!.id)).catch(() => {});
  // Laufender Sync from this phone's calendars (Julian 29.10.).
  void import('./phoneSync').then((m) => m.startPhoneSync()).catch(() => {});

  stopStore = subscribe(() => {
    if (get().events !== lastEvents) { lastEvents = get().events; saveEvents(); push(); }
    if (get().people !== lastPeople) { lastPeople = get().people; pushPeople(); }
  });
  channel = supabase
    .channel(`events:${family.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${family.id}` }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id: string }).id;
        known.delete(id);
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
        // A Termin from this phone's calendar deleted by the partner leaves the phone calendar too (Julian 05.11.).
        if (id.startsWith('imp-')) void import('./phoneSync').then((m) => m.notePhoneChange(id, true)).catch(() => {});
      } else {
        const e = fromRow(p.new as Row);
        if (known.get(e.id) === key(e)) return;
        known.set(e.id, key(e));
        set((s) => ({ events: [...s.events.filter((x) => x.id !== e.id), e] }));
        if (e.id.startsWith('imp-')) void import('./phoneSync').then((m) => m.notePhoneChange(e.id, false)).catch(() => {});
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
    // Deletes carry only the id and are never sent through a filter (Supabase limitation without
    // replica identity full), so the partner's deletions never arrived live (Audit 09.11.). An unknown
    // id is someone else's; a known one asks the server once what is really there.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, (p) => {
      const id = (p.old as { id?: string })?.id;
      if (id && known.has(id)) catchUpSoon();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'family_people' }, (p) => {
      const id = (p.old as { id?: string })?.id;
      if (id && knownP.has(id)) catchUpSoon();
    })
    .subscribe((status) => {
      // Back after the connection dropped: what happened meanwhile is fetched once.
      if (status === 'SUBSCRIBED') { if (subscribedOnce) catchUpSoon(); subscribedOnce = true; }
    });
  return { family };
}

let subscribedOnce = false;
let soon: ReturnType<typeof setTimeout> | undefined;
/** Several triggers in a row (resume, reconnect, a delete) fetch only once. */
export function catchUpSoon(ms = 400) {
  clearTimeout(soon);
  soon = setTimeout(() => { void catchUp(); }, ms);
}

/**
 * Brings this phone level with the server without losing what it has not sent yet (Audit 09.11.):
 * the live channel sleeps while the app is in the background, so whatever the partner added, moved
 * or deleted meanwhile was missing until the app was killed and opened again.
 * Rules: a Termin changed here and not yet sent stays as it is here; one the server no longer has
 * but this phone knew was deleted elsewhere and goes; one only here is new and goes up.
 */
export function catchUp(): Promise<void> {
  pushing = pushing.then(async () => {
    if (!supabase || !family) return;
    const fam = family.id;
    const [res, people, colours] = await Promise.all([
      allRows<Row>((a, b) => supabase!.from('events').select('*').eq('family_id', fam).order('id').range(a, b)),
      peopleOn ? supabase.from('family_people').select('id, name, kind, color, birthday').eq('family_id', fam) : Promise.resolve(null),
      // The parents' colours, in case the other phone chose a new one meanwhile. Before the column exists this is an error and nothing changes.
      // A failure here never stops the Termine from catching up.
      supabase.from('families').select('colors').eq('id', fam).maybeSingle().then((r) => r, () => null),
    ]);
    // The Standarddauer, in case the other phone (or Memo there) changed it. Before the column exists nothing changes.
    void supabase.from('families').select('termin_dauer').eq('id', fam).maybeSingle().then((r) => {
      const v = (r.data as { termin_dauer?: number | null } | null)?.termin_dauer;
      if (!r.error && family?.id === fam && v != null) { family = { ...family, termin_dauer: v }; applyFamilyDur(v); }
    }, () => {});
    if (family?.id === fam && colours && !colours.error && colours.data) {
      try {
        const c = cleanColors((colours.data as { colors?: unknown }).colors, COLOR_ROW);
        family = { ...family, colors: c };
        takeColors(c);
      } catch (e) { console.warn('[sync] colors', e); }
    }
    if (res.error || family?.id !== fam) return;
    const remote = (res.data as Row[]).map(fromRow);
    // An empty answer for a family that had Termine is a hiccup, never a reason to clear the phone.
    if (!remote.length && known.size) return;
    const remoteIds = new Set(remote.map((e) => e.id));
    const mine = new Map(get().events.filter(shared).map((e) => [e.id, e]));
    const merged: CalEvent[] = [];
    const nextKnown = new Map<string, string>();
    for (const r of remote) {
      const here = mine.get(r.id);
      nextKnown.set(r.id, key(r));
      // Deleted here and the delete did not reach the server yet: stays deleted, push sends it.
      if (!here) { if (known.get(r.id) !== key(r)) merged.push(r); continue; }
      const unsent = known.has(r.id) && known.get(r.id) !== key(here);
      merged.push(unsent ? here : r);
    }
    for (const [id, e] of mine) if (!remoteIds.has(id) && !known.has(id)) merged.push(e);
    known = nextKnown;
    set((st) => ({ events: [...st.events.filter((e) => !shared(e)), ...merged] }));
    lastEvents = get().events;
    saveEvents();
    if (people && !people.error) {
      const remoteP = (people.data as PRow[]).map(fromPRow);
      const ids = new Set(remoteP.map((x) => x.id));
      const newHere = get().people.filter((x) => !ids.has(x.id) && !knownP.has(x.id));
      knownP = new Map(remoteP.map((x) => [x.id, JSON.stringify(x)]));
      actions.setPeople([...remoteP, ...newHere]);
      lastPeople = get().people;
    }
    void import('./photoSync').then((m) => m.syncPhotos(fam, !!people && !people.error)).catch(() => {});
  }).catch((e) => console.warn('[sync] catch up', e));
  return pushing.then(() => { push(); pushPeople(); if (unsentColors.size) saveColors(); });
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
    if (changed.length || gone.length) saveEvents();
  }).catch((e) => console.warn('[sync]', e));
}

/** The shared Termine and what the server confirmed, onto the phone (src/lib/cache.ts). */
function saveEvents() {
  if (!family) return;
  writeCache({ events: get().events.filter(shared), known: [...known] });
}

let live = false;
let prevKnown: Map<string, string> | null = null;
let prevFamily: string | null = null;
/** startSync reached the server in this run; before that the phone shows its cache. */
export const isSyncLive = () => live;

/**
 * Opens the calendar from the phone right away (Audit 09.11.: without network the app stayed on a
 * blank screen). Returns false when this account has nothing cached yet.
 */
export async function restoreFromCache(uid: string): Promise<boolean> {
  const c = await readCache(uid);
  if (!c?.family || !c.events) return false;
  family = c.family as Family;
  me = c.me; setMeRole(me);
  actions.setNames(c.names);
  applyFamilyKi(family.ohne_ki);
  applyFamilyDur(family.termin_dauer);
  set((s) => ({ demo: false, events: [...s.events.filter((e) => !shared(e)), ...(c.events as CalEvent[])] }));
  actions.ensureHolidays();
  prevKnown = new Map(c.known ?? []);
  prevFamily = family.id;
  known = new Map(prevKnown);
  setLoaded(true);
  void import('./listSync').then((m) => m.restoreLists(c)).catch(() => {});
  // Until the server answers, what is changed here is at least kept on the phone.
  stopStore?.();
  let ev = get().events; let ls = get().lists; let ts = get().tasks;
  stopStore = subscribe(() => {
    const st = get();
    if (st.events !== ev) { ev = st.events; saveEvents(); }
    if (st.lists !== ls || st.tasks !== ts) { ls = st.lists; ts = st.tasks; writeCache({ lists: ls, tasks: ts }); }
  });
  return true;
}

let trying = false;
/** Without network at the start: tries again with growing pauses (and on every return, src/lib/lifecycle.ts). */
export async function syncUntilLive() {
  if (trying || live) return;
  trying = true;
  try {
    for (const wait of [0, 3000, 10000, 30000, 60000, 120000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (live || !family) return;
      const res = await startSync();
      if (!res.error) return;
    }
  } finally { trying = false; }
}

/** Signing out leaves nothing of the family on the phone: next account starts clean. */
export async function forgetLocal() {
  stopSync();
  live = false;
  prevKnown = null;
  // A colour still waiting to go up belonged to the family that is left now.
  unsentColors.clear(); keepUnsent();
  setLoaded(false);
  await clearCache();
  actions.reset();
  void import('./feed').then((m) => m.clearFeed()).catch(() => {});
  void import('./photoSync').then((m) => m.forgetPhotos()).catch(() => {});
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

// Ohne KI is written on the family, so the server refuses the AI for every phone of it (Julian 05.11.).
onSaveOhneKi(async (v) => {
  if (!supabase || !family) return true;
  const { error } = await supabase.from('families').update({ ohne_ki: v }).eq('id', family.id);
  if (error) { console.warn('[sync] ohne_ki', error.message); return false; }
  family = { ...family, ohne_ki: v };
  return true;
});

// The Standarddauer neuer Termine is written on the family, so both phones use the same (Julian 19.11.).
async function saveTermDur(min: number): Promise<boolean> {
  if (!supabase || !family) return true;
  const { error } = await supabase.from('families').update({ termin_dauer: min }).eq('id', family.id);
  if (error) { console.warn('[sync] termin_dauer', error.message); return false; }
  family = { ...family, termin_dauer: min };
  return true;
}
onSaveTermDur(saveTermDur);

/** The partner's name before they join (Julian 28.10.). */
export async function setPartnerName(name: string) {
  if (!supabase || !family) return;
  const { error } = await supabase.from('families').update({ partner_name: name.trim().slice(0, 40) || null }).eq('id', family.id);
  if (error) console.warn('[sync] partner name', error.message);
  else family = { ...family, partner_name: name.trim() || null };
}

export async function saveVacation() {
  if (!supabase || !family) return;
  const vacation = Object.fromEntries(Object.entries(get().vacation).filter(([, n]) => typeof n === 'number'));
  const { error } = await supabase.from('families').update({ vacation }).eq('id', family.id);
  if (error) console.warn('[sync] vacation', error.message);
  else family = { ...family, vacation };
}

export async function saveLand() {
  if (!supabase || !family) return;
  const { land, country, city } = get();
  const row = { land: land.slice(0, 40) || null, country: country || null, ort: city.slice(0, 80) || null };
  let { error } = await supabase.from('families').update(row).eq('id', family.id);
  // Before the country column exists only the land goes up.
  if (error && /country|ort/.test(error.message)) ({ error } = await supabase.from('families').update({ land: row.land }).eq('id', family.id));
  if (error) console.warn('[sync] land', error.message);
  else family = { ...family, ...row };
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
  clearTimeout(soon);
  subscribedOnce = false;
  live = false;
  if (channel) supabase?.removeChannel(channel);
  channel = null;
  stopComments();
  void import('./feed').then((m) => m.stopFeed()).catch(() => {});
  void import('./listSync').then((m) => m.stopListSync()).catch(() => {});
  family = null;
  known = new Map();
  knownP = new Map();
  peopleOn = false;
}
