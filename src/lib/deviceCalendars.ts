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
import type { ClayName } from './clayIcons';
import { tx } from '../i18n/lang';

export const hasDeviceCalendars = Platform.OS === 'ios' || Platform.OS === 'android';

export type DeviceCal = { id: string; title: string; account: string; color: string; work: boolean; on: boolean };

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
      const account = c.source?.name || c.ownerAccount || tx('Dieses Gerät', 'This device');
      const work = WORK.test(c.title) || c.source?.type === Calendar.SourceType.EXCHANGE;
      return { id: c.id, title: c.title, account, color: c.color, work, on: !SKIP.test(c.title) };
    })
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

// A clay symbol from the title; the family can change it on the Termin.
const ICONS: [RegExp, ClayName][] = [
  [/zahnarzt/i, 'zahnarzt'],
  [/\bU\d\b|kinderarzt|arzt|dr\.|praxis/i, 'stethoskop'],
  [/impf/i, 'impfung'],
  [/geburtstag|birthday/i, 'geburtstag'],
  [/kita|kindergarten|krippe/i, 'kita'],
  [/pass|ausweis|bürgeramt|kundenzentrum|amt\b/i, 'reisepass'],
  [/essen|dinner|abendessen|kochen|brunch/i, 'kochtopf'],
  [/einkauf|supermarkt/i, 'einkauf'],
  [/hebamme/i, 'hebamme'],
];
const iconFor = (title: string): ClayName => ICONS.find(([r]) => r.test(title))?.[1] ?? 'kalender';

const pad = (n: number) => String(n).padStart(2, '0');
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
    // All-day events end at midnight of the following day.
    const en = new Date(new Date(e.endDate).getTime() - (e.allDay ? 1 : 0));
    const multi = day(en) !== day(s);
    const work = !!cal?.work;
    return {
      id: `dev-${e.id}-${day(s)}`,
      title: work ? tx('Arbeit', 'Work') : e.title || tx('Termin', 'Event'),
      icon: work ? 'kalender' : iconFor(e.title ?? ''),
      date: day(s),
      endDate: multi ? day(en) : undefined,
      start: e.allDay ? '00:00' : hm(s),
      end: e.allDay || multi ? undefined : hm(en),
      allDay: e.allDay,
      place: work ? undefined : e.location || undefined,
      who,
      work,
      source: tx(`Aus ${cal?.account ?? 'dem Gerätekalender'} · ${cal?.title ?? ''}`, `From ${cal?.account ?? 'the device calendar'} · ${cal?.title ?? ''}`).trim(),
    };
  });
}

/**
 * Umzug (Julian 27.10.: "einfache Migration von bestehenden Kalendern"). In
 * the real app the family's own Termine are copied into FamCal, so both
 * parents see them and FamCal becomes the calendar they talk to. Work stays a
 * private block on this phone. The ids are stable, so moving twice copies
 * nothing twice.
 */
export function moveIn(events: CalEvent[]): { copy: CalEvent[]; keep: CalEvent[] } {
  const copy = events.filter((e) => !e.work).map((e) => ({ ...e, id: e.id.replace(/^dev-/, 'imp-'), work: undefined }));
  return { copy, keep: events.filter((e) => e.work) };
}
