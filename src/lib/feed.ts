/**
 * Der Familienchat (Julian 29.10.): everything said, typed or photographed
 * becomes a card, and the chat is the log of it. Each entry only points at
 * what it made (Termine, items, tasks), so the cards stay live: ticked in the
 * list is ticked in the chat. Plain messages are the optional extra.
 * For now the log lives on this phone; the shared table comes next.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../state/store';
import { getFamily, myRole } from './sync';
import type { PersonId } from '../theme';

export type FeedEntry = {
  id: string;
  /** ISO time. */
  at: string;
  by: PersonId;
  /** What was said or typed, word for word. */
  said: string;
  kind: 'made' | 'msg';
  events?: string[];
  tasks?: string[];
  items?: { list: string; ids: string[] };
  /** The receipt line, e.g. "Mehl und Milch stehen auf Einkauf." */
  text?: string;
  undone?: boolean;
};

const KEY = 'famcal.feed';
let feed: FeedEntry[] = [];
/** Undo stays on this phone and only for this run of the app. */
const undos = new Map<string, () => void>();
const subs = new Set<() => void>();
const emit = () => { subs.forEach((l) => l()); AsyncStorage.setItem(KEY, JSON.stringify(feed.slice(-300))).catch(() => {}); };

AsyncStorage.getItem(KEY).then((v) => {
  if (!v) return;
  try { const old: FeedEntry[] = JSON.parse(v); feed = [...old.filter((o) => !feed.some((f) => f.id === o.id)), ...feed]; subs.forEach((l) => l()); } catch {}
}).catch(() => {});

export const useFeed = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => feed, () => feed);
const me = (): PersonId => (getFamily() ? myRole() : 'J');
const newId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function addMessage(said: string) {
  feed = [...feed, { id: newId(), at: new Date().toISOString(), by: me(), said, kind: 'msg' }];
  emit();
}

/** Sorts what a sentence changed into Termine, tasks and list items. */
export function addMade(said: string, ids: string[], text?: string, undo?: () => void, events?: string[]) {
  const s = get();
  const ev = new Set(events ?? []);
  const tasks: string[] = [];
  let items: FeedEntry['items'];
  for (const id of ids) {
    if (s.events.some((e) => e.id === id)) ev.add(id);
    else if (s.tasks.some((t) => t.id === id)) tasks.push(id);
    else {
      const l = s.lists.find((x) => x.sections.some((sec) => sec.items.some((i) => i.id === id)));
      if (l && (!items || items.list === l.id)) items = { list: l.id, ids: [...(items?.ids ?? []), id] };
    }
  }
  if (!ev.size && !tasks.length && !items) return;
  const id = newId();
  if (undo) undos.set(id, undo);
  feed = [...feed, { id, at: new Date().toISOString(), by: me(), said, kind: 'made', events: ev.size ? [...ev] : undefined, tasks: tasks.length ? tasks : undefined, items, text }];
  emit();
}

export const canUndo = (id: string) => undos.has(id);
export function undoEntry(id: string) {
  undos.get(id)?.();
  undos.delete(id);
  feed = feed.map((f) => (f.id === id ? { ...f, undone: true } : f));
  emit();
}
