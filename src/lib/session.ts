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
