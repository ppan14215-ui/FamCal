/**
 * Deutsch und Englisch von Anfang an (Julian 27.10.: "smart calendar you can
 * talk to", bigger market). The real app follows the phone's language:
 * German phones get German, everything else English. The test link stays
 * German with its German sample family; "#en" at the end of its link shows
 * English. Kept free of other imports so dates.ts can read it first.
 */
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { LIVE } from '../lib/live';

export type Lang = 'de' | 'en';

function detect(): Lang {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && /^#en\b/.test(window.location.hash)) return 'en';
  if (!LIVE) return 'de';
  try { return getLocales()[0]?.languageCode === 'de' ? 'de' : 'en'; } catch { return 'de'; }
}

export const LANG: Lang = detect();
export const EN = LANG === 'en';

/**
 * Language the mic listens in. Not the screen language: an English phone
 * with German among its languages still gets German, because the family
 * talks German (Julian 27.10.: German did not work at all).
 */
function hear(): string {
  if (!LIVE) return 'de-DE';
  try { return getLocales().some((l) => l.languageCode === 'de') ? 'de-DE' : 'en-US'; } catch { return 'de-DE'; }
}

export const SPEECH_LANG = hear();

/** Copy in both languages side by side: tx('Heute', 'Today'). */
export const tx = (de: string, en: string) => (EN ? en : de);

/** Quoted speech: „so“ in German, “so” in English. */
export const quote = (s: string) => (EN ? `“${s}”` : `„${s}“`);
