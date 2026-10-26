/**
 * i18n setup, same pattern as Namore: expo-localization + i18next +
 * react-i18next. Spec v2 §10 wants DE + EN per parent; the prototype ships
 * German first, so only navigation and shared controls go through `t()` yet.
 * Screen copy and sample data stay German until the copy settles.
 */
import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
