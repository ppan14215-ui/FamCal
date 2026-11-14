/**
 * Photos for the people circles (Julian 14.11.: "people bubbles like this but with outline of user profile. which
 * means ppl must be able to upload pictures"). One photo per person, under 'J', 'T' or the id of a family person.
 * This phone keeps its own copy of every photo, so the circles draw at once and without the network.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { getPref, setPref, onPrefsReady } from './prefs';

const KEY = 'photos';
type Photos = Record<string, string>;
let map: Photos | null = null;
const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());
const sub = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const read = (): Photos => {
  if (!map) { try { map = JSON.parse(getPref(KEY) || '{}') as Photos; } catch { map = {}; } }
  return map;
};
// On the phone the saved values arrive a moment after the start.
onPrefsReady(() => { map = null; ping(); });

export const photoOf = (key: string | undefined) => (key ? read()[key] : undefined);
export const allPhotos = read;

/** Told when a photo was chosen or removed on this phone, so it can go to the family's store (photoSync). */
let local: ((key: string) => void) | null = null;
export function onLocalPhoto(cb: (key: string) => void) { local = cb; }

/** Sets or removes a person's photo on this phone. `from` says whether the person did it here or the family's store sent it. */
export function setPhoto(key: string, uri: string | null, from: 'here' | 'server' = 'here') {
  const next = { ...read() };
  const old = next[key];
  if (uri) next[key] = uri; else delete next[key];
  map = next;
  setPref(KEY, JSON.stringify(next));
  ping();
  if (old && old !== uri) void forget(old);
  if (from === 'here') local?.(key);
}

export const usePhoto = (key: string | undefined) => useSyncExternalStore(sub, () => photoOf(key), () => photoOf(key));
/** Every photo at once, for the stack of faces. */
export const usePhotos = () => useSyncExternalStore(sub, read, read);

/** The phone's own gallery with a square cut; null when the person backs out. */
export async function pickPhoto(): Promise<string | null> {
  const P = await import('expo-image-picker');
  const r = await P.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
  const a = r.canceled ? null : r.assets?.[0];
  if (!a?.uri) return null;
  if (Platform.OS === 'web') return a.uri;
  // The picker leaves its file in the cache, which the phone may empty: the photo gets a place of its own.
  try {
    const { File, Directory, Paths } = await import('expo-file-system');
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true });
    const to = new File(dir, `${Date.now()}.jpg`);
    new File(a.uri).copy(to);
    return to.uri;
  } catch {
    return a.uri;
  }
}

/** A photo that was replaced or removed leaves the phone. */
async function forget(uri: string) {
  if (Platform.OS === 'web' || !uri.includes('/photos/')) return;
  try {
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}
