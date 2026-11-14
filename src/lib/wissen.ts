/**
 * Familiengedächtnis (Julian 31.10. 21:10: "baue den Rest vom Familiengedächtnis"). What the family tells the
 * assistant once ("Mia hat Schuhgröße 28", "Oma Inge mag keine Lilien") stays, for both parents, and can be asked
 * later ("Welche Größe hat Mia?"). Kept as a hidden list "wissen", so it rides the shared list sync (family_docs)
 * without a new table: one row per fact, who said it and when.
 */
import { get, set } from '../state/store';
import type { Item, List } from '../state/types';
import type { PersonId } from '../theme/tokens';

export const WISSEN = 'wissen';
export type Fact = { id: string; text: string; about?: string; by: PersonId | null; at?: string };

export const isWissen = (l: { id: string }) => l.id === WISSEN;

export function facts(lists = get().lists): Fact[] {
  const l = lists.find(isWissen);
  if (!l) return [];
  return l.sections.flatMap((s) => s.items).map((i) => ({ id: i.id, text: i.name, about: i.note || undefined, by: i.who, at: i.data?.date }));
}

const blank = (): List => ({ id: WISSEN, name: 'Familiengedächtnis', icon: 'notizblock' as any, kind: 'collection', sections: [{ id: 'main', title: '', items: [] }] });

/** Adds one fact; a fact about the same person and thing ("Schuhgröße") replaces the old one. Returns undo. */
export function remember(text: string, about: string | undefined, by: PersonId | null, replaces?: string): () => void {
  const before = get().lists;
  const item: Item = { id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: text.trim().slice(0, 300), note: about?.trim().slice(0, 60) || undefined, who: by, done: false, data: { date: new Date().toISOString().slice(0, 10) } };
  set((s) => {
    const has = s.lists.some(isWissen);
    const lists = has ? s.lists : [...s.lists, blank()];
    return {
      lists: lists.map((l) => (isWissen(l) ? { ...l, sections: l.sections.map((sec, i) => (i === 0 ? { ...sec, items: [...sec.items.filter((x) => x.id !== replaces), item] } : { ...sec, items: sec.items.filter((x) => x.id !== replaces) })) } : l)),
    };
  });
  return () => set(() => ({ lists: before }));
}

/** Removes facts by id. Returns undo. */
export function forget(ids: string[]): () => void {
  const before = get().lists;
  const drop = new Set(ids);
  set((s) => ({ lists: s.lists.map((l) => (isWissen(l) ? { ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.filter((x) => !drop.has(x.id)) })) } : l)) }));
  return () => set(() => ({ lists: before }));
}
