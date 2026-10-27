/**
 * German date helpers. The prototype runs on a fixed "today" so the sample
 * data always lines up: Donnerstag, 29. Oktober 2026 (the canvas mixed Do 29.
 * and Do 30.; 29.10.2026 is the real Thursday).
 */
import { LIVE } from './live';

const pad2 = (n: number) => String(n).padStart(2, '0');
const local = new Date();
/** The real app runs on the phone's clock, the test link on the fixed day of the sample family. */
export const TODAY = LIVE ? `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}` : '2026-10-29';
export const BEN_BORN = '2026-09-14';

export const WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}
export function weekday(isoDate: string): number {
  return parse(isoDate).getUTCDay();
}
/** Monday of the week containing the date. */
export function monday(isoDate: string): string {
  const wd = weekday(isoDate);
  return addDays(isoDate, wd === 0 ? -6 : 1 - wd);
}
export function dayNum(isoDate: string): number {
  return parse(isoDate).getUTCDate();
}
export function monthIdx(isoDate: string): number {
  return parse(isoDate).getUTCMonth();
}
export function year(isoDate: string): number {
  return parse(isoDate).getUTCFullYear();
}

/** "Do 29. Okt" */
export function short(isoDate: string): string {
  return `${WD_SHORT[weekday(isoDate)]} ${dayNum(isoDate)}. ${MONTHS_SHORT[monthIdx(isoDate)]}`;
}
/** "Donnerstag, 29. Oktober" */
export function long(isoDate: string): string {
  return `${WD_LONG[weekday(isoDate)]}, ${dayNum(isoDate)}. ${MONTHS[monthIdx(isoDate)]}`;
}
/** "29. Oktober" */
export function dayMonth(isoDate: string): string {
  return `${dayNum(isoDate)}. ${MONTHS[monthIdx(isoDate)]}`;
}

/** "noch 6 Wochen", "in 8 Tagen", "heute", "morgen" relative to TODAY. */
export function until(isoDate: string): string {
  const d = daysBetween(TODAY, isoDate);
  if (d < 0) return 'vorbei';
  if (d === 0) return 'heute';
  if (d === 1) return 'morgen';
  if (d < 14) return `in ${d} Tagen`;
  return `noch ${Math.floor(d / 7)} Wochen`;
}

/** Ben's age in completed weeks on a given day. */
export function weeksOld(on: string = TODAY): number {
  return Math.floor(daysBetween(BEN_BORN, on) / 7);
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Fixed clock for the prototype: 8:50, forty minutes before the U6. The real app reads the phone's clock at start. */
export const NOW = LIVE ? `${pad2(local.getHours())}:${pad2(local.getMinutes())}` : '08:50';

const NUM = ['keine', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
/** "Drei Termine", "eine Aufgabe" */
export function count(n: number, one: string, many: string, cap = false): string {
  const w = n <= 10 ? NUM[n] : String(n);
  const s = `${w} ${n === 1 ? one : many}`;
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}

/** "09:30" → "9:30" */
export const hm = (t: string) => t.replace(/^0/, '');

/** "In 40 Min · 9:30" relative to NOW on TODAY. */
export function soon(date: string, start: string): string {
  if (date !== TODAY) return `${short(date)} · ${hm(start)}`;
  const d = minutes(start) - minutes(NOW);
  if (d <= 0) return `Jetzt · ${hm(start)}`;
  if (d < 60) return `In ${d} Min · ${hm(start)}`;
  return `In ${Math.round(d / 60)} Std · ${hm(start)}`;
}
