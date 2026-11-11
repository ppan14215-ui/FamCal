/**
 * Cloud ears (Julian 31.10.): the phone keeps the recording, ElevenLabs Scribe
 * writes the final text with the language it hears. Any problem (no key yet,
 * offline, too slow, day cap) returns null and the phone's own text is used.
 */
import { getAuth, freshToken } from './auth';
import { spracheCloud } from './privat';

const WAIT_MS = 7000;
// Once the server says it has no key, stop trying until the app restarts.
let off = false;

/** False once the server said it has no key: then the phone's own words show live again. */
// Without a login (onboarding) the cloud can't hear, so the phone's own words must land (Julian 05.11. 23:28: every second
// recording failed in the onboarding).
export const cloudOn = () => !off && !hearCapped && spracheCloud() && !!getAuth().session;
/** Day cap of cloud ears reached (Julian 05.11.: 40 a person a day): the phone's own words are used until the app restarts. */
let hearCapped = false;
export const cloudCapped = () => hearCapped;

/** hint: the app's listening language, so a sentence Scribe takes for empty English is asked again in it; peak: loudest volume 0..10, only for the log. */
export async function hearInCloud(uri: string, hint?: string, peak?: number): Promise<string | null> {
  const session = getAuth().session;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  // Sprache nur auf dem Handy or Ohne KI (Julian 05.11.): the recording never leaves the phone.
  if (off || !session || !url || !uri || !spracheCloud()) return null;
  const form = new FormData();
  // React Native sends a local file this way; the bytes never pass through JavaScript.
  form.append('audio', { uri, name: 'satz.wav', type: 'audio/wav' } as any);
  if (hint) form.append('hint', hint);
  if (peak !== undefined) form.append('peak', String(Math.round(peak * 10) / 10));
  const ctrl = new AbortController();
  const late = setTimeout(() => ctrl.abort(), WAIT_MS);
  try {
    const res = await fetch(`${url}/functions/v1/hoeren`, {
      method: 'POST', body: form, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${(await freshToken()) ?? session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const r = await res.json().catch(() => ({})) as { text?: string; error?: string };
    if (r.error === 'no_key' || res.status === 404) off = true;
    if (res.status === 429) hearCapped = true;
    return res.ok && r.text ? r.text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(late);
  }
}
