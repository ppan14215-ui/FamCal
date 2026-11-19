/**
 * One bar at the bottom (Julian 28.10.): on the tabs you see the three tabs and
 * one black bubble. Tapping the bubble turns the bar into the talk field, which
 * listens right away; done, a tap beside it or Back brings the tabs back.
 */
import { useSyncExternalStore } from 'react';

let open = false;
/** Bumped each time the bubble opens the field, so the mic starts. */
let opens = 0;
const subs = new Set<() => void>();

export function setTalkOpen(v: boolean) {
  if (v) opens++;
  if (open === v && !v) return;
  open = v;
  subs.forEach((l) => l());
}

export const talkOpens = () => opens;
export const useTalkOpen = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => open, () => open);

/**
 * The chat tab turns it around (Julian 29.10.): the field is the default, and
 * the black button beside it lays the tabs over it. Back from the tabs, the mic listens.
 */
let tabs = false;
let back = 0;
const tabSubs = new Set<() => void>();
export function setChatTabs(v: boolean, listen = false) {
  if (!v && listen) back++;
  if (tabs === v) return;
  tabs = v;
  tabSubs.forEach((l) => l());
}
export const chatBacks = () => back;
export const useChatTabs = () => useSyncExternalStore((l) => { tabSubs.add(l); return () => { tabSubs.delete(l); }; }, () => tabs, () => tabs);
