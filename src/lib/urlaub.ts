/**
 * Urlaubstage (Julian 29.10.: "Der Assistent sollte auch mit Urlaubstagen rechnen",
 * "Pro Person unterschiedlich"). Each parent has a budget per year; every Urlaub
 * Termin uses one day per workday it covers. Weekends and public holidays cost nothing.
 */
import type { CalEvent } from '../state/types';
import type { PersonId } from '../theme/tokens';
import { addDays } from './dates';
import { isWorkday } from './feiertage';
import { tx } from '../i18n/lang';

const VACATION = /urlaub|vacation|urlaubstag|day off|freier tag|frei genommen/i;

export const isVacation = (e: CalEvent) => !e.work && e.cal !== 'feiertage' && VACATION.test(`${e.title} ${e.sub ?? ''}`);

/** Workdays one Urlaub costs inside one year. */
export function costOf(e: CalEvent, year: number, land = ''): number {
  let n = 0;
  for (let d = e.date, i = 0; d <= (e.endDate ?? e.date) && i < 400; d = addDays(d, 1), i++) {
    if (Number(d.slice(0, 4)) === year && isWorkday(d, land) && !e.skipDates?.includes(d)) n++;
  }
  return n;
}

export function usedDays(events: CalEvent[], p: PersonId, year: number, land = ''): number {
  return events.filter((e) => isVacation(e) && (e.who === p || e.who === 'both')).reduce((n, e) => n + costOf(e, year, land), 0);
}

/** "Noch 22 von 30 Urlaubstagen" for the receipt; empty without a budget. */
export function leftLine(events: CalEvent[], p: PersonId, budget: number | undefined, year: number, land = '', name = ''): string {
  if (!budget) return '';
  const left = budget - usedDays(events, p, year, land);
  const who = name ? `${name}: ` : '';
  if (left < 0) return tx(`${who}${-left} Urlaubstage über dem Budget von ${budget}.`, `${who}${-left} vacation days over the budget of ${budget}.`);
  return tx(`${who}Noch ${left} von ${budget} Urlaubstagen ${year}.`, `${who}${left} of ${budget} vacation days left in ${year}.`);
}
