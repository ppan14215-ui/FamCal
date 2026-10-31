/**
 * Cloud ears (Julian 31.10.): the phone keeps the recording, ElevenLabs Scribe
 * writes the final text with the language it hears. Any problem (no key yet,
 * offline, too slow, day cap) returns null and the phone's own text is used.
 */
import { getAuth } from './auth';

const WAIT_MS = 7000;
// Once the server says it has no key, stop trying until the app restarts.
let off = false;

/** False once the server said it has no key: then the phone's own words show live again. */
export const cloudOn = () => !off;

export async function hearInCloud(uri: string): Promise<string | null> {
  const session = getAuth().session;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (off || !session || !url || !uri) return null;
  const form = new FormData();
  // React Native sends a local file this way; the bytes never pass through JavaScript.
  form.append('audio', { uri, name: 'satz.wav', type: 'audio/wav' } as any);
  const ctrl = new AbortController();
  const late = setTimeout(() => ctrl.abort(), WAIT_MS);
  try {
    const res = await fetch(`${url}/functions/v1/hoeren`, {
      method: 'POST', body: form, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const r = await res.json().catch(() => ({})) as { text?: string; error?: string };
    if (r.error === 'no_key' || res.status === 404) off = true;
    return res.ok && r.text ? r.text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(late);
  }
}
