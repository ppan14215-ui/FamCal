# Motion in FamCal: Fühlen der Aktion

Übernommen aus Namore (Julian, 26.10.2026). Jeder Tipp antwortet mit Bewegung, Inhalte kommen an statt aufzutauchen, nichts wirkt starr. Werte stehen in `src/theme/motion.ts`.

## Prinzipien
1. **Ein Hauptdarsteller pro Moment.** Immer nur eine Sache bewegt sich deutlich, der Rest ist ruhig.
2. **Federn ohne Nachwippen.** Kritisch gedämpft. Ein kleiner Sprung nur, wenn die eigene Handlung ihn auslöst (Haken setzen).
3. **Gesten behalten ihren Schwung.** Was man zieht oder wischt, landet mit der Geschwindigkeit der Hand als Feder.
4. **Haptik auf dem Moment, der zählt.** Beim Landen, Einrasten, Erledigen. Nicht beim Start einer Bewegung.
5. **Bewegung, dann lesbare Pause.** Keine Endlosschleifen, nichts blinkt im Leerlauf.
6. **Licht statt Partikel.** Höchstens ein weicher Lichtstreifen, kein Konfetti.
7. **Räumlich gleich.** Ein Objekt kommt immer vom selben Ort und geht denselben Weg zurück.
8. **Reduzierte Bewegung respektieren.** Dann gilt sofort der Endzustand.

## Bausteine
- **PressScale** ist die eine Antwort auf jeden Tipp: 0,97, bei großen Flächen 0,985.
- **rise(i):** Inhalte steigen 12 pt hoch und blenden ein, 240 ms, versetzt um 50 ms (höchstens 6 Stufen).
- **rowIn, rowOut, rowLayout:** Zeilen blenden ein und aus, Nachbarn rutschen in die Lücke.
- **swapIn:** Inhalt wechselt an Ort und Stelle (Tab, Ansicht, Schritt).
- **Icon Motion beim Erledigen:** Clay-Icons mit Teil-Ebene erzählen ihre Geschichte (Ordner schließt, Spritze leert sich, Münze springt). Ohne Teil-Ebene: Ducken, Hüpfen, Setzen. Daten in `src/lib/clayMotion.ts`, erzeugt von `scripts/gen-motion.js`.

## Dauer
press 120 · micro 180 · base 240 · sheet 320 · reveal 520. UI-Chrom bleibt unter 300 ms. Nur `transform` und `opacity` animieren.

## Web
Reanimated 4.2 setzt einblendende Views mit eigenen Startwerten auf dem Web nach der Animation auf `position: absolute`. Deshalb nutzt `rise()` auf dem Web die Standardkurve von FadeInDown ohne `withInitialValues`. Neue Einblendungen bitte über die Presets aus `src/theme`, nicht mit eigenen Startwerten.
