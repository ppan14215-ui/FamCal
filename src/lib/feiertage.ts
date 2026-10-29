/**
 * Gesetzliche Feiertage (Julian 29.10.: "Feiertage sind automatisch eingetragen").
 * Computed for any year and Bundesland, so nothing has to be looked up. They show
 * in the calendar, work series skip them and they never cost a vacation day.
 */
import { addDays } from './dates';

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Easter Sunday (Gauss, Gregorian calendar). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, month, day);
}

const IN = (land: string, ...lands: string[]) => !land || lands.includes(land);

/** [date, name] for one year; without a Bundesland only the nationwide ones and the most common. */
export function feiertage(year: number, land = ''): [string, string][] {
  const e = easter(year);
  const out: [string, string][] = [
    [iso(year, 1, 1), 'Neujahr'],
    [addDays(e, -2), 'Karfreitag'],
    [addDays(e, 1), 'Ostermontag'],
    [iso(year, 5, 1), 'Tag der Arbeit'],
    [addDays(e, 39), 'Christi Himmelfahrt'],
    [addDays(e, 50), 'Pfingstmontag'],
    [iso(year, 10, 3), 'Tag der Deutschen Einheit'],
    [iso(year, 12, 25), '1. Weihnachtstag'],
    [iso(year, 12, 26), '2. Weihnachtstag'],
  ];
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Sachsen-Anhalt')) out.push([iso(year, 1, 6), 'Heilige Drei Könige']);
  if (land && IN(land, 'Berlin', 'Mecklenburg-Vorpommern')) out.push([iso(year, 3, 8), 'Frauentag']);
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Hessen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland')) out.push([addDays(e, 60), 'Fronleichnam']);
  if (land && IN(land, 'Saarland')) out.push([iso(year, 8, 15), 'Mariä Himmelfahrt']);
  if (land && IN(land, 'Thüringen')) out.push([iso(year, 9, 20), 'Weltkindertag']);
  if (land && IN(land, 'Brandenburg', 'Bremen', 'Hamburg', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen')) out.push([iso(year, 10, 31), 'Reformationstag']);
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland')) out.push([iso(year, 11, 1), 'Allerheiligen']);
  if (land === 'Sachsen') {
    // Wednesday before 23 November.
    let d = iso(year, 11, 22);
    while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 3) d = addDays(d, -1);
    out.push([d, 'Buß- und Bettag']);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

const cache = new Map<string, Set<string>>();
/** Is this day a public holiday where the family lives? */
export function isFeiertag(date: string, land = '') {
  const y = Number(date.slice(0, 4));
  const k = `${y}|${land}`;
  if (!cache.has(k)) cache.set(k, new Set(feiertage(y, land).map(([d]) => d)));
  return cache.get(k)!.has(date);
}

/** Days off work: weekends and holidays. */
export const isWorkday = (date: string, land = '') => { const wd = new Date(`${date}T12:00:00Z`).getUTCDay(); return wd !== 0 && wd !== 6 && !isFeiertag(date, land); };
