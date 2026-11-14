/**
 * Mikro Anzeige (Julian 28.10., "beide einbauen, ich entscheide live"): bars
 * inside the black button or a ring that breathes around it. Kept per device.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref } from './prefs';

export type MicStyle = 'balken' | 'ring';
let style: MicStyle = getPref('micStyle') === 'ring' ? 'ring' : 'balken';
const subs = new Set<() => void>();

export function setMicStyle(v: MicStyle) { style = v; setPref('micStyle', v); subs.forEach((l) => l()); }
export const useMicStyle = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => style, () => style);
