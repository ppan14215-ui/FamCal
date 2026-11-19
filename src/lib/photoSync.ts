/**
 * The family's photos on the server (Julian 14.11., "Ausliefern und Fotos bauen"): a private store that only the own
 * family can read and write, one file per person under <family>/<J|T|person id>.jpg. Nothing here is public and no
 * link is ever handed out: every phone fetches the files with its own sign-in and keeps its own copy. The photos show
 * children, so they stay inside the family.
 *
 * Rules: what was chosen or removed on this phone and has not been sent yet wins and goes up; everything else follows
 * the server. A photo whose person is gone leaves both the phone and the store. Photos held for another family never
 * travel into this one: 'J' and 'T' mean other people there.
 */
import { Platform } from 'react-native';
import { supabase } from './cloud';
import { getPref, setPref } from './prefs';
import { allPhotos, photoOf, setPhoto, onLocalPhoto } from './photos';
import { get } from '../state/store';

const BUCKET = 'family-photos';
const STATE = 'photoSync';
/** What this phone knows: the server's time stamp per photo it has, and what still has to go up. */
type State = { fam: string; at: Record<string, string>; todo: string[] };
const stored = (): State | null => { try { return JSON.parse(getPref(STATE) || 'null') as State | null; } catch { return null; } };
const save = (s: State) => setPref(STATE, JSON.stringify(s));
/** Chosen or removed here and not yet taken into a run: kept apart, so it holds while the family is not known yet. */
const WAIT = 'photoWait';
const waiting = (): string[] => { try { const w = JSON.parse(getPref(WAIT) || '[]'); return Array.isArray(w) ? w : []; } catch { return []; } };
const wait = (keys: string[]) => setPref(WAIT, JSON.stringify([...new Set([...waiting(), ...keys])]));

let fam: string | null = null;
let running: Promise<void> = Promise.resolve();

const file = (key: string) => `${key}.jpg`;
const keyOf = (name: string) => (name.endsWith('.jpg') ? name.slice(0, -4) : null);

/** Sends one photo up, or removes it there. True when the server has it as this phone does. */
async function push(s: State, key: string): Promise<boolean> {
  if (!supabase) return false;
  const path = `${s.fam}/${file(key)}`;
  const uri = photoOf(key);
  if (!uri) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return false;
    delete s.at[key];
    return true;
  }
  const { File } = await import('expo-file-system');
  const bytes = await new File(uri).bytes();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) return false;
  const { data } = await supabase.storage.from(BUCKET).list(s.fam, { search: file(key), limit: 10 });
  s.at[key] = data?.find((o) => o.name === file(key))?.updated_at ?? 'sent';
  return true;
}

/** Fetches one photo with this phone's sign-in into a file of its own; null when it did not arrive. */
async function fetchPhoto(s: State, key: string): Promise<string | null> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const token = (await supabase!.auth.getSession()).data.session?.access_token;
  if (!base || !anon || !token) return null;
  const { File, Directory, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const to = new File(dir, `${key}-${Date.now()}.jpg`);
  const url = `${base.replace(/\/$/, '')}/storage/v1/object/authenticated/${BUCKET}/${s.fam}/${encodeURIComponent(file(key))}`;
  const got = await File.downloadFileAsync(url, to, { headers: { Authorization: `Bearer ${token}`, apikey: anon } });
  return got.exists && got.size ? got.uri : null;
}

async function run(familyId: string, peopleSure: boolean) {
  if (!supabase || Platform.OS === 'web' || get().demo) return;
  // Without a sign-in the store answers with an empty list, which would read as "everything was removed".
  if (!(await supabase.auth.getSession()).data.session) return;
  const mine = waiting();
  const before = stored();
  let s: State;
  if (before && before.fam === familyId) s = before;
  else {
    // Another family was here before: its photos stay behind, except what was chosen just now.
    if (before?.fam) for (const key of Object.keys(allPhotos())) if (!mine.includes(key)) setPhoto(key, null, 'server');
    s = { fam: familyId, at: {}, todo: [] };
  }
  s.todo = [...new Set([...s.todo, ...mine])];
  save(s);
  if (mine.length) setPref(WAIT, JSON.stringify(waiting().filter((k) => !mine.includes(k))));
  try {
    // A photo whose person is gone leaves this phone and the store. Only when the server has just confirmed who is in
    // the family: a hiccup must never take a child's photo away.
    if (peopleSure) {
      const alive = new Set<string>(['J', 'T', ...get().people.map((p) => p.id)]);
      for (const key of Object.keys(allPhotos())) if (!alive.has(key)) { setPhoto(key, null, 'server'); if (!s.todo.includes(key)) s.todo.push(key); }
    }
    // Up first: what was chosen or removed here and not sent yet.
    for (const key of [...s.todo]) if (await push(s, key)) s.todo = s.todo.filter((k) => k !== key);
    save(s);
    const { data, error } = await supabase.storage.from(BUCKET).list(familyId, { limit: 200 });
    if (error || !data) return;
    const remote = new Map<string, string>();
    for (const o of data) { const k = keyOf(o.name); if (k) remote.set(k, o.updated_at ?? o.created_at ?? ''); }
    // Down: new or changed on another phone.
    for (const [key, at] of remote) {
      if (s.todo.includes(key) || (s.at[key] === at && photoOf(key))) continue;
      // Ours, just sent: the stamp is learned here without fetching the same picture again.
      if (s.at[key] === 'sent' && photoOf(key)) { s.at[key] = at; continue; }
      const uri = await fetchPhoto(s, key);
      if (uri) { setPhoto(key, uri, 'server'); s.at[key] = at; }
    }
    // Removed on another phone: this phone had it from the store and it is gone there.
    for (const key of Object.keys(s.at)) if (!remote.has(key) && !s.todo.includes(key)) { setPhoto(key, null, 'server'); delete s.at[key]; }
    // Chosen here before the family was reachable.
    for (const key of Object.keys(allPhotos())) if (!remote.has(key) && !s.at[key] && !s.todo.includes(key)) { if (!(await push(s, key))) s.todo.push(key); }
  } catch {
    // No network or a hiccup: nothing is lost, the next run picks it up.
  } finally {
    save(s);
  }
}

/**
 * Brings the photos level with the family's store. Called once the family is known and again whenever the phone
 * catches up. `peopleSure`: the server has just said who is in the family.
 */
export function syncPhotos(familyId: string, peopleSure = false): Promise<void> {
  fam = familyId;
  running = running.then(() => run(familyId, peopleSure));
  return running;
}

// A photo chosen or removed on this phone goes up at once when the family is there, otherwise with the next run.
onLocalPhoto((key) => {
  if (Platform.OS === 'web') return;
  wait([key]);
  if (fam) void syncPhotos(fam);
});

/**
 * Before the account is deleted (Datenschutz, "Alle Daten löschen"): my own photo leaves the family's store, and when
 * I am the last one in the family, every photo of it. Files in the store do not go away with the database rows, so
 * this has to happen here, while the sign-in still holds.
 */
export async function removePhotosBeforeDelete(me: string): Promise<void> {
  const id = fam;
  if (!supabase || !id || Platform.OS === 'web') return;
  try {
    const { count, error } = await supabase.from('family_members').select('user_id', { count: 'exact', head: true }).eq('family_id', id);
    // Only a clear answer counts as "I am the last one": a hiccup must never take the others' photos away.
    const alone = !error && count !== null && count <= 1;
    let names = [file(me)];
    if (alone) {
      const { data } = await supabase.storage.from(BUCKET).list(id, { limit: 1000 });
      names = (data ?? []).map((o) => o.name);
    }
    if (names.length) await supabase.storage.from(BUCKET).remove(names.map((n) => `${id}/${n}`));
  } catch {}
}

/** The deletion did not go through: what this phone holds goes up again. */
export function resendPhotos() {
  wait(Object.keys(allPhotos()));
  if (fam) void syncPhotos(fam);
}

/** Signing out: this phone forgets every photo it holds. The family's store is not touched. */
export function forgetPhotos() {
  fam = null;
  for (const key of Object.keys(allPhotos())) setPhoto(key, null, 'server');
  setPref(STATE, 'null');
  setPref(WAIT, '[]');
}
