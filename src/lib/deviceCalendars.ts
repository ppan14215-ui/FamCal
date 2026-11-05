/**
 * Real calendars from the phone (Julian 26.10.: "Gerätekalender zuerst").
 * iOS and Android already hold the family's iCloud, Google and Outlook
 * calendars, so the app reads them through expo-calendar without its own
 * backend. The web link has no device calendars and keeps the simulated
 * sign-in (src/data/calendars.ts).
 */
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { TODAY, addDays } from './dates';
import type { CalEvent } from '../state/types';
import type { PersonId } from '../theme';
import { iconFor } from './iconWords';
import { tx } from '../i18n/lang';

export const hasDeviceCalendars = Platform.OS === 'ios' || Platform.OS === 'android';

export type DeviceCal = { id: string; title: string; account: string; color: string; work: boolean; on: boolean; writable?: boolean };

/** Asks once; false when the person says no (the app then explains, never nags). */
export async function askAccess(): Promise<boolean> {
  if (!hasDeviceCalendars) return false;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

const WORK = /arbeit|work|büro|office|firma|dienst/i;
const SKIP = /feiertag|holiday|geburtstag|birthday|siri|vorschläge|suggestions/i;

/** The phone's event calendars, grouped by account. Work calendars only ever show as a block. */
export async function listCalendars(): Promise<DeviceCal[]> {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return all
    .filter((c) => c.isVisible !== false)
    .map((c) => {
      const name = c.source?.name || c.ownerAccount || tx('Dieses Gerät', 'This device');
      // Android names a Google account only by its address; say Google so it is recognised (Julian 05.11.).
      const google = c.source?.type === 'com.google' || /@gmail\.com$|@googlemail\.com$/i.test(name);
      const account = google && !/google/i.test(name) ? `Google · ${name}` : name;
      const work = WORK.test(c.title) || c.source?.type === Calendar.SourceType.EXCHANGE;
      return { id: c.id, title: c.title, account, color: c.color, work, on: !SKIP.test(c.title), writable: c.allowsModifications !== false };
    })
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}


const pad = (n: number) => String(n).padStart(2, '0');
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utcDay = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * What FamCal needs to write a Termin back into the phone calendar (Julian
 * 05.11.: one right version everywhere). Filled while reading, keyed by the
 * phone's own event id.
 */
export type PhoneMeta = { calendarId: string; recurring: boolean; writable: boolean };
export const phoneMeta = new Map<string, PhoneMeta>();
/** The phone's event id inside a FamCal id `imp-<id>-<YYYY-MM-DD>` (or `dev-…` before moving in). */
export const phoneIdOf = (id: string): string | null => (/^(imp|dev)-.+-\d{4}-\d{2}-\d{2}$/.test(id) ? id.slice(4, -11) : null);

/** Events of the chosen calendars, one week back and three months ahead (a move takes a year). */
export async function importDeviceEvents(cals: DeviceCal[], who: PersonId, ahead = 92): Promise<CalEvent[]> {
  const on = cals.filter((c) => c.on);
  if (!on.length) return [];
  const from = new Date(`${addDays(TODAY, -7)}T00:00:00`);
  const to = new Date(`${addDays(TODAY, ahead)}T23:59:59`);
  const events = await Calendar.getEventsAsync(on.map((c) => c.id), from, to);
  return events.map((e): CalEvent => {
    const cal = on.find((c) => c.id === e.calendarId);
    const s = new Date(e.startDate);
    // All-day events end at midnight of the following day (the end is exclusive).
    const en = new Date(new Date(e.endDate).getTime() - (e.allDay ? 1 : 0));
    // Android stores all-day events at midnight UTC, so in Germany a one-day
    // holiday runs 01:00 to 01:00 local time and showed on two days (Julian
    // 05.11.). Read their dates in UTC there; iOS keeps them in local time.
    const utc = e.allDay && Platform.OS === 'android';
    const sd = utc ? utcDay(s) : day(s);
    const ed = utc ? utcDay(en) : day(en);
    const multi = ed !== sd;
    const work = !!cal?.work;
    phoneMeta.set(String(e.id), { calendarId: String(e.calendarId), recurring: !!e.recurrenceRule, writable: !!cal?.writable && !work });
    return {
      id: `dev-${e.id}-${sd}`,
      title: work ? tx('Arbeit', 'Work') : e.title || tx('Termin', 'Event'),
      icon: work ? 'kalender' : iconFor(e.title ?? ''),
      date: sd,
      endDate: multi ? ed : undefined,
      start: e.allDay ? '00:00' : hm(s),
      end: e.allDay || multi ? undefined : hm(en),
      allDay: e.allDay,
      place: work ? undefined : e.location || undefined,
      who,
      work,
      // Account once, calendar name only when it says more (Google names the main calendar after the address).
      source: [cal?.account ?? tx('Gerätekalender', 'Device calendar'), cal?.title && cal.title !== cal.account ? cal.title : ''].filter(Boolean).join(' · '),
    };
  });
}

/**
 * Umzug (Julian 27.10.: "einfache Migration von bestehenden Kalendern"). In
 * the real app the family's own Termine are copied into FamCal, so both
 * parents see them and FamCal becomes the calendar they talk to. Work stays a
 * block "Arbeit" without details. The ids are stable, so moving twice copies
 * nothing twice.
 */
export function moveIn(events: CalEvent[]): { copy: CalEvent[]; keep: CalEvent[] } {
  // Work goes in too, only as the block "Arbeit" without details (Julian 29.10.: "Privat voll, Arbeit als Block").
  const copy = events.map((e) => ({ ...e, id: e.id.replace(/^dev-/, 'imp-'), work: e.work || undefined }));
  return { copy, keep: [] };
}

const at = (date: string, time: string) => new Date(`${date}T${time}:00`);
const utcMidnight = (date: string) => new Date(`${date}T00:00:00Z`);
const nextDay = (date: string) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

/** Writes FamCal's version of a Termin into the phone calendar it came from. */
export async function writePhoneEvent(phoneId: string, e: CalEvent): Promise<void> {
  const lastDay = e.endDate ?? e.date;
  let startDate: Date;
  let endDate: Date;
  let timeZone: string | undefined;
  if (e.allDay) {
    // All-day ends at midnight after the last day; Android keeps them in UTC (see above).
    const android = Platform.OS === 'android';
    startDate = android ? utcMidnight(e.date) : at(e.date, '00:00');
    endDate = android ? utcMidnight(nextDay(lastDay)) : at(nextDay(lastDay), '00:00');
    if (android) timeZone = 'UTC';
  } else {
    startDate = at(e.date, e.start);
    endDate = e.end ? at(lastDay, e.end) : new Date(startDate.getTime() + 60 * 60 * 1000);
    if (endDate <= startDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }
  await Calendar.updateEventAsync(phoneId, {
    title: e.title,
    location: e.place ?? '',
    startDate,
    endDate,
    allDay: !!e.allDay,
    ...(timeZone ? { timeZone } : {}),
  });
}

export async function deletePhoneEvent(phoneId: string): Promise<void> {
  await Calendar.deleteEventAsync(phoneId);
}
