/**
 * Einfache Version (Julian 30.10.: "Die App ist zu kompliziert", Vorschlag
 * "FamCal einfacher"). A switch in the settings, so both versions can be
 * compared. Field, tabs and plus stay as they are (Julian 30.10. evening: the
 * new tab row jumped and the plus must lead to entering by hand); the calendar
 * has three views and an empty chat shows example sentences. Kept per device.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPref, setPref } from './prefs';

const KEY = 'famcal.simple';
let on = getPref('simple') === '1';
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());

AsyncStorage.getItem(KEY).then((v) => { if (v != null && (v === '1') !== on) { on = v === '1'; emit(); } }).catch(() => {});

export function setSimple(v: boolean) {
  on = v;
  setPref('simple', v ? '1' : '0');
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
  emit();
}
export const isSimple = () => on;
export const useSimple = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => on, () => on);

/** A sentence for the field, from the plus sheet's examples: the bar picks it up and focuses. */
let prefill: { text: string; n: number } = { text: '', n: 0 };
const fillSubs = new Set<() => void>();
export function fillField(text: string) {
  prefill = { text, n: prefill.n + 1 };
  fillSubs.forEach((l) => l());
}
/** Each example lands once, in the field that is open now; a field built later must not get it again. */
let taken = 0;
export function takeFill(n: number): boolean { if (!n || n === taken) return false; taken = n; return true; }
export const usePrefill = () => useSyncExternalStore((l) => { fillSubs.add(l); return () => { fillSubs.delete(l); }; }, () => prefill, () => prefill);
