/**
 * An exact day (birth date, due date): "14.9.2022", "14.09.22",
 * "14. September 2022", "14 sep 2022". No weekdays and no times, those
 * belong to the Wann line. A day without a year means the last one that has
 * passed for birth dates and the next one for due dates.
 */
import { TODAY, MONTHS } from './dates';

const MON = MONTHS.map((m) => m.toLowerCase());
const pad = (n: number) => String(n).padStart(2, '0');

export function parseDay(input: string, opts: { past?: boolean } = {}): string | null {
  const t = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  let d: number, m: number, y: number | undefined;
  const num = t.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2}|\d{4})?$/);
  const word = t.match(/^(\d{1,2})\.? ?([a-zäöü]{3,})\.? ?(\d{2}|\d{4})?$/);
  if (num) { d = +num[1]; m = +num[2]; y = num[3] ? +num[3] : undefined; }
  else if (word) {
    const w = word[2].replace(/^(mrz|mae)/, 'mär');
    const j = MON.findIndex((x) => x.slice(0, 3) === w.slice(0, 3));
    if (j < 0) return null;
    d = +word[1]; m = j + 1; y = word[3] ? +word[3] : undefined;
  } else return null;
  if (y !== undefined && y < 100) y += y > +TODAY.slice(2, 4) + 1 ? 1900 : 2000;
  const ty = +TODAY.slice(0, 4);
  if (y === undefined) {
    y = ty;
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    if (opts.past && iso > TODAY) y -= 1;
    if (!opts.past && iso < TODAY) y += 1;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
