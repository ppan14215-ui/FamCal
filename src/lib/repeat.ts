/**
 * Serien (Julian 28.10., Lücke zu TimeTree): "Jeden Dienstag", "Alle 2 Wochen"
 * or "Jährlich" become real dates in every view. The repeat text stays as the
 * person or Claude wrote it; this file only reads a rule out of it. A series
 * can end (repeatUntil) and skip single days (skipDates, "nur dieser Termin").
 *
 * Each date is a copy of the series with its own id `<series>~<date>`, so a
 * tap opens that day. Work blocks are never expanded: spoken working hours
 * are already stored day by day.
 */
import type { CalEvent } from '../state/types';
import { addDays, daysBetween, weekday, dayNum, monthIdx, year, TODAY } from './dates';
import { tx } from '../i18n/lang';

export type Rule = { freq: 'day' | 'week' | 'month' | 'year'; every: number; days?: number[] };

const WD: Record<string, number> = {
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const WORD_N: Record<string, number> = { zwei: 2, drei: 3, vier: 4, two: 2, three: 3, four: 4, other: 2 };

/** Reads a rule from the repeat text; unknown text means no series. */
export function ruleOf(text?: string | null): Rule | null {
  if (!text) return null;
  const t = ` ${text.toLowerCase().replace(/[.,]/g, ' ')} `;
  const n = Number(t.match(/(?:alle|every)\s+(\d+)/)?.[1]) || WORD_N[t.match(/(?:alle|every)\s+(zwei|drei|vier|two|three|four|other)\b/)?.[1] ?? ''] || 1;
  if (/(montag bis freitag|mo(ntag)?\s*-\s*fr|werktags|wochentags|weekdays|mondays? to fridays?|monday to friday)/.test(t)) return { freq: 'week', every: 1, days: [1, 2, 3, 4, 5] };
  const days = Object.keys(WD).filter((d) => new RegExp(`\\b${d}s?\\b`).test(t)).map((d) => WD[d]);
  if (/(täglich|jeden tag|daily|every day|tage\b|days\b)/.test(t)) return { freq: 'day', every: n };
  if (/(jährlich|jedes jahr|year|jahr)/.test(t)) return { freq: 'year', every: n };
  if (/(monatlich|jeden monat|month|monat)/.test(t)) return { freq: 'month', every: n };
  if (days.length || /(wöchentlich|jede woche|week|woche)/.test(t)) return { freq: 'week', every: n, days: days.length ? [...new Set(days)].sort() : undefined };
  return null;
}

/** True when the series has a date on this day (ignoring end and skipped days). */
function hits(r: Rule, start: string, d: string): boolean {
  const gap = daysBetween(start, d);
  if (gap < 0) return false;
  switch (r.freq) {
    case 'day': return gap % r.every === 0;
    case 'week': {
      const days = r.days ?? [weekday(start)];
      if (!days.includes(weekday(d))) return false;
      // Count whole weeks from the Monday of the first week.
      const wk = Math.floor((gap + ((weekday(start) + 6) % 7)) / 7);
      return wk % r.every === 0;
    }
    case 'month': {
      const months = (year(d) - year(start)) * 12 + monthIdx(d) - monthIdx(start);
      return dayNum(d) === dayNum(start) && months % r.every === 0;
    }
    case 'year': return dayNum(d) === dayNum(start) && monthIdx(d) === monthIdx(start) && (year(d) - year(start)) % r.every === 0;
  }
}

export const seriesId = (id: string) => id.split('~')[0];
export const isInstance = (id: string) => id.includes('~');

/**
 * All events with every series spelled out between `from` and `to`. The first
 * date keeps the series id, so existing links and the landing animation still
 * find it.
 */
export function expand(events: CalEvent[], from: string, to: string): CalEvent[] {
  const out: CalEvent[] = [];
  for (const e of events) {
    const r = !e.work ? ruleOf(e.repeat) : null;
    if (!r) { out.push(e); continue; }
    if (!(e.skipDates ?? []).includes(e.date)) out.push(e);
    const len = e.endDate ? daysBetween(e.date, e.endDate) : 0;
    const last = e.repeatUntil && e.repeatUntil < to ? e.repeatUntil : to;
    const skip = new Set(e.skipDates ?? []);
    // Daily series are walked day by day; the rest too, capped so one bad rule cannot freeze a view.
    let d = addDays(e.date > from ? e.date : from, 0);
    if (d === e.date) d = addDays(d, 1);
    for (let i = 0; d <= last && i < 1200; i++, d = addDays(d, 1)) {
      if (!hits(r, e.date, d) || skip.has(d)) continue;
      out.push({ ...e, id: `${e.id}~${d}`, date: d, endDate: len ? addDays(d, len) : undefined });
    }
  }
  return out;
}

/** Default window for the views: a year back, two years ahead. */
export const WINDOW = { from: addDays(TODAY, -370), to: addDays(TODAY, 740) };

/** Short line for a series: "Jeden Dienstag · bis 31. März". */
export function seriesLine(e: Pick<CalEvent, 'repeat' | 'repeatUntil'>, untilText: (d: string) => string): string {
  if (!e.repeat) return tx('Nie', 'Never');
  return e.repeatUntil ? `${e.repeat} · ${tx('bis', 'until')} ${untilText(e.repeatUntil)}` : e.repeat;
}
