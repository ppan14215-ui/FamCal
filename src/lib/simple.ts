/**
 * Einfache Version (Julian 30.10.: "Die App ist zu kompliziert", Vorschlag
 * "FamCal einfacher"). A switch in the settings, so both versions can be
 * compared. Field, tabs and plus stay as they are (Julian 30.10. evening: the
 * new tab row jumped and the plus must lead to entering by hand). Julian 18:03:
 * he prefers this version, only not its tabs, so the rest is back: the calendar
 * has three views, the chat no pills and no Eintragen/Nachricht switch, and an
 * empty chat shows example sentences. Kept per device.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPref, setPref } from './prefs';

// Julian 30.10. evening: the simple version is the default. A new key, so an old "Wie bisher" choice does not hold it back.
const KEY = 'famcal.simple2';
let on = getPref('simple2') !== '0';
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());

AsyncStorage.getItem(KEY).then((v) => { if (v != null && (v !== '0') !== on) { on = v !== '0'; emit(); } }).catch(() => {});

export function setSimple(v: boolean) {
  on = v;
  setPref('simple2', v ? '1' : '0');
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

/**
 * "Sag Sophia, ich komme später" or "Schreib Tom: Milch ist alle": a message to the
 * family, not an entry. Returns what to send, or null.
 */
export function messageOf(raw: string, names: string[]): string | null {
  const m = raw.trim().match(/^(?:sag|sage|schreib|schreibe|tell|text|message)\s+(\S+?)[,:]?\s+(.{2,})$/i);
  if (!m) return null;
  // Only to someone of the family ("Schreib Milch auf die Liste" stays an entry).
  const to = m[1].toLowerCase();
  return [...names, 'allen', 'all', 'everyone', 'familie'].some((n) => n && n.toLowerCase() === to) ? raw.trim() : null;
}
