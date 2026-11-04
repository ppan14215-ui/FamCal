/**
 * Which bottom navigation the app uses.
 * 'strip': small icons with names under the talk card, like the tab bar in iOS (Julian 04.11.: "2 is the best option").
 * 'bar':   one bar: the tabs as a small icon pill on the left, the field on the right; typing widens the field (Julian 04.11.: "ein Balken ausprobieren").
 * 'pill':  the dark, swipeable pill from 30.10. (keep2read fold); kept so it can come back ("save the code tho").
 * Chosen per device in the settings while Julian compares; read once at start, switching reloads.
 */
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { getPref, setPref } from './prefs';

export type NavStyle = 'strip' | 'bar' | 'pill';
const saved = getPref('nav');
export const NAV_STYLE: NavStyle = saved === 'bar' || saved === 'pill' ? saved : 'strip';

export function setNavStyle(v: NavStyle) {
  setPref('nav', v);
  if (Platform.OS === 'web') { try { (globalThis as any).location?.reload(); } catch {} return; }
  // Native (Julian 04.11.: tapping did nothing): restart the JS right away so the new nav shows.
  setTimeout(() => { Updates.reloadAsync().catch(() => {}); }, 600);
}
