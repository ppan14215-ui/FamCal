/**
 * Liste aus einem Bild (Julian 29.10.: "Wenn ich einen Screenshot meiner bisherigen
 * Liste hochlade, sollte die App verstehen: hier werden Filme gesammelt, hier geht
 * es um Bewertungen, ich erstelle daraus eine Liste"). The phone reads the text
 * itself; only the text goes to Claude, and numbers that look like an IBAN, a tax
 * id or a card are cut out first. The picture never leaves the phone.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import { supabase } from './cloud';
import { getAuth } from './auth';
import { LANG } from '../i18n/lang';

/** Builds before the picker and text reader simply say "kommt mit dem nächsten Update". */
export const canRead = () => !!requireOptionalNativeModule('ExponentImagePicker') && !!requireOptionalNativeModule('ExpoTextExtractor');

export type ReadItem = { name: string; score?: number; stars?: number; year?: string; note?: string; seen?: boolean };
export type ReadList = { name: string; source: 'movies' | 'books' | null; rating: 'score' | 'stars' | null; items: ReadItem[] };

/** Gallery or camera; null when the person backs out. */
export async function pickImage(from: 'gallery' | 'camera'): Promise<string | null> {
  const P = await import('expo-image-picker');
  const opts = { mediaTypes: ['images' as const], quality: 0.9 };
  if (from === 'camera') {
    const ok = await P.requestCameraPermissionsAsync();
    if (!ok.granted) return null;
  }
  const r = from === 'camera' ? await P.launchCameraAsync(opts) : await P.launchImageLibraryAsync(opts);
  return r.canceled ? null : r.assets?.[0]?.uri ?? null;
}

/** IBAN, tax id, card and long account numbers never leave the phone. */
export function scrub(line: string) {
  return line
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g, '···')
    .replace(/\b\d(?:[\s/-]?\d){9,}\b/g, '···')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '···');
}

export async function readLines(uri: string): Promise<string[]> {
  const T = await import('expo-text-extractor');
  if (!T.isSupported) return [];
  const raw = await T.extractTextFromImage(uri);
  return raw.flatMap((x) => x.split(/\n/)).map((x) => scrub(x.trim())).filter((x) => x && x !== '···').slice(0, 200);
}

/** Claude reads the lines and says what list this is; null when it is not a list. */
export async function understandLines(lines: string[]): Promise<ReadList | null> {
  if (!supabase || !getAuth().session || !lines.length) return null;
  const { data, error } = await supabase.functions.invoke<{ list: ReadList | null }>('liste', { body: { action: 'bildliste', lines: lines.map((l) => l.slice(0, 160)), lang: LANG } });
  return error || !data?.list?.items?.length ? null : data.list;
}
