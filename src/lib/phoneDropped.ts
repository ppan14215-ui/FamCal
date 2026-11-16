/**
 * Termine from the phone calendar that were deleted in FamCal (Julian 16.11.:
 * "kommen sie immer wieder"). Every way of deleting goes through the store,
 * and the store marks the Termin here in the same moment, so the sync with
 * the phone calendar can never bring it back: not when the assistant deleted
 * it, and not when a sync was already reading the phone. Undo takes the mark
 * away again. Kept apart from phoneSync so the store can use it directly.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'famcal.phoneDropped';
const gone = new Set<string>();
const back = new Set<string>();
let queue: Promise<void> = Promise.resolve();
let wake: (() => void) | null = null;

/** The sync asks to be told, so the phone calendar loses the Termin soon after. */
export const onDropped = (fn: () => void) => { wake = fn; };

const read = async (): Promise<string[]> => {
  try { const v = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
};

/** Marks at once in memory, then on the phone's storage, one write after the other so delete and undo never cross. */
export function markDropped(ids: string[], undo = false): Promise<void> {
  const mine = ids.filter((id) => id.startsWith('imp-'));
  if (Platform.OS === 'web' || !mine.length) return Promise.resolve();
  for (const id of mine) { (undo ? gone : back).delete(id); (undo ? back : gone).add(id); }
  queue = queue.then(async () => {
    const now = new Set(await read());
    mine.forEach((id) => (undo ? now.delete(id) : now.add(id)));
    await AsyncStorage.setItem(KEY, JSON.stringify([...now].slice(-2000)));
  }).catch(() => {});
  wake?.();
  return queue;
}

/** What is stored plus what was marked since, read without waiting: call it right before looking at the store. */
export function withMarked(stored: Set<string>): Set<string> {
  gone.forEach((id) => stored.add(id));
  back.forEach((id) => stored.delete(id));
  return stored;
}
