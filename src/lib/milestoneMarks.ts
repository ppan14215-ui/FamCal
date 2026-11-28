/**
 * Who takes a step of the first year and whether it is done (Erstes Jahr, Julian 28.11.). The steps themselves
 * are built from the birth date every time; only these two answers are the family's own, so they are kept here:
 * on the phone, so a restart does not lose them, and as one object for the server, so both parents see the same.
 * Each answer carries the moment it was given, and the newer one wins, per step and per answer. Kept apart from
 * the sync so the store can use it directly (the same split as phoneDropped).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Milestone, Who } from '../state/types';

export type Mark = { who?: Who; whoAt?: number; done?: boolean; doneAt?: number };
export type Marks = Record<string, Mark>;

const KEY = 'famcal.milestones';
const MAX = 400;
let marks: Marks = {};
const unsent = new Set<string>();
let changed: (() => void) | null = null;
let wake: (() => void) | null = null;
let queue: Promise<void> = Promise.resolve();

/** The store asks to be told when answers arrive (from the phone's memory or the other parent). */
export const onMarksChanged = (fn: () => void) => { changed = fn; };
/** The sync asks to be told when an answer was given here. */
export const onMarked = (fn: () => void) => { wake = fn; };

/** One child's steps are told apart from another's by the date they were built from. */
export const markKey = (kid: { born?: string; due?: string } | null, id: string) => `${kid?.born ?? kid?.due ?? ''}|${id}`;

const okWho = (w: unknown): w is Who => w === null || (typeof w === 'string' && w.length > 0 && w.length <= 40);
const okAt = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Whatever the server or the phone holds, only well formed answers are taken. */
export function cleanMarks(raw: unknown): Marks {
  const out: Marks = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, MAX)) {
    if (!k || k.length > 80 || !v || typeof v !== 'object') continue;
    const m = v as Record<string, unknown>;
    const one: Mark = {};
    if (okAt(m.whoAt) && okWho(m.who)) { one.who = m.who; one.whoAt = m.whoAt; }
    if (okAt(m.doneAt) && typeof m.done === 'boolean') { one.done = m.done; one.doneAt = m.doneAt; }
    if (one.whoAt || one.doneAt) out[k] = one;
  }
  return out;
}

/** Two sets of answers become one: per step and per answer the newer one holds. */
export function mergeMarks(a: Marks, b: Marks): Marks {
  const out: Marks = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? {}, y = b[k] ?? {};
    const one: Mark = {};
    const w = (y.whoAt ?? 0) > (x.whoAt ?? 0) ? y : x;
    if (w.whoAt) { one.who = w.who ?? null; one.whoAt = w.whoAt; }
    const d = (y.doneAt ?? 0) > (x.doneAt ?? 0) ? y : x;
    if (d.doneAt) { one.done = !!d.done; one.doneAt = d.doneAt; }
    if (one.whoAt || one.doneAt) out[k] = one;
  }
  return out;
}

export const sameMarks = (a: Marks, b: Marks) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => {
    const x = a[k], y = b[k];
    return !!y && x.who === y.who && x.whoAt === y.whoAt && x.done === y.done && x.doneAt === y.doneAt;
  });
};

const keep = () => {
  const snap = JSON.stringify({ marks, unsent: [...unsent] });
  queue = queue.then(() => AsyncStorage.setItem(KEY, snap)).catch(() => {});
  return queue;
};

/** What the phone kept comes back once; answers given before it arrived are newer and stay. */
export const marksReady: Promise<void> = AsyncStorage.getItem(KEY).then((raw) => {
  if (!raw) return;
  const kept = JSON.parse(raw) as { marks?: unknown; unsent?: unknown };
  marks = mergeMarks(cleanMarks(kept.marks), marks);
  if (Array.isArray(kept.unsent)) kept.unsent.forEach((k) => { if (typeof k === 'string' && marks[k]) unsent.add(k); });
  changed?.();
}).catch(() => {});

/** An answer given on this phone. Held at once, written to the phone right after, and the sync is told. */
export function markMilestone(kid: { born?: string; due?: string } | null, id: string, what: { who?: Who; done?: boolean }, at = Date.now()): void {
  const k = markKey(kid, id);
  const one: Mark = { ...(marks[k] ?? {}) };
  if ('who' in what) { one.who = what.who ?? null; one.whoAt = Math.max(at, (one.whoAt ?? 0) + 1); }
  if (typeof what.done === 'boolean') { one.done = what.done; one.doneAt = Math.max(at, (one.doneAt ?? 0) + 1); }
  marks = { ...marks, [k]: one };
  unsent.add(k);
  void keep();
  wake?.();
}

/** The steps as built from the date, with the family's answers on top. Returns the same array when nothing differs. */
export function withMarks(kid: { born?: string; due?: string } | null, list: Milestone[]): Milestone[] {
  let any = false;
  const out = list.map((m) => {
    const one = marks[markKey(kid, m.id)];
    if (!one) return m;
    const who = one.whoAt ? one.who ?? null : m.who;
    const done = one.doneAt ? !!one.done : m.done;
    if (who === m.who && done === m.done) return m;
    any = true;
    return { ...m, who, done };
  });
  return any ? out : list;
}

/** What the server holds arrives: merged with what is here, and the store is told when something is new. */
export function takeMarks(server: Marks): void {
  const next = mergeMarks(marks, server);
  if (sameMarks(next, marks)) return;
  marks = next;
  void keep();
  changed?.();
}

export const allMarks = () => marks;
export const unsentMarks = () => [...unsent];
/** The server has these now; one answered again meanwhile stays waiting. */
export function marksSent(keys: string[], sent: Marks): void {
  keys.forEach((k) => { const a = marks[k], b = sent[k]; if (a && b && a.whoAt === b.whoAt && a.doneAt === b.doneAt) unsent.delete(k); });
  void keep();
}
/** Signing out: the answers belonged to the family that is left now. */
export function clearMarks(): Promise<void> {
  marks = {}; unsent.clear();
  queue = queue.then(() => AsyncStorage.removeItem(KEY)).catch(() => {});
  return queue;
}
