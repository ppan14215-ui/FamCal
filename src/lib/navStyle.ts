/**
 * Which bottom navigation the app uses.
 * 'strip': small icons with names under the talk card, like the tab bar in iOS (Julian 04.11.: "2 is the best option").
 * 'bar':   one bar: the tabs as a small icon pill on the left, the field on the right; typing slides the field over the tabs (Julian 04.11.: "ein Balken ausprobieren").
 * 'pill':  the dark, swipeable pill from 30.10. (keep2read fold); kept so it can come back ("save the code tho").
 * Chosen per device in the settings; switching redraws the app at once, no restart (Julian 04.11.: the button did nothing).
 */
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
