/**
 * Hören (Julian 31.10.: "Er versteht nicht, ob ich mit Englisch oder mit Deutsch
 * angefangen habe, und bricht oft zu früh ab"). The phone's own recogniser hears
 * one language and stops at pauses; it still shows the words live. The recording
 * it keeps comes here once the person is done, and ElevenLabs Scribe writes the
 * final text, with the language detected per recording (German, English, mixed).
 *
 * Request (signed in, JWT checked by Supabase): multipart form with `audio` (wav).
 * Response: { text, lang } or { error }. The app falls back to the phone's text on any error.
 *
 * The key lives only here, as the secret ELEVENLABS_API_KEY. Its own day cap
 * (use_hear_call) keeps a script from draining the budget. Nothing is stored,
 * and the log never holds what was said.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// 16 kHz mono 16 bit is 32 KB a second: 3 MB is about 90 seconds, far more than a sentence.
const MAX_BYTES = 3 * 1024 * 1024;

/** Ohne KI (Julian 05.11.): the family switched the AI off; nothing of theirs goes out. Before the column exists: off. */
// deno-lint-ignore no-explicit-any
async function ohneKi(db: { from: (t: string) => any }): Promise<boolean> {
  const { data, error } = await db.from('families').select('ohne_ki').limit(1);
  return !error && !!(data?.[0] as { ohne_ki?: boolean } | undefined)?.ohne_ki;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const key = Deno.env.get('ELEVENLABS_API_KEY');
  if (!key) return json({ error: 'no_key' }, 503);

  let audio: File | null = null;
  let form: FormData;
  try { form = await req.formData(); const a = form.get('audio'); audio = a instanceof File ? a : null; } catch { return json({ error: 'bad_form' }, 400); }
  const formField = (_: Request, k: string) => { const v = form.get(k); return typeof v === 'string' ? v : null; };
  if (!audio || !audio.size) return json({ error: 'empty' }, 400);
  if (audio.size > MAX_BYTES) return json({ error: 'too_long' }, 413);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY') ?? req.headers.get('apikey') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  if (await ohneKi(db)) return json({ error: 'ohne_ki' }, 403);
  const { data: allowed, error: countError } = await db.rpc('use_hear_call');
  if (countError) return json({ error: 'not_signed_in' }, 401);
  if (!allowed?.ok) return json({ error: 'limit' }, 429);

  // The app's listening language ('de' or 'en') and the loudest moment the phone measured (0..10), only for the log.
  const hint = String((await formField(req, 'hint')) ?? '').slice(0, 3);
  const peak = Number((await formField(req, 'peak')) ?? NaN);
  const t0 = Date.now();
  // Julian 08.11.: "every second recording fails". The logs showed it: each failed sentence was one Scribe took for
  // English and returned empty (12 of 12), each German one worked. So when Scribe hears English and nothing in it,
  // ask once more in the app's language before giving up. A clear English sentence still comes back in English.
  const ask = async (lang?: string) => {
    const out = new FormData();
    out.append('model_id', 'scribe_v2');
    out.append('file', audio!, 'satz.wav');
    if (lang) out.append('language_code', lang);
    out.append('tag_audio_events', 'false');
    out.append('diarize', 'false');
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: out, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { ok: false as const, status: res.status };
    const r = await res.json() as { text?: string; language_code?: string };
    return { ok: true as const, text: String(r.text ?? '').replace(/\s+/g, ' ').trim(), lang: r.language_code ?? null };
  };
  try {
    let r = await ask();
    if (!r.ok) { console.error('hoeren', r.status, Date.now() - t0, audio.size); return json({ error: 'stt_failed' }, 502); }
    let retry = false;
    if (!r.text && hint && hint !== 'en' && (!r.lang || r.lang === 'eng' || r.lang === 'en')) {
      retry = true;
      const again = await ask(hint);
      if (again.ok) r = again;
    }
    const text = r.ok ? r.text : '';
    const lang = r.ok ? r.lang : null;
    // Only timing, size, language and loudness, never what was said.
    console.log(JSON.stringify({ ms: Date.now() - t0, bytes: audio.size, lang, empty: !text, retry, peak: Number.isFinite(peak) ? peak : null }));
    return text ? json({ text, lang }) : json({ error: 'nothing_heard' }, 422);
  } catch (e) {
    console.error('hoeren', Date.now() - t0, e instanceof Error ? e.name : 'error');
    return json({ error: 'stt_failed' }, 502);
  }
});
