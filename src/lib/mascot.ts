/**
 * Maskottchen oder Minimal (Julian 11.11.: "a minimalistic version that I can toggle on and off via the settings,
 * which just gives me the record and stop button, just like we had it before, with the same pop-up window").
 *   pin      Pin, the clay magnet, is the talk button, sits above the field and reads along; the speak card shows the words live
 *   minimal  no mascot anywhere: a plain mic, and the speak card shows waves with stop and send
 * Kept per device.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';

export type Mascot = 'pin' | 'minimal';
// A new key with the klar look (Julian 14.11.: "Memo is missing"): every phone starts with Memo again, since the look is
// built around him. A "Minimal" chosen before does not carry over; choosing it again in the settings still works.
const KEY = 'mascot2';
let mode: Mascot = getPref(KEY) === 'minimal' ? 'minimal' : 'pin';
const subs = new Set<() => void>();
// The saved choice arrives a moment after start.
onPrefsReady(() => { const v: Mascot = getPref(KEY) === 'minimal' ? 'minimal' : 'pin'; if (v !== mode) { mode = v; subs.forEach((l) => l()); } });

export function setMascot(v: Mascot) { mode = v; setPref(KEY, v); subs.forEach((l) => l()); }
// The onboarding always shows Memo, whatever is saved (it teaches that tapping him starts speaking; with the plain mic
// he had no seat to fly to and vanished, Julian's phone 14.11.). Nothing is saved; null gives the saved choice back.
let forced: Mascot | null = null;
export function forceMascot(v: Mascot | null) { if (forced !== v) { forced = v; subs.forEach((l) => l()); } }
export const mascot = () => forced ?? mode;
export const useMascot = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, mascot, mascot);
