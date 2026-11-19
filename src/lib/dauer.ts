/**
 * Standarddauer neuer Termine (Julian 19.11.: "Default should be 2hr for any appointment", said to Memo). A Termin with
 * a start and no end gets this length. 0 = none set: then the old way (the assistant's usual length, the form's hour).
 * Memo sets it with the tool `einstellung`; Einstellungen shows it too. Kept per device, like the other choices.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';
import type { CalEvent } from '../state/types';

const subs = new Set<() => void>();
const read = () => { const n = Number(getPref('terminDauer')); return Number.isFinite(n) && n >= 15 && n <= 720 ? Math.round(n) : 0; };
let cur = read();
onPrefsReady(() => { cur = read(); subs.forEach((f) => f()); });

/** Minutes, 0 when none is set. */
export const termDur = () => cur;
export function setTermDur(min: number) {
  const n = Number.isFinite(min) && min >= 15 && min <= 720 ? Math.round(min) : 0;
  cur = n; setPref('terminDauer', String(n)); subs.forEach((f) => f());
}
export const useTermDur = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => cur, () => cur);

/** HH:MM plus minutes, kept within the day. */
export function plusMin(t: string, min: number) {
  const [h, m] = t.split(':').map(Number);
  const x = Math.min(23 * 60 + 59, h * 60 + m + min);
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}
/** The end a new Termin starting at `start` gets: the set length, else `fallback` minutes. */
export const endAfter = (start: string, fallback = 60) => plusMin(start, cur || fallback);
/** A new Termin with a time and no end gets the set length; anything else stays as it is. */
export function withDefaultEnd(e: CalEvent): CalEvent {
  if (!cur || e.allDay || e.work || !e.start || e.end) return e;
  return { ...e, end: plusMin(e.start, cur) };
}
/** Readable length: "2 Std.", "90 Min." */
export const durLabel = (min: number, de: boolean) => (min % 60 === 0 ? (de ? `${min / 60} Std.` : `${min / 60} h`) : (de ? `${min} Min.` : `${min} min`));
