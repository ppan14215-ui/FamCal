/**
 * Which bottom navigation the app uses.
 * 'strip': small icons with names under the talk card, like the tab bar in iOS (Julian 04.11.: "2 is the best option").
 * 'bar':   one bar: the tabs as a small icon pill on the left, the field on the right; typing slides the field over the tabs (Julian 04.11.: "ein Balken ausprobieren").
 * 'pill':  the dark, swipeable pill from 30.10. (keep2read fold); kept so it can come back ("save the code tho").
 * Chosen per device in the settings; switching redraws the app at once, no restart (Julian 04.11.: the button did nothing).
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';
import { bumpGen } from '../theme/mode';

export type NavStyle = 'strip' | 'bar' | 'pill';
const read = (): NavStyle => { const v = getPref('nav'); return v === 'bar' || v === 'pill' ? v : 'strip'; };
let style: NavStyle = read();
export const navStyle = () => style;
onPrefsReady(() => { const v = read(); if (v !== style) { style = v; bumpGen(); } });

export function setNavStyle(v: NavStyle) {
  style = v;
  setPref('nav', v);
  bumpGen();
}

/**
 * One bar (Julian 05.11. 08:10, "like the Dynamic Island"): one shape with three states.
 * 'rest':  one dark circle with the current tab's icon, the one-line input beside it.
 * 'tabs':  the circle grows into the dark bar with all tabs and labels; the input shrinks to a mic.
 * 'input': the circle shrinks away and the input takes the whole width, growing into the card.
 */
export type BarMode = 'rest' | 'tabs' | 'input';
let mode: BarMode = 'rest';
const subs = new Set<() => void>();
export function setBarMode(v: BarMode) { if (mode !== v) { mode = v; subs.forEach((l) => l()); } }
export const useBarMode = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => mode, () => mode);
/** Both halves move on the same spring, so their widths always add up and the gap between them never jumps. */
export const BAR_SPRING = { damping: 24, stiffness: 260, mass: 1 };
