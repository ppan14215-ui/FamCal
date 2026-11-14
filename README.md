# FamCal

Der ruhige Familienkalender, der für euch beide mitdenkt (Arbeitsname, Name offen).

Stand: Live-Prototyp mit allen Canvas-Screens, Beispieldaten von Julia, Tom und Ben. Kein Login, kein Backend, keine echte KI. Hintergrund: [HANDOFF.md](HANDOFF.md).

## Prototyp starten

```bash
npm install
npx expo start        # QR-Code mit Expo Go oder einem Development Build öffnen
npm run web           # im Browser
npm run typecheck     # vor jedem Push
```

Am Handy ohne Installation: `npm run artifact` baut eine einzelne HTML-Datei (`dist/famcal-prototyp.html`), die als Link geteilt werden kann. Die App läuft darin über react-native-web, Gesten inklusive.

EAS ist vorbereitet (`eas.json` mit development, preview, production und Kanälen für expo-updates). Für Builds fehlt noch ein Expo-Projekt: einmal `eas init` mit Julians Konto, dann `eas build --profile preview` oder `eas update --channel preview`.

## Feste Annahmen im Prototyp
- Heute ist Donnerstag, 29. Oktober 2026, 8:50 Uhr (`src/lib/dates.ts`). Ben ist am 14. September 2026 geboren und 6 Wochen alt.
- Alle Daten liegen im Speicher (`src/state/store.ts`) und sind nach dem Neuladen wieder wie am Anfang. Einstellungen, „Onboarding neu starten“ setzt sie auch zurück.
- Antworten des Assistenten und Entwürfe sind vorbereitete Texte.

## Aufbau
- `app/`: Screens als expo-router-Routen. `(tabs)/` sind Heute, Kalender, Listen, Eingang. Sheets (`neu`, `symbol`, `meilenstein/[id]`) liegen als transparente Modals darüber. `demo/` zeigt Sperrbildschirm, Teilen und Widgets.
- `src/components/ui/`: Bausteine 1:1 zu den Helfern in `design/gen.py` (Txt, Row, Group, Btn, Seg, Check, Toggle, Chip …).
- `src/components/`: Gesten-Bausteine (SwipeRow, SwipeDeck, Sheet, ItemRow) und Toast.
- `src/screens/kalender/`: Tag, Woche, Monat und der Jahresring.
- `src/data/sample.ts`: Beispieldaten. Wochentage sind gegen den echten Kalender geprüft.
- `src/theme/`: Farben, Schriften, Bewegung.
- `src/lib/clayIcons.ts`: wird von `node scripts/gen-icons.js` aus `assets/icons/` erzeugt.

## Design
- `docs/`: Designregeln (DESIGN.md), Spec v2, Abgleich Spec und Flow
- `design/screens/`: alle 50 Screens aus dem Canvas als HTML (Referenz, kein App-Code)
- `design/gen.py`: Generator der Screens mit allen Tokens
- `assets/icons/`: Clay-Icons (webp, 192 px)
