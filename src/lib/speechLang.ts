/**
 * Which language the phone listens for (Julian 27.10.: German did not work on his
 * English Android phone). Speech recognition hears one language at a time, so
 * it starts in German whenever German is among the phone's languages and can be
 * switched in the settings; the choice is kept on the device.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { LANG } from '../i18n/lang';
import { LIVE } from './live';

export type SpeechLang = 'de' | 'en';
const KEY = 'famcal.speechLang';

/** German as soon as German is among the phone's languages: the family talks German even on an English phone. */
function fromPhone(): SpeechLang {
  if (!LIVE) return 'de';
  try { return getLocales().some((l) => l.languageCode === 'de') ? 'de' : LANG; } catch { return LANG; }
}

let current: SpeechLang = fromPhone();
if (Platform.OS !== 'web') AsyncStorage.getItem(KEY).then((v) => { if (v === 'de' || v === 'en') current = v; }).catch(() => {});

export const speechLang = () => current;
export const speechLocale = () => (current === 'de' ? 'de-DE' : 'en-US');
export function setSpeechLang(v: SpeechLang) {
  current = v;
  if (Platform.OS !== 'web') AsyncStorage.setItem(KEY, v).catch(() => {});
}
