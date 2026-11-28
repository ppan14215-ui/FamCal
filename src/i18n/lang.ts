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
 * The answer follows the language that was spoken (Julian 29.10.: German
 * said on an English phone got English back). While a sentence is handled,
 * `inLang` switches tx for that work only; the screens keep the phone's language.
 */
let over: Lang | null = null;
const cur = () => over ?? LANG;
/** English right now: the phone's language, or the spoken one while a sentence is handled. */
export const isEn = () => cur() === 'en';
export function inLang<T>(l: Lang | null, fn: () => T): T {
  const prev = over;
  over = l;
  try { return fn(); } finally { over = prev; }
}

const DE_WORDS = /\b(und|ich|wir|am|um|uhr|mit|die|der|das|den|dem|ist|nicht|morgen|heute|übermorgen|bitte|auf|für|zum|zur|noch|meine[mnrs]?|unsere[mnrs]?|nächste[nrs]?|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|liste|einkauf|kaufen|gehen|essen|termin)\b/gi;
const EN_WORDS = /\b(and|the|at|with|is|not|tomorrow|today|please|on|for|to|my|our|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|list|shopping|buy|we|i|pm|am|go|going|dinner|appointment)\b/gi;
/** German or English, from the words alone; null when it can't tell. */
export function spokenLang(said: string): Lang | null {
  const de = (said.match(DE_WORDS)?.length ?? 0) + (/[äöüß]/i.test(said) ? 2 : 0);
  const en = said.match(EN_WORDS)?.length ?? 0;
  return de > en ? 'de' : en > de ? 'en' : null;
}

/** Copy in both languages side by side: tx('Heute', 'Today'). */
export const tx = (de: string, en: string) => (cur() === 'en' ? en : de);

/** Quoted speech: „so“ in German, “so” in English. */
export const quote = (s: string) => (cur() === 'en' ? `“${s}”` : `„${s}“`);
