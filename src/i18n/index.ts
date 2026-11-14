/**
 * i18n setup, same pattern as Namore: expo-localization + i18next +
 * react-i18next. Spec v2 §10 wants DE + EN; since 27.10. both from the start.
 * Navigation and shared controls go through `t()`, screen copy uses `tx()`
 * from ./lang with both languages side by side until the copy settles.
 */
import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import { LANG } from './lang';

i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: LANG,
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
