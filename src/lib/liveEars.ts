/**
 * Live ears (Julian 14.11. 13:21: "da steht nur Listening und dann kommt mit einem Schlag der komplette Text";
 * 15.11.: "Echtzeit aus der Cloud"). The microphone streams straight to ElevenLabs Scribe realtime while the
 * person speaks. Words come back within a moment: the current guess shows grey, a settled piece turns to ink,
 * in whatever language is spoken, German and English mixed too.
 *
 * The phone's own recogniser stays out of it (two listeners cannot share the microphone). Everything said is
 * also kept in memory until the sentence has landed: if the live line never opens or drops, the same audio
 * goes to the recording route (hearInCloud) once, so a sentence is not lost with the connection.
 *
 * Needs the native microphone stream (expo-audio-stream-pcm), which only a new app build carries. Without it
 * liveEarsReady() is false and the old way (phone recogniser plus recording) is used.
 */
import { Platform } from 'react-native';
import { getAuth, freshToken } from './auth';
import { cloudOn, hearInCloud } from './hoeren';

type Mic = { start: (o: { sampleRate: number; channels: number; bitDepth: number }) => void; stop: () => void; addListener: (e: 'onAudioData', cb: (ev: { data: string }) => void) => { remove: () => void } };

let mic: Mic | null | undefined;
/** The native microphone stream, or null in a build that does not have it yet. */
function getMic(): Mic | null {
  if (mic !== undefined) return mic;
  if (Platform.OS === 'web') return (mic = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as { requireOptionalNativeModule?: (n: string) => unknown };
    if (!core.requireOptionalNativeModule?.('ExpoAudioStream')) return (mic = null);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mic = (require('expo-audio-stream-pcm') as { default: Mic }).default;
  } catch {
    mic = null;
  }
  return mic;
}

/** Once the server refused live ears twice in a row, stop asking until the app restarts. */
let misses = 0;
export const liveEarsReady = () => cloudOn() && misses < 2 && !!getMic();

const RATE = 16000;
/** How long the last words may take to settle after the stop before the current guess is taken as it is. */
const SETTLE_MS = 1800;
/** How long the live line may take to open before the sentence goes the recording route instead. */
const OPEN_MS = 4000;

const until = (ok: () => boolean, ms: number) => new Promise<void>((r) => {
  const began = Date.now();
  const t = setInterval(() => { if (ok() || Date.now() - began >= ms) { clearInterval(t); r(); } }, 50);
});

function bytesOf(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64Of(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 3) {
    const a = u[i], b = u[i + 1], c = u[i + 2];
    s += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]) + (c === undefined ? '=' : B64[c & 63]);
  }
  return s;
}
/** Loudness of one chunk, 0 to 1 (16 bit little endian samples). */
function loud(u: Uint8Array): number {
  let sum = 0, n = 0;
  for (let i = 0; i + 1 < u.length; i += 8) { const v = ((u[i + 1] << 8) | u[i]) << 16 >> 16; sum += v * v; n++; }
  if (!n) return 0;
  // Speech sits around 1000 to 8000 of 32768; the root lifts quiet voices into view.
  return Math.min(1, Math.sqrt(Math.sqrt(sum / n) / 6000));
}

function wav(chunks: Uint8Array[], size: number): Uint8Array {
  const out = new Uint8Array(44 + size);
  const v = new DataView(out.buffer);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) out[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + size, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, size, true);
  let o = 44;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export type LiveResult = {
  text: string;
  /** live: the realtime line wrote it. batch: the line failed and the recording route wrote it. none: nothing came. */
  via: 'live' | 'batch' | 'none';
  /** For the error log only, never what was said. */
  info: { marks: string; ms: number; peak: number; bytes: number; partials: number; commits: number; error: string };
};
export type LiveSession = {
  /** Done speaking: settle the last words and hand back the whole text. */
  stop: () => Promise<LiveResult>;
  /** Throw it away (cancel, or the keyboard took over with nothing to keep). */
  cancel: () => void;
  /** What has been heard up to now. */
  heard: () => string;
};

/**
 * Starts listening. words() fires with every change (sure = settled, part = current guess), level() with the
 * loudness. Returns null when the microphone could not start; the caller then uses the old way.
 */
export function startLiveEars(on: { words: (sure: string, part: string) => void; level: (v: number) => void; hint?: string }): LiveSession | null {
  const m = getMic();
  if (!m) return null;
  const t0 = Date.now();
  const marks: string[] = [];
  const mark = (x: string) => { if (marks.length < 40) marks.push(`${x}@${Date.now() - t0}`); };
  const chunks: Uint8Array[] = [];
  let size = 0;
  let sent = 0;
  let peak = 0;
  let sure = '';
  let part = '';
  let partials = 0;
  let commits = 0;
  let error = '';
  let ws: WebSocket | null = null;
  let open = false;
  let dead = false;
  let stopped = false;
  let settled: (() => void) | null = null;
  let lastMsg = 0;
  const heard = () => `${sure} ${part}`.replace(/\s+/g, ' ').trim();
  const push = (u: Uint8Array, commit = false) => {
    try { ws?.send(JSON.stringify(commit ? { message_type: 'input_audio_chunk', audio_base_64: b64Of(u), commit: true } : { message_type: 'input_audio_chunk', audio_base_64: b64Of(u) })); } catch { dead = true; }
  };
  // What was said before the line opened is sent as soon as it does, so the first words are not lost.
  const flush = () => { while (open && !dead && sent < chunks.length) push(chunks[sent++]); };

  let sub: { remove: () => void } | null = null;
  try {
    sub = m.addListener('onAudioData', (ev) => {
      if (stopped) return;
      const u = bytesOf(ev.data);
      // 3 minutes at most stay in memory (about 6 MB); the cap in the bar stops the recording by then.
      chunks.push(u); size += u.length;
      const l = loud(u);
      if (l > peak) peak = l;
      on.level(l);
      flush();
    });
    m.start({ sampleRate: RATE, channels: 1, bitDepth: 16 });
    mark('mic');
  } catch {
    try { sub?.remove(); m.stop(); } catch {}
    return null;
  }

  const connect = async () => {
    const session = getAuth().session;
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!session || !base) { error = 'no_session'; dead = true; return; }
    // The phone's engine has no AbortSignal.timeout (it threw at once, 15.11., and no sentence ever went live).
    const ctrl = new AbortController();
    const late = setTimeout(() => ctrl.abort(), OPEN_MS);
    try {
      const res = await fetch(`${base}/functions/v1/hoeren`, {
        method: 'POST', body: JSON.stringify({ live: true }), signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await freshToken()) ?? session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      });
      const r = await res.json().catch(() => ({})) as { url?: string; error?: string };
      clearTimeout(late);
      mark(`token:${res.status}`);
      if (!res.ok || !r.url) { error = r.error ?? `http_${res.status}`; dead = true; misses++; return; }
      if (stopped && !size) return;
      const sock = new WebSocket(r.url);
      ws = sock;
      sock.onopen = () => { open = true; misses = 0; mark('open'); flush(); };
      sock.onmessage = (e) => {
        let msg: { message_type?: string; text?: string; error?: string };
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        const kind = msg.message_type ?? '';
        lastMsg = Date.now();
        if (kind === 'partial_transcript') {
          part = String(msg.text ?? '');
          if (part && !partials++) mark('first');
          on.words(sure, part);
        } else if (kind === 'committed_transcript') {
          const t = String(msg.text ?? '').trim();
          if (t) { sure = `${sure} ${t}`.trim(); commits++; }
          part = '';
          on.words(sure, part);
          if (stopped) settled?.();
        } else if (msg.error || kind.includes('error')) {
          error = kind || 'error';
          mark(`err:${kind}`);
          dead = true;
          settled?.();
        }
      };
      sock.onerror = () => { if (!open) misses++; error = error || 'socket'; mark('sockerr'); dead = true; settled?.(); };
      sock.onclose = (e) => { mark(`close:${e?.code ?? ''}`); dead = true; settled?.(); };
    } catch (e) {
      clearTimeout(late);
      // The message says what broke (never what was said); the name alone hid the cause on 15.11.
      error = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 80) : 'error';
      dead = true;
      misses++;
      mark('tokenfail');
    }
  };
  /** The person stopped: the rest of the audio goes out and the open piece is settled. */
  const finishLine = () => {
    flush();
    // A fifth of a second of silence carries the commit, so the last word is not cut.
    if (open && !dead) push(new Uint8Array(RATE * 2 / 5), true);
  };
  void connect();

  const close = () => {
    try { sub?.remove(); } catch {}
    try { m.stop(); } catch {}
    try { ws?.close(); } catch {}
  };

  return {
    heard,
    cancel: () => { stopped = true; dead = true; mark('cancel'); close(); },
    stop: async () => {
      if (stopped) return { text: heard(), via: heard() ? 'live' : 'none', info: { marks: marks.join(' '), ms: Date.now() - t0, peak: Math.round(peak * 10) / 10, bytes: size, partials, commits, error } };
      mark('stop');
      // The microphone hands over what it still holds, then it is released.
      await new Promise<void>((r) => setTimeout(r, 120));
      stopped = true;
      try { m.stop(); } catch {}
      try { sub?.remove(); } catch {}
      if (!open && !dead) await until(() => open || dead, OPEN_MS);
      if (open && !dead) {
        const sentAt = Date.now();
        const wait = new Promise<void>((r) => { settled = r; });
        finishLine();
        await Promise.race([wait, new Promise<void>((r) => setTimeout(r, SETTLE_MS))]);
        // A piece settled by an earlier pause can arrive right after the stop; the last words follow a moment
        // later. Wait until the line has been quiet for a moment before taking the text.
        await until(() => dead || Date.now() - lastMsg > 350, Math.max(0, SETTLE_MS - (Date.now() - sentAt)));
        mark(part ? 'unsettled' : 'settled');
      }
      let text = heard();
      let via: LiveResult['via'] = text ? 'live' : 'none';
      // The line never carried the whole sentence (never opened, or dropped before every chunk was out): the same
      // audio goes the recording route once.
      const whole = open && sent >= chunks.length && !error;
      if (!whole && size > RATE / 2) {
        mark('batch');
        try {
          const { File, Paths } = await import('expo-file-system');
          const f = new File(Paths.cache, 'satz-live.wav');
          if (f.exists) f.delete();
          f.create();
          f.write(wav(chunks, size));
          const better = await hearInCloud(f.uri, on.hint, peak * 10);
          try { f.delete(); } catch {}
          if (better) { text = better; via = 'batch'; }
        } catch (e) {
          error = error || (e instanceof Error ? e.name : 'batch');
        }
      }
      try { ws?.close(); } catch {}
      return { text, via, info: { marks: marks.join(' '), ms: Date.now() - t0, peak: Math.round(peak * 10) / 10, bytes: size, partials, commits, error } };
    },
  };
}
