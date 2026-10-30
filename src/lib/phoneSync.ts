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
import { hasDeviceCalendars, listCalendars, importDeviceEvents, moveIn } from './deviceCalendars';
import { getFamily, myRole } from './sync';
import { TODAY, addDays } from './dates';

const CALS = 'famcal.phoneCalendars';
const SEEN = 'famcal.phoneSynced';
/** Synced Termine someone deleted in FamCal: the phone calendar never brings them back. */
const DROPPED = 'famcal.phoneDropped';
/** Synced Termine changed in FamCal: from then on FamCal's version wins (Julian 30.10.: work blocks like normal Termine). */
const EDITED = 'famcal.phoneEdited';
const EVERY_MS = 5 * 60 * 1000;
const AHEAD = 92;

const read = async (k: string): Promise<string[]> => {
  try { const v = JSON.parse((await AsyncStorage.getItem(k)) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
};
const write = (k: string, v: string[]) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

/** Called after the calendars were picked: these keep syncing, `ids` of the Termine just moved in count as synced. */
export function rememberPhoneCalendars(calIds: string[], synced: string[]) {
  if (Platform.OS === 'web') return;
  void write(CALS, calIds);
  void write(SEEN, synced);
}

/** The phone's fields win; what was added in FamCal stays. Same object when nothing changed, so nothing is pushed. */
function merge(old: CalEvent, now: CalEvent): CalEvent {
  const keys = ['title', 'date', 'endDate', 'start', 'end', 'allDay', 'place', 'work', 'source'] as const;
  if (keys.every((k) => (old[k] ?? null) === (now[k] ?? null))) return old;
  const next: CalEvent = { ...old };
  for (const k of keys) (next as Record<string, unknown>)[k] = now[k];
  return next;
}

let last = 0;
let running = false;

export async function syncPhoneCalendars(force = false): Promise<void> {
  if (!LIVE || !hasDeviceCalendars || running || !getFamily()) return;
  if (!force && Date.now() - last < EVERY_MS) return;
  const calIds = await read(CALS);
  if (!calIds.length) return;
  running = true;
  last = Date.now();
  try {
    if ((await Calendar.getCalendarPermissionsAsync()).status !== 'granted') return;
    const cals = (await listCalendars()).filter((c) => calIds.includes(c.id)).map((c) => ({ ...c, on: true }));
    const fresh = moveIn(await importDeviceEvents(cals, myRole(), AHEAD)).copy;
    const byId = new Map(fresh.map((e) => [e.id, e]));
    // Gone from the phone: only what this phone synced before, so nothing typed in FamCal is ever removed.
    // Only inside the window that was read: a move reaches a year ahead, the sync three months.
    const from = addDays(TODAY, -7);
    const to = addDays(TODAY, AHEAD);
    const before = new Set(await read(SEEN));
    const edited = new Set(await read(EDITED));
    const s = get();
    const inside = (e: CalEvent) => e.date >= from && e.date <= to;
    const kept = s.events.filter((e) => !before.has(e.id) || byId.has(e.id) || !inside(e)).map((e) => (byId.has(e.id) && !edited.has(e.id) ? merge(e, byId.get(e.id)!) : e));
    const have = new Set(kept.map((e) => e.id));
    const dropped = new Set(await read(DROPPED));
    const added = fresh.filter((e) => !have.has(e.id) && !dropped.has(e.id));
    const changed = added.length || kept.length !== s.events.length || kept.some((e, i) => e !== s.events[i]);
    if (changed) set(() => ({ events: [...kept, ...added] }));
    const outside = s.events.filter((e) => before.has(e.id) && !inside(e)).map((e) => e.id);
    void write(SEEN, [...outside, ...fresh.map((e) => e.id)]);
  } catch {
    // A calendar that cannot be read now is tried again next time; nothing is removed on an error.
  } finally {
    running = false;
  }
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
  void write(DROPPED, [...now].slice(-2000));
}

/** A synced Termin edited in FamCal keeps the edit; the phone calendar no longer overwrites it. */
export async function keepPhoneEdit(id: string) {
  if (Platform.OS === 'web' || !id) return;
  const now = new Set(await read(EDITED));
  if (now.has(id)) return;
  now.add(id);
  void write(EDITED, [...now].slice(-2000));
}
