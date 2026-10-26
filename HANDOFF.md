# Handoff: Familienkalender-App (Stand 26.10.2026)

Dieses Repo startet den Live-Prototyp. Design und Produktentscheidungen entstanden im Projekt „New Project Ideas“. Hier steht alles, was ein neues Projekt braucht, um ohne Rückfragen weiterzubauen.

## Was das Produkt ist
Ein ruhiger, gemeinsamer Familienkalender für beide Eltern, der mitdenkt. Der Einstieg zum Launch richtet sich an Eltern im ersten Babyjahr, der Kern bleibt aber ein allgemeiner Familienassistent.
- Positionierung (Vorschlag, nicht bestätigt): „Nie wieder: Hast du daran gedacht?“, Untertitel: „Der ruhige Familienkalender, der für euch beide mitdenkt“.
- Kein Kita-Fokus. Die Kita ist nur eine Quelle unter vielen. Julians eigene Stressmomente sind: Termine des Partners, Pass und Amt, Arzt und Impfungen, Einkaufsliste.
- Die App schlägt nie vor, wer etwas übernimmt. Das entscheiden die Eltern.
- Der Assistent schreibt nur Entwürfe und handelt nie ungefragt.
- Preis: gratis für Organisieren. Plus für 4,99 €/Monat oder 39,99 €/Jahr, Gründerjahr 29 €.

Details: `docs/spec-v2.md` (Spec v2) und `docs/v1-flow-spec-abgleich.md`.

## Wo was liegt
- `docs/research/`: Review, Spec v1/v2, Ideen-Backlog, Design-Brief und Review-Analysen (TimeTree, Podz, Babyjahr-Apps, Eingänge)
- `docs/design-notes/`: Stil-Prinzipien (Airbnb, Notion, App-Stile), GPT-Bildprompts für die Icons
- `docs/memory/`: Projekt-Gedächtnis aus „New Project Ideas“ (Entscheidungen, Design-Verlauf, Icons, Agent-Machbarkeit, Kita-Warnung). Das neue Projekt sollte es in sein eigenes Gedächtnis übernehmen.
- `design/icon-motion/`: Icon-Animations-Engine (v4 ist die Basis, template4.html + engine4.js) und 512er-Icons

## Design
- Canvas (Quelle der Wahrheit, 50 Boards, Version 37): https://claude.ai/artifact/2D3QEB3EFs2MSUy7CVkCno
- Regeln: `docs/DESIGN.md`, vor allem Abschnitt „Einfachheit“ mit 8 Regeln (Wabi × Devouring Details).
- Screens als HTML: `design/screens/*.dc.html`, Positionen in `design/screens/canvas.json`. Generator, der sie erzeugt: `design/gen.py`, mit allen Tokens und Bausteinen oben in der Datei.
- Clay-Icons: `assets/icons/` (webp; `icon-<name>.webp`, Teile `icon-<name>__<teil>.webp`). Die 1024er-Originale liegen in Julians Vault unter `02 Wiki/Projects/Family Assistant/Design/Icons v1/`.
- Schrift: Geist. Persona-Farben: Julia rosa (#F6DDE2 / #9D2B48), Tom blau (#DCE7F4 / #1F4E89). Akzent #075056, Frist #C2410C, Hintergrund #F5F5F4, Tinte #16232A.

### Feste Interaktionsregeln (Julian)
- Erledigt nur per Tipp auf den Haken.
- Nur nach links wischen löscht, danach Rückgängig. Nach rechts wischen gibt es nicht.
- Bearbeiten: Text antippen macht die Zeile zum Textfeld, sonst nichts. Menge und Notiz werden aus dem Text gelesen.
- Heute hat keine Tabs. Listen hat Clay-Tabs (Aufgaben, Einkauf, eigene Listen, + Neu).
- Icon-Animation sind Objekt-Geschichten, nie reines Skalieren oder Clip-Reveal.
- Bottom-Nav: schwebende Pille mit Linien-Icons (Heute, Kalender, Listen, Eingang) plus runder dunkler „+“-Button.

## Prototyp-Umfang (Julian, 26.10.2026)
Alle Screens aus dem Canvas, so weit wie im Design vorgesehen, als Live-Prototyp, den Julian am Handy testet. Weiter iteriert wird am Prototyp statt am Canvas.
- Beispieldaten: Julia, Tom, Ben (7 Wochen).
- Kein Login, kein Backend, keine echte KI.
- Echte Gesten: Haken, links wischen, Zeile bearbeiten, Swipe-Karten, Jahresring ziehen.
- Technik: siehe Entscheidung unten.

## Offene Entscheidungen
- Technik: **entschieden (Julian, 26.10.2026): derselbe Stack wie Namore** (`ppan14215-ui/namore-baby-name-app`). Das ist Expo SDK 55 mit expo-router, React Native 0.83, React 19.2, Reanimated 4 + react-native-worklets, gesture-handler, react-native-svg, expo-haptics, i18next, EAS (eas.json, expo-updates) und react-native-web. Später kommen wie bei Namore Supabase, RevenueCat, PostHog und Sentry dazu, aber nicht im ersten Prototyp. Namores CLAUDE.md, AGENTS.md und Projektstruktur (`app/`, `src/`) sind die Vorlage.
- Wie Julian am Handy testet: wie bei Namore (EAS-Build/Update auf seinem Gerät) oder per Web-Export-Link. Klären, was er bei Namore nutzt.
- App-Name: offen. `familienkalender` ist nur ein Arbeitsname.
- Positionierung: Vorschlag, noch nicht bestätigt.

## Arbeitsweise mit Julian
- Antworten auf Deutsch, kurz, ohne Gedankenstriche.
- Er arbeitet ab morgen vom Handy aus.
- Zahlen immer live prüfen und nichts als verifiziert ausgeben, was nicht geprüft ist.
