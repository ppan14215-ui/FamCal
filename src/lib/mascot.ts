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
let mode: Mascot = getPref('mascot') === 'minimal' ? 'minimal' : 'pin';
const subs = new Set<() => void>();
// The saved choice arrives a moment after start.
onPrefsReady(() => { const v: Mascot = getPref('mascot') === 'minimal' ? 'minimal' : 'pin'; if (v !== mode) { mode = v; subs.forEach((l) => l()); } });

export function setMascot(v: Mascot) { mode = v; setPref('mascot', v); subs.forEach((l) => l()); }
export const mascot = () => mode;
export const useMascot = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => mode, () => mode);
