/**
 * Small per-device preferences. On the web link they live in localStorage.
 * On the phone they are kept in AsyncStorage (Julian 04.11.: nav, theme and colour choices were lost on every restart).
 * AsyncStorage is async: values read at start come from memory, and onPrefsReady tells the readers once the saved ones are in.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mem: Record<string, string> = {};
const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };
const NATIVE = Platform.OS !== 'web';
const PRE = 'famcal.pref.';

let ready = !NATIVE;
const waiting: (() => void)[] = [];
/** Runs once the saved values are loaded (at once on the web). */
export function onPrefsReady(cb: () => void) { if (ready) cb(); else waiting.push(cb); }

if (NATIVE) {
  AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiGet(keys.filter((k) => k.startsWith(PRE))))
    .then((rows) => { for (const [k, v] of rows) { const key = k.slice(PRE.length); if (v != null && !(key in mem)) mem[key] = v; } })
    .catch(() => {})
    .finally(() => { ready = true; waiting.splice(0).forEach((f) => { try { f(); } catch {} }); });
}

export function getPref(k: string): string | undefined {
  try { return ls()?.getItem(`famcal.${k}`) ?? mem[k]; } catch { return mem[k]; }
}
export function setPref(k: string, v: string) {
  mem[k] = v;
  try { ls()?.setItem(`famcal.${k}`, v); } catch {}
  if (NATIVE) AsyncStorage.setItem(PRE + k, v).catch(() => {});
}
