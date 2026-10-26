# Airbnb-Designprinzipien, übertragen auf den Familienassistenten (Richtung 7.3)

Stand 24.10.2026. Grundlage sind Airbnbs Design Language System (DLS) mit den Prinzipien Unified, Universal, Iconic und Conversational, dazu der App-Relaunch 2025 mit 3D-Icons und animierten Icons.

## Was Airbnb macht

- **Zurückhaltung.** Es gibt eine Schrift und neutrale Grautöne. Die Akzentfarbe (Rausch-Rot) erscheint fast nur auf der Hauptaktion.
- **Tiefe ohne Schatten.** Fotos und Weißraum tragen die Fläche. Es gibt höchstens eine Erhöhungsstufe.
- **Weiche Radien.** Buttons haben 8–12 px, Karten 12–20 px, die Suche ist eine Pille, Steuerelemente sind Kreise. Alles liegt auf einem 4-px-Raster.
- **Listing-Karte.** Das Bild ist die Karte, ohne Rahmen und ohne Schatten. Links oben sitzt ein Badge, rechts oben das Herz, der Text steht darunter.
- **3D-Icons sparsam.** Sie stehen nur für die Top-Kategorien (Unterkünfte, Erlebnisse, Services) in einer Leiste mit Unterstrich. Sonst gibt es Linien-Icons.
- **Bewegung als Gespräch.** Icons reagieren auf Tippen, etwa die Glocke, die klingelt. Bewegung bestätigt etwas und ist keine Dekoration.
- **Reise als Tagesplan.** Das Itinerary listet Tag für Tag mit Zeitachse.

## Unsere Regeln (umgesetzt in Clay3-*)

1. 3D-Clay nur für Kategorien und den Hero eines Screens, kleine UI mit Linien-Icons.
2. Ein Akzent `#0B6B6B`, nur für die Hauptaktion und den aktiven Tab. Orange steht nur für Fristen.
3. Keine Schatten. Tiefe kommt aus der getönten Objektkachel und aus Weißraum, Linien in `#EBEBEB`.
4. Eine Kategorie-Leiste (Termine, Aufgaben, Fristen, Dokumente) mit Clay-Icons und Unterstrich statt Segment-Control.
5. Karten wie Listings: Die Objektkachel trägt die Karte, Badge links oben („Als Nächstes“, „Frist“), Person rechts oben.
6. Eine Suchpille „Was steht an?“ als Einstieg zum Assistenten, statt Plus-Button.
7. Der Kalender ist ein Tagesplan mit Zeitachse.
8. Ein Termin ist wie eine Listing-Detailseite aufgebaut: großes Objekt oben, Abschnitte mit Linien, unten eine feste Leiste mit „Erinnern“.
9. Der Eingang sieht aus wie Airbnb-Nachrichten, mit Filter-Chips (Alle, Rückfragen, Erledigt).
10. Bewegung nur bei Tippen oder Statuswechsel. Die aktive Kategorie spielt einmal ab.
11. Eine Schrift (Geist), Hierarchie nur über Gewicht. Radien 12, 18 und Pille.

## Offen

- Die 19 fehlenden Clay-Icons, damit die Kategorie-Leiste und alle Karten echte Objekte haben.
- Ob die Suchpille im Test als Assistent verstanden wird oder als reine Suche.
