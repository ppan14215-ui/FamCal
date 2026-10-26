# GPT-Bildprompts für Richtung 6 „Ruhig“ (v2, Bleistiftskizze)

**Was sich geändert hat (Julian, 24.10.):** Die erste Version mit dem 3D-Knet-Eichhörnchen war „viel zu verspielt“ und „hat nichts mehr mit den schönen Illustrationen aus dem Reference Design zu tun“.

Maßstab ist jetzt wieder die Peekly-Referenz „Parents Care“. Die Datei liegt im Vault unter `Family Bot/04 Onboarding & Mockups/v2 Notion-Stil/reference.png`.

Dort sieht man eine einzige ruhige Bleistiftszene oben auf dem Screen. Die Familie sitzt von hinten auf einer Bank, Landschaft, Sonne, ein Baum. Alles ist Graphit auf warmem Papier, ohne Farbe, ohne Gesichter und ohne Niedlichkeit.

**Folgen für die Screens:**
- Die Listenzeilen bekommen keine Bilder. Sie bekommen dünne Linien-Icons wie in der Referenz, also Kalender, Pille, Dokument und Personen. Die zeichne ich selbst, GPT braucht es dafür nicht.
- GPT macht nur die wenigen Szenen-Illustrationen.

Kopiere zuerst den Stilblock, dann den jeweiligen Prompt dahinter. Wenn ein Bild gut ist, gib es GPT als Referenz zurück und schreib dazu: „same drawing style, same paper, same line weight“.

## Stilblock (immer voranstellen)

```
Delicate hand-drawn graphite pencil sketch on warm off-white paper (#F4F1EA). Fine, light line work with soft cross-hatching for shading, like a quiet illustration in a picture book for adults or a museum sketchbook. Monochrome grey-brown graphite only, no color, no ink outlines, no digital gradients. Calm, nostalgic, understated. People and animals are seen from behind or at a distance, no detailed faces, no cartoon features, no big eyes, no smiles. Lots of empty paper around the scene. Wide landscape format 16:9, the scene sits in the middle and fades out softly at the edges. No text, no logos, no frame.
```

## 1 · Willkommen (Platzhalter „GPT-Bild 1“)

```
A young couple seen from behind, sitting on a simple wooden bench on a gentle hill; the mother holds a small baby wrapped in a blanket against her shoulder, the father has his arm around her. Soft rolling fields, a low sun, one tree on the right with fine leaves. Peaceful early evening mood.
```

## 2 · Assistent (Platzhalter „GPT-Bild 2“)

Das Eichhörnchen bleibt, aber als echte Tierskizze und nicht als Figur. Es soll aussehen wie ein Eichhörnchen in einem Naturskizzenbuch.

```
A small, realistic red squirrel sketched in profile, sitting calmly on a low branch, holding a single folded letter in its front paws as if about to read it. Natural anatomy, fine fur suggested with a few light pencil strokes, bushy tail drawn with loose hatching. Quiet, attentive, not cute, not anthropomorphic, no clothes, no facial expression. A few leaves around it, otherwise empty paper. Square 1:1.
```

## 3 · Leerzustand „Alles erledigt“

```
The same realistic squirrel sketched curled up asleep in a small nest of leaves in the fork of a tree, tail wrapped around its body. Very calm, mostly empty paper. Square 1:1.
```

## 4 · Kalender verbinden und Familienadresse (Onboarding 5 und 6, optional)

```
A simple wooden kitchen table seen from slightly above with an open paper calendar, a cup of tea and a few envelopes; a small baby sock lies next to the cup. Soft window light from the left suggested by hatching.
```

## 5 · Plus und Store (optional)

```
A family of three seen from behind walking along a quiet country path towards a small house with a garden, the father carries the baby in a carrier, the mother holds a basket. Wide open sky, birds far away.
```

## Prüfen, bevor ein Bild auf den Canvas kommt

- **Nur Graphit:** Wenn GPT Farbe, Tinte oder Aquarell einbaut, neu erzeugen.
- **Keine Niedlichkeit:** Große Augen, Lächeln, Pausbacken oder Kleidung am Tier bedeuten, dass das Bild falsch ist.
- **Papierton:** Der Hintergrund soll ungefähr #F4F1EA sein. Ich lege das Bild auf eine Karte in derselben Farbe, wie bei Peekly.
- **Kein Text:** GPT schreibt gern Fantasiewörter auf Briefe und Kalender. Neu erzeugen oder wegretuschieren.

---

# Variante A zum Vergleich: Clay-Icons (Julian, 24.10.: „die Icons gefallen mir doch ganz gut“)

Diese Variante kommt für den Vergleich wieder dazu. Es geht nur um die Objekt-Icons in den Listenzeilen, nicht um das Knet-Eichhörnchen.

## Stilblock Clay

```
Soft, minimal 3D illustration in the style of Apple's iOS 3D emoji and premium productivity-app icons. Matte clay-like materials with subtle subsurface softness, rounded edges, gentle single key light from the upper left, very soft contact shadow, no outlines, no text, no logos. Muted, calm palette: warm off-white, soft sand, dusty sage, deep teal #075056 as the only strong color. Plain background in exactly #F5F5F4 (or transparent PNG). Single object icon, centered, 1:1, object fills about 60% of the frame.
```

## Objekte

| Zeile | Objekt-Prompt |
|---|---|
| U-Untersuchung, Arzt | a pediatric stethoscope loosely coiled, teal tubing |
| Rückbildung | a rolled yoga mat in dusty sage |
| Elterngeld | a soft rounded envelope with a small euro coin leaning on it |
| Oma kommt | a ceramic cooking pot with a lid and a wisp of steam |
| Kinderreisepass | a small passport booklet in deep teal, closed |
| Absage, Entwurf | a sheet of paper with a small pencil lying diagonally |

Für den Vergleich reichen diese sechs Icons.

---

# Richtung 7 „Ruhig × Clay“: die fehlenden 19 Icons (Julian, 24.10.: Clay gewählt)

Verwende den Stilblock Clay von oben. Mach jedes Icon einzeln, oder alle als ein Sheet, das ich zuschneide:

```
A sheet of 20 separate clay icons on a 5x4 grid with generous even spacing, each object centered in its cell, identical lighting and materials, no labels, transparent or #F5F5F4 background.
```

Dateinamen für Codex: `icon-<name>_v01.png` nach `Design/Richtung 6 Ruhig/Illustrationen/Clay-Icons/`.

**Damit ich sie animieren kann:** Bei den mit ✂ markierten Icons bitte das bewegliche Teil zusätzlich einzeln rendern, gleiche Perspektive, transparent.

| Name | Kategorie | Objekt-Prompt | Animation |
|---|---|---|---|
| impfung | Impfung | a small rounded vaccine vial with a teal cap next to a round plaster | Pflaster klebt sich |
| u-heft | U-Heft | a small yellow booklet with rounded corners, slightly open | blättert |
| urkunde | Geburtsurkunde, Verträge | a rolled certificate with a small teal ribbon | rollt auf ✂ (Urkunde ausgerollt) |
| kindergeld | Kindergeld | a small stack of three rounded sand-colored coins | Münze fällt drauf ✂ (eine Münze einzeln) |
| einkauf | Einkauf | a soft paper shopping bag with a baguette and a leaf of greens peeking out | hüpft |
| windeln | Windeln | a neatly folded white baby diaper with a sage tab | faltet sich |
| flaeschchen | Fläschchen, Milch | a small baby bottle with milk and a teal cap | schwappt |
| kalender | Termin | a small desk calendar with rings, blank page, teal top | Blatt blättert ✂ (ein Blatt einzeln) |
| aufgabe | Aufgabe | a rounded teal check mark on a soft cream disc | ploppt |
| telefon | Anruf | a retro rounded phone receiver in sand color | klingelt |
| geschenk | Geschenk, Einladung | a small gift box with a teal ribbon | Deckel springt ✂ (Deckel einzeln) |
| geburtstag | Geburtstag | a small round cake with one candle | Flamme flackert |
| foto | Foto, Scan | a compact rounded camera in cream with a teal lens | Blitz |
| amt | Amt, Behörde | a small rounded town hall building with a clock, cream and teal | Uhrzeiger dreht ✂ (Zeiger einzeln) |
| krankenkasse | Krankenkasse | a rounded health insurance card in sage with a small cross, no text | dreht sich |
| reise | Reise, Urlaub | a small rounded suitcase in teal with a sand handle | rollt |
| kinderwagen | Spaziergang, Baby | a small rounded baby stroller in sage | rollt hin und her |
| schlaf | Schlaf, Ruhe | a soft crescent moon with a tiny star | schaukelt |
| zuhause | Familie, Zuhause | a small rounded house with a warm lit window | Fenster leuchtet |
