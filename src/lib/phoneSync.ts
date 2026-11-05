/**
 * Laufender Sync (Julian 29.10.): the calendars chosen on this phone keep
 * flowing into the shared calendar, so a train ride Google adds from a mail
 * shows up for the partner without anyone doing anything. The phone reads its
 * own calendars when the app opens or comes back, at most every few minutes.
 * New Termine are added, changed ones updated, deleted ones removed. Private
 * calendars go in with title and place, work calendars only as a block
 * "Arbeit" (Julian chose this 29.10.). What FamCal added (Mitbringen, notes,
 * people) stays on the Termin.
 */
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { LIVE } from './live';
import { get, set } from '../state/store';
import type { CalEvent } from '../state/types';
import { hasDeviceCalendars, listCalendars, importDeviceEvents, moveIn, phoneIdOf, phoneMeta, writePhoneEvent, deletePhoneEvent } from './deviceCalendars';
import { getFamily, myRole } from './sync';
import { TODAY, addDays } from './dates';

const CALS = 'famcal.phoneCalendars';
const SEEN = 'famcal.phoneSynced';
/** Synced Termine someone deleted in FamCal: the phone calendar never brings them back. */
const DROPPED = 'famcal.phoneDropped';
/** Synced Termine changed in FamCal: from then on FamCal's version wins (Julian 30.10.: work blocks like normal Termine). */
const EDITED = 'famcal.phoneEdited';
const EVERY_MS = 5 * 60 * 1000;
// A year, like the move in, so a fix to imported Termine reaches all of them (05.11.).
const AHEAD = 365;

const read = async (k: string): Promise<string[]> => {
  try { const v = JSON.parse((await AsyncStorage.getItem(k)) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
};
const write = (k: string, v: string[]) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

/**
 * Called after the calendars were picked: these keep syncing, `ids` of the
 * Termine just moved in count as synced. A calendar switched off takes its
 * Termine out of FamCal again (Julian 05.11.: "toggle it back off"), except
 * the ones changed in FamCal, which now belong to the family.
 */
export async function rememberPhoneCalendars(calIds: string[], synced: string[]) {
  if (Platform.OS === 'web') return;
  const before = await read(SEEN);
  const edited = new Set(await read(EDITED));
  const keep = new Set(synced);
  const gone = new Set(before.filter((id) => !keep.has(id) && !edited.has(id)));
  await write(CALS, calIds);
  await write(SEEN, synced);
  if (gone.size) set((s) => ({ events: s.events.filter((e) => !gone.has(e.id)) }));
}

/** The phone's fields win; what was added in FamCal stays. Same object when nothing changed, so nothing is pushed. */
function merge(old: CalEvent, now: CalEvent): CalEvent {
  const keys = ['title', 'date', 'endDate', 'start', 'end', 'allDay', 'place', 'work', 'source'] as const;
  if (keys.every((k) => (old[k] ?? null) === (now[k] ?? null))) return old;
  const next: CalEvent = { ...old };
  for (const k of keys) (next as Record<string, unknown>)[k] = now[k];
  return next;
}

/**
 * Both ways (Julian 05.11.: "one of them is the right one, the other one is
 * outdated, definitely not a good case"). Each synced Termin remembers the
 * version both sides last agreed on. Whichever side moved away from it wins:
 * the phone's change comes into FamCal, a change made in FamCal (by anyone in
 * the family) is written into the phone calendar it came from. Read-only
 * calendars, work blocks and series are never written; there FamCal's edit
 * simply stays, as before.
 */
const BASE = 'famcal.phoneBase';
/** Deleted in FamCal on the partner's phone (seen live): this phone removes it from its calendar too. */
const GONE = 'famcal.phoneGoneRemote';
const SYNC_KEYS = ['title', 'date', 'endDate', 'start', 'end', 'allDay', 'place'] as const;
const sig = (e: CalEvent) => JSON.stringify(SYNC_KEYS.map((k) => e[k] ?? null));
const readMap = async (k: string): Promise<Record<string, string>> => {
  try { const v = JSON.parse((await AsyncStorage.getItem(k)) ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
};

let last = 0;
let running = false;
let again = false;

export async function syncPhoneCalendars(force = false): Promise<void> {
  if (!LIVE || !hasDeviceCalendars || !getFamily()) return;
  if (running) { if (force) again = true; return; }
  if (!force && Date.now() - last < EVERY_MS) return;
  const calIds = await read(CALS);
  if (!calIds.length) return;
  running = true;
  last = Date.now();
  try {
    if ((await Calendar.getCalendarPermissionsAsync()).status !== 'granted') return;
    const cals = (await listCalendars()).filter((c) => calIds.includes(c.id)).map((c) => ({ ...c, on: true }));
    const read0 = moveIn(await importDeviceEvents(cals, myRole(), AHEAD)).copy;
    const from = addDays(TODAY, -7);
    const to = addDays(TODAY, AHEAD);
    const before = new Set(await read(SEEN));
    const edited = new Set(await read(EDITED));
    const dropped = new Set(await read(DROPPED));
    const goneRemote = new Set(await read(GONE));
    const base = await readMap(BASE);

    // A Termin moved to another day in FamCal keeps its id, while the phone now files it under the new day.
    const byPhone = new Map<string, string[]>();
    for (const id of before) { const pid = phoneIdOf(id); if (pid) byPhone.set(pid, [...(byPhone.get(pid) ?? []), id]); }
    const fresh = read0.map((e) => {
      const pid = phoneIdOf(e.id);
      const meta = pid ? phoneMeta.get(pid) : undefined;
      const old = pid ? byPhone.get(pid) : undefined;
      return pid && meta && !meta.recurring && old?.length === 1 && old[0] !== e.id ? { ...e, id: old[0] } : e;
    });
    const byId = new Map(fresh.map((e) => [e.id, e]));

    const s = get();
    const store = new Map(s.events.map((e) => [e.id, e]));
    const nextBase: Record<string, string> = {};
    const writes: (() => Promise<void>)[] = [];
    const updates = new Map<string, CalEvent>();
    const added: CalEvent[] = [];
    const writable = (id: string) => { const pid = phoneIdOf(id); const m = pid ? phoneMeta.get(pid) : undefined; return pid && m && m.writable && !m.recurring ? pid : null; };

    for (const f of fresh) {
      const mine = store.get(f.id);
      const pid = writable(f.id);
      if (!mine) {
        // Deleted in FamCal, here or live on the partner's phone: the phone calendar loses it too.
        if (dropped.has(f.id) || goneRemote.has(f.id)) {
          if (pid) writes.push(() => deletePhoneEvent(pid));
          continue;
        }
        added.push(f);
        nextBase[f.id] = sig(f);
        continue;
      }
      const fs = sig(f);
      const ms = sig(mine);
      const b = base[f.id];
      if (fs === ms) { nextBase[f.id] = fs; if (mine.source !== f.source || !!mine.work !== !!f.work) updates.set(f.id, merge(mine, f)); continue; }
      // Without a remembered version yet (synced before 05.11.): an edit marked in FamCal wins, otherwise the phone.
      const famChanged = b !== undefined ? ms !== b : edited.has(f.id);
      if (famChanged && pid) {
        writes.push(() => writePhoneEvent(pid, mine));
        nextBase[f.id] = ms;
      } else if (famChanged) {
        if (b !== undefined) nextBase[f.id] = b;
      } else {
        updates.set(f.id, merge(mine, f));
        nextBase[f.id] = fs;
      }
    }

    // Gone from the phone: only what this phone synced before, so nothing typed in FamCal is ever removed.
    // Only inside the window that was read.
    const inside = (e: CalEvent) => e.date >= from && e.date <= to;
    const kept = s.events
      .filter((e) => !before.has(e.id) || byId.has(e.id) || !inside(e))
      .map((e) => updates.get(e.id) ?? e);
    const changed = added.length || kept.length !== s.events.length || kept.some((e, i) => e !== s.events[i]);
    if (changed) {
      // The store may have moved on while the phone was read: apply against the newest state.
      set((now) => {
        const keepIds = new Set(kept.map((e) => e.id));
        const removed = new Set(s.events.filter((e) => !keepIds.has(e.id)).map((e) => e.id));
        const have = new Set(now.events.map((e) => e.id));
        return { events: [...now.events.filter((e) => !removed.has(e.id)).map((e) => updates.get(e.id) ?? e), ...added.filter((e) => !have.has(e.id))] };
      });
    }
    for (const w of writes) { try { await w(); } catch { /* tried again next time */ } }
    const outside = s.events.filter((e) => before.has(e.id) && !inside(e)).map((e) => e.id);
    for (const id of outside) if (base[id]) nextBase[id] = base[id];
    void write(SEEN, [...outside, ...fresh.filter((e) => !dropped.has(e.id) && !goneRemote.has(e.id)).map((e) => e.id)]);
    void AsyncStorage.setItem(BASE, JSON.stringify(nextBase)).catch(() => {});
    if (goneRemote.size) void write(GONE, []);
  } catch {
    // A calendar that cannot be read now is tried again next time; nothing is removed on an error.
  } finally {
    running = false;
    if (again) { again = false; void syncPhoneCalendars(true); }
  }
}

let soon: ReturnType<typeof setTimeout> | null = null;
/** Runs the sync a little later, after the undo toast is gone, so a quick Rückgängig never reaches the phone calendar. */
function syncSoon(ms = 12000) {
  if (Platform.OS === 'web') return;
  if (soon) clearTimeout(soon);
  soon = setTimeout(() => { soon = null; void syncPhoneCalendars(true); }, ms);
}

/** A synced Termin changed or deleted live on the partner's phone. */
export async function notePhoneChange(id: string, deleted: boolean) {
  if (Platform.OS === 'web' || !id.startsWith('imp-')) return;
  if (!(await read(SEEN)).includes(id)) return;
  if (deleted) { const g = await read(GONE); if (!g.includes(id)) void write(GONE, [...g, id].slice(-500)); }
  syncSoon(15000);
}

let listening = false;
/** Runs once after sign-in, then whenever the app comes back to the front. */
export function startPhoneSync() {
  void syncPhoneCalendars(true);
  if (listening || Platform.OS === 'web') return;
  listening = true;
  AppState.addEventListener('change', (st) => { if (st === 'active') void syncPhoneCalendars(); });
}

/** Deleting a synced Termin in FamCal keeps it out; undo lets it back in. */
export async function dropPhoneEvents(ids: string[], back = false) {
  if (Platform.OS === 'web' || !ids.length) return;
  const now = new Set(await read(DROPPED));
  ids.forEach((id) => (back ? now.delete(id) : now.add(id)));
  await write(DROPPED, [...now].slice(-2000));
  syncSoon();
}

/** A synced Termin edited in FamCal keeps the edit; the phone calendar no longer overwrites it. */
export async function keepPhoneEdit(id: string) {
  if (Platform.OS === 'web' || !id) return;
  const now = new Set(await read(EDITED));
  if (!now.has(id)) { now.add(id); await write(EDITED, [...now].slice(-2000)); }
  syncSoon(4000);
}
