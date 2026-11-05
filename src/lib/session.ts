/**
 * What this session made (Julian 04.11.: a pill above the field like the Claude app's "5/5 tasks").
 * Only Termine the assistant put in while the app is open; it starts empty on every start.
 */
import { useSyncExternalStore } from 'react';

let made: string[] = [];
const subs = new Set<() => void>();
export function noteMade(ids: string[]) {
  const add = ids.filter((id) => !made.includes(id));
  if (!add.length) return;
  made = [...made, ...add];
  subs.forEach((l) => l());
}
export const useSessionMade = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => made, () => made);

/**
 * Julian 05.11.: the pill opens this session's conversation, and each thread in it can be picked up again.
 * A session is my chat entries without a gap of a day; it ends 24 hours after the last one, so a running
 * conversation never breaks off in the middle.
 */
import type { FeedEntry } from './feed';
export const SESSION_MS = 24 * 60 * 60 * 1000;
export function sessionOf(feed: FeedEntry[], me: string, now = Date.now()): FeedEntry[] {
  const mine = feed.filter((f) => f.by === me && f.kind === 'made' && !f.answer);
  const out: FeedEntry[] = [];
  let after = now;
  for (let i = mine.length - 1; i >= 0; i--) {
    const t = new Date(mine[i].at).getTime();
    if (after - t > SESSION_MS) break;
    out.unshift(mine[i]);
    after = t;
  }
  return out;
}

/** The thread picked up from the session sheet; the next sentence continues it, then it is cleared. */
let resume: FeedEntry | null = null;
const rsubs = new Set<() => void>();
export function setResume(f: FeedEntry | null) { resume = f; rsubs.forEach((l) => l()); }
export const getResume = () => resume;
export const useResume = () => useSyncExternalStore((l) => { rsubs.add(l); return () => { rsubs.delete(l); }; }, () => resume, () => resume);
