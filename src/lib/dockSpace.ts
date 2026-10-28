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

/** Where the dock's top edge sits above the screen bottom, so hints can float just above it. */
let top = 0;
const topSubs = new Set<() => void>();
export function setDockTop(v: number) {
  if (Math.abs(v - top) < 2) return;
  top = v;
  topSubs.forEach((l) => l());
}
export function useDockTop() {
  return useSyncExternalStore((l) => { topSubs.add(l); return () => { topSubs.delete(l); }; }, () => top, () => top);
}
