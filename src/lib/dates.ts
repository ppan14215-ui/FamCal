/**
 * German date helpers. The prototype runs on a fixed "today" so the sample
 * data always lines up: Donnerstag, 29. Oktober 2026 (the canvas mixed Do 29.
 * and Do 30.; 29.10.2026 is the real Thursday).
 */
import { LIVE } from './live';
import { EN, isEn } from '../i18n/lang';

const pad2 = (n: number) => String(n).padStart(2, '0');
const local = new Date();
/** The real app runs on the phone's clock, the test link on the fixed day of the sample family. */
export const TODAY = LIVE ? `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}` : '2026-10-29';
export const BEN_BORN = '2026-09-14';

const WD_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WD_SHORT = EN ? WD_SHORT_EN : WD_SHORT_DE;
const WD_LONG_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_LONG_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const WD_LONG = EN ? WD_LONG_EN : WD_LONG_DE;
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONTHS = EN ? MONTHS_EN : MONTHS_DE;
const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SHORT_DE = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONTHS_SHORT = EN ? MONTHS_SHORT_EN : MONTHS_SHORT_DE;

// What the app says back follows the spoken language (inLang), so these read it at call time.
const wds = () => (isEn() ? WD_SHORT_EN : WD_SHORT_DE);
const wdl = () => (isEn() ? WD_LONG_EN : WD_LONG_DE);
const mon = () => (isEn() ? MONTHS_EN : MONTHS_DE);
const mons = () => (isEn() ? MONTHS_SHORT_EN : MONTHS_SHORT_DE);

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
  return isEn() ? `${wds()[weekday(isoDate)]} ${mons()[monthIdx(isoDate)]} ${dayNum(isoDate)}` : `${wds()[weekday(isoDate)]} ${dayNum(isoDate)}. ${mons()[monthIdx(isoDate)]}`;
}
/** "Donnerstag, 29. Oktober" */
export function long(isoDate: string): string {
  return isEn() ? `${wdl()[weekday(isoDate)]}, ${mon()[monthIdx(isoDate)]} ${dayNum(isoDate)}` : `${wdl()[weekday(isoDate)]}, ${dayNum(isoDate)}. ${mon()[monthIdx(isoDate)]}`;
}
/** "29. Oktober" */
export function dayMonth(isoDate: string): string {
  return isEn() ? `${mon()[monthIdx(isoDate)]} ${dayNum(isoDate)}` : `${dayNum(isoDate)}. ${mon()[monthIdx(isoDate)]}`;
}

/** "29. Okt" / "Oct 29" */
export function dmShort(isoDate: string): string {
  return isEn() ? `${mons()[monthIdx(isoDate)]} ${dayNum(isoDate)}` : `${dayNum(isoDate)}. ${mons()[monthIdx(isoDate)]}`;
}
/** "Do 29." / "Thu 29" */
export function wdDay(isoDate: string, long = false): string {
  return `${(long ? wdl() : wds())[weekday(isoDate)]} ${dayNum(isoDate)}${isEn() ? '' : '.'}`;
}

/** "noch 6 Wochen", "in 8 Tagen", "heute", "morgen" relative to TODAY. */
export function until(isoDate: string): string {
  const d = daysBetween(TODAY, isoDate);
  if (d < 0) return isEn() ? 'past' : 'vorbei';
  if (d === 0) return isEn() ? 'today' : 'heute';
  if (d === 1) return isEn() ? 'tomorrow' : 'morgen';
  if (d < 14) return isEn() ? `in ${d} days` : `in ${d} Tagen`;
  return isEn() ? `${Math.floor(d / 7)} weeks to go` : `noch ${Math.floor(d / 7)} Wochen`;
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

const NUM_EN = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const NUM_DE = ['keine', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
/** "Drei Termine", "eine Aufgabe" */
export function count(n: number, one: string, many: string, cap = false): string {
  const w = n <= 10 ? (isEn() ? NUM_EN : NUM_DE)[n] : String(n);
  const s = `${w} ${n === 1 ? one : many}`;
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}

/** "09:30" → "9:30"; on English phones "15:00" → "3pm", "09:30" → "9:30am". */
export const hm = (t: string) => {
  if (!isEn()) return t.replace(/^0/, '');
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
};

/** "In 40 Min · 9:30" relative to NOW on TODAY. */
export function soon(date: string, start: string): string {
  if (date !== TODAY) return `${short(date)} · ${hm(start)}`;
  const d = minutes(start) - minutes(NOW);
  if (d <= 0) return `${isEn() ? 'Now' : 'Jetzt'} · ${hm(start)}`;
  if (d < 60) return `${isEn() ? `In ${d} min` : `In ${d} Min`} · ${hm(start)}`;
  return `${isEn() ? `In ${Math.round(d / 60)} h` : `In ${Math.round(d / 60)} Std`} · ${hm(start)}`;
}

/** ISO calendar week ("KW 44"): the week with the year's first Thursday is week 1. */
export function isoWeek(isoDate: string): number {
  const thu = addDays(monday(isoDate), 3);
  const jan1 = `${thu.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(jan1, thu) / 7) + 1;
}
