/**
 * What a connected calendar brings in. In the prototype the sign-in is
 * simulated: after the account, the calendars it finds are listed and the
 * family picks which ones show. The events below stand in for that account.
 * Work calendars only ever show as a striped block (HANDOFF).
 */
import { TODAY, addDays, weekday } from '../lib/dates';
import type { CalEvent } from '../state/types';
import type { PersonId } from '../theme';

export type Provider = 'icloud' | 'google' | 'outlook';
export type FoundCal = { id: string; name: string; sub: string; work?: boolean; on: boolean };

export const PROVIDERS: { key: Provider; title: string; icon: 'kalender' | 'sync' | 'telefon'; hint: string }[] = [
  { key: 'icloud', title: 'iCloud-Kalender', icon: 'kalender', hint: 'name@icloud.com' },
  { key: 'google', title: 'Google Kalender', icon: 'sync', hint: 'name@gmail.com' },
  { key: 'outlook', title: 'Outlook', icon: 'telefon', hint: 'name@firma.de' },
];

export function found(p: Provider): FoundCal[] {
  if (p === 'outlook') return [{ id: 'arbeit', name: 'Kalender', sub: 'Arbeit, nur als Block', work: true, on: true }];
  return [
    { id: 'privat', name: p === 'google' ? 'Privat' : 'Zuhause', sub: 'deine Termine', on: true },
    { id: 'arbeit', name: 'Arbeit', sub: 'nur als gestreifter Block', work: true, on: true },
    { id: 'feiertage', name: 'Feiertage in Deutschland', sub: 'nach Bundesland', on: true },
    { id: 'geburtstage', name: 'Geburtstage', sub: 'aus den Kontakten', on: false },
  ];
}

// Public holidays in the next months; Allerheiligen only where it is one.
const ALLERHEILIGEN = ['Baden-Württemberg', 'Bayern', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland'];
const holidays = (land?: string): [string, string][] => [
  ...(!land || ALLERHEILIGEN.includes(land) ? [['2026-11-01', 'Allerheiligen'] as [string, string]] : []),
  ...(land === 'Sachsen' ? [['2026-11-18', 'Buß- und Bettag'] as [string, string]] : []),
  ['2026-12-25', '1. Weihnachtstag'], ['2026-12-26', '2. Weihnachtstag'], ['2027-01-01', 'Neujahr'],
  ...(['Baden-Württemberg', 'Bayern', 'Sachsen-Anhalt'].includes(land ?? '') ? [['2027-01-06', 'Heilige Drei Könige'] as [string, string]] : []),
];

/** Events of the chosen calendars, owned by the person who connected them. */
export function importEvents(p: Provider, ids: string[], who: PersonId, land?: string): CalEvent[] {
  const out: CalEvent[] = [];
  const id = (k: string) => `${p}-${k}`;
  if (ids.includes('arbeit')) {
    // Two weeks of work from this Monday, Mo to Fr.
    const mon = addDays(TODAY, -((weekday(TODAY) + 6) % 7));
    for (let i = 0; i < 12; i++) {
      const d = addDays(mon, i);
      const wd = weekday(d);
      if (wd === 0 || wd === 6) continue;
      out.push({ id: id(`w${i}`), title: 'Arbeit', icon: 'kalender', date: d, start: wd === 5 ? '08:30' : '09:00', end: wd === 5 ? '13:00' : '16:30', who, work: true });
    }
  }
  if (ids.includes('privat')) {
    out.push(
      { id: id('p1'), title: 'Zahnarzt', sub: 'Kontrolle', icon: 'zahnarzt', date: addDays(TODAY, 6), start: '08:00', end: '08:30', who },
      { id: id('p2'), title: 'Abendessen bei Freunden', icon: 'kochtopf', date: addDays(TODAY, 2), start: '19:00', who: 'both' },
    );
  }
  if (ids.includes('feiertage')) {
    holidays(land).forEach(([d, t], i) => out.push({ id: id(`h${i}`), title: t, sub: 'Feiertag', icon: 'kalender', date: d, start: '00:00', allDay: true, who: null }));
  }
  return out;
}
