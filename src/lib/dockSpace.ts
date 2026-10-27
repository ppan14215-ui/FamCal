/** How much of the bottom the talk dock covers, so screens can scroll past it. */
import { useSyncExternalStore } from 'react';

let space = 0;
const subs = new Set<() => void>();
export function setDockSpace(h: number) {
  if (Math.abs(h - space) < 2) return;
  space = h;
  subs.forEach((l) => l());
}
export function useDockSpace() {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => space, () => space);
}
