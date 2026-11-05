/**
 * Teilen an FamCal (Julian 28.10.: Rezept Link aus Browser oder Chefkoch).
 * Android hands shared text and links to the native module of
 * expo-share-intent; this file passes them on as plain text, as if typed.
 * The module is looked up by name, so builds without it (web, older APKs)
 * simply never deliver anything.
 */
import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = {
  getShareIntent(url: string): string;
  clearShareIntent(key: string): Promise<void>;
  addListener(event: 'onChange', fn: (e: { value: unknown }) => void): { remove(): void };
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('ExpoShareIntentModule') : null;
// The plugin keys stored shares by the app scheme (app.json "scheme").
const KEY = 'famcalShareKey';

/** Text and link of a share, joined: "Spaghetti Bolognese https://…". */
type Value = { text?: string; weburls?: { url?: string }[]; meta?: { title?: string }; files?: { path?: string; mimeType?: string }[] } | null;
const parse = (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value) as Value;

/** A shared picture (Julian 29.10.: a screenshot of a list), as a file uri. */
function imageOf(value: unknown): string | null {
  const f = parse(value)?.files?.find((x) => x.path && /^image\//.test(x.mimeType ?? 'image/'));
  return f?.path ? (f.path.startsWith('file:') || f.path.startsWith('content:') ? f.path : `file://${f.path}`) : null;
}

function textOf(value: unknown): string | null {
  const v = parse(value);
  if (!v) return null;
  const parts = [v.meta?.title, v.text, ...(v.weburls ?? []).map((w) => w.url)].filter((x): x is string => !!x && !!x.trim());
  // A link often comes once as text and once as url.
  const out = [...new Set(parts.map((p) => p.trim()))].join(' ');
  return out || null;
}

/**
 * Calls `fn` with every shared text, including one shared while the app was
 * closed (delivered once after subscribing). Returns the unsubscribe.
 */
export function onShared(fn: (text: string) => void, onImage?: (uri: string) => void): () => void {
  if (!native) return () => {};
  let last = '';
  const sub = native.addListener('onChange', (e) => {
    let img: string | null = null;
    try { img = imageOf(e.value); } catch { img = null; }
    if (img && onImage) {
      if (img === last) return;
      last = img;
      native.clearShareIntent(KEY).catch(() => {});
      return onImage(img);
    }
    let t: string | null = null;
    try { t = textOf(e.value); } catch { t = null; }
    if (!t || t === last) return;
    last = t;
    native.clearShareIntent(KEY).catch(() => {});
    fn(t);
  });
  // Asks the module for a pending share: at start (cold start) and whenever the app comes back.
  const ask = () => { try { native.getShareIntent(''); } catch {} };
  ask();
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') ask(); else last = ''; });
  return () => { sub.remove(); app.remove(); };
}

/** Text from inside the app that should be heard as if said (Julian 30.10.: a photo of a letter becomes a Termin). */
const inApp = new Set<(text: string) => void>();
export function sayInApp(text: string) { inApp.forEach((fn) => fn(text)); }
export function onSayInApp(fn: (text: string) => void): () => void { inApp.add(fn); return () => { inApp.delete(fn); }; }
