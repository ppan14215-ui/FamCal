/**
 * Julian 31.10. 15:40: the main navigation can be pushed away like in keep2read. Folded, it is only a small
 * handle on the right edge and the talk field drops into its place. Kept per device.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'famcal.navFold';
let folded = false;
/** Where the handle sits, as a share of the screen height (keep2read: 25 to 68 %, so it never meets the gesture bar). */
let handleY = 0.45;
const subs = new Set<() => void>();
const emit = () => {
  subs.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify({ folded, handleY })).catch(() => {});
};

AsyncStorage.getItem(KEY).then((v) => {
  if (!v) return;
  try {
    const j = JSON.parse(v);
    folded = !!j.folded;
    if (typeof j.handleY === 'number') handleY = clampY(j.handleY);
    subs.forEach((l) => l());
  } catch {}
}).catch(() => {});

export const clampY = (y: number) => Math.min(0.68, Math.max(0.25, y));
export function setNavFolded(v: boolean) { if (folded === v) return; folded = v; emit(); }
export function setHandleY(y: number) { handleY = clampY(y); emit(); }
export const getHandleY = () => handleY;
const sub = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };
export const useNavFolded = () => useSyncExternalStore(sub, () => folded, () => folded);
