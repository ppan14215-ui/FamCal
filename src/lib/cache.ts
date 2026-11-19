/**
 * The family's Termine and lists also live on the phone (Audit 09.11.). Before, they existed only in
 * memory: without network the calendar opened empty (or not at all), and a change that had not reached
 * the server yet was gone once Android closed the app. The cache holds what the screens show plus what
 * the server last confirmed, so the next sync can tell "changed here" from "deleted elsewhere".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'famcal.cache.v1';

export type Cache = {
  uid: string;
  family: unknown;
  me: 'J' | 'T';
  names: { J: string; T: string };
  events?: unknown[];
  known?: [string, string][];
  lists?: unknown[];
  tasks?: unknown[];
  docsKnown?: [string, string][];
};

let current: Cache | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export async function readCache(uid: string): Promise<Cache | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) return null;
    const c = JSON.parse(v) as Cache;
    if (c.uid !== uid) return null;
    current = c;
    return c;
  } catch {
    return null;
  }
}

/** Merges a part in and writes once the phone is quiet for a second. */
export function writeCache(part: Partial<Cache>) {
  if (!current && !part.uid) return;
  current = { ...(current as Cache), ...part };
  clearTimeout(timer);
  timer = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {}); }, 1000);
}

export async function clearCache() {
  clearTimeout(timer);
  current = null;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
