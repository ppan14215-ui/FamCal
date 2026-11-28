# AGENTS.md

Arbeitsweise für KI-Agenten und Menschen in diesem Repo. Vorlage ist Namore (`ppan14215-ui/namore-baby-name-app`).

## Absprachen
1. **Erst holen.** `git fetch origin` und den eigenen Branch aktualisieren, bevor die Arbeit beginnt.
2. **Nur Branches.** Nie direkt auf `main` arbeiten.
3. **Kleine Commits** mit klarer Nachricht (was und warum).
4. **`CHANGELOG.md` pflegen.** Für jede sichtbare Änderung eine Zeile in einfacher Sprache unter **Unreleased**.
5. **Normal pushen**, nie force-pushen.
6. **Nie nach `main` pushen oder mergen** ohne Julians ausdrückliches OK.
7. Vor jedem Push `npm run typecheck`.

## Mit Julian
- Antworten auf Deutsch, kurz, ohne Gedankenstriche.
- Zahlen und Daten live prüfen (Wochentage, Fristen, Preise) und nichts als geprüft ausgeben, was nicht geprüft ist.

## Produktregeln, die der Code einhält
- Die App schlägt nie vor, wer etwas übernimmt. Der Assistent schreibt nur Entwürfe und handelt nie ungefragt.
- Erledigt nur per Tipp auf den Haken. Nur nach links wischen löscht, danach Rückgängig. Text antippen macht die Zeile zum Textfeld.
- Heute hat keine Tabs. Listen hat Clay-Tabs. Bottom-Nav ist eine schwebende Pille plus runder „+“-Button.
- Pro Screen ein dunkles Element. Farbe nur im Objekt (Clay-Icon und seine Kachel).
- Jeder Tipp antwortet mit Bewegung. Regeln und Bausteine in [docs/MOTION.md](docs/MOTION.md).

## Technik
- Expo SDK 55, expo-router, React Native 0.83, React 19.2, Reanimated 4 mit react-native-worklets (Babel-Plugin zuletzt), gesture-handler, react-native-svg, expo-haptics, i18next, react-native-web, EAS.
- State: kleiner Store mit `useSyncExternalStore` (`src/state/store.ts`). Selektoren geben stabile Teile zurück, Abgeleitetes entsteht in `useMemo`.
- Design-Quelle: `design/gen.py` und der Canvas aus HANDOFF.md. Neue Bausteine zuerst in `src/components/ui/kit.tsx` suchen.
- Supabase ist seit 27.10. drin (Anmelden, Familie, Termine, Function `verstehen` mit Claude), Einrichtung in [docs/LIVE.md](docs/LIVE.md). Ohne `.env` läuft alles lokal wie im Testlink. RevenueCat, PostHog und Sentry kommen später.
- Handy-Link: `npm run artifact` (Web-Export plus `scripts/web-single-file.js`). Die Datei ist nur der Body, der Host ergänzt `<html>` und `<head>`.
