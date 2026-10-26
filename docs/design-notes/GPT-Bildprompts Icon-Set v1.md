# GPT-Bildprompts: Clay-Icon-Set v1, zerlegt für Animation

Stand 25.10.2026. Julians Auftrag: ein umfangreiches Icon-Set in Apple- und Airbnb-Qualität. Es deckt die heutigen Screens ab und auch spätere Anwendungsfälle. Jedes Icon ist so zerlegt, dass Claude daraus danach die Animationen baut.

Die sechs vorhandenen Icons bleiben gültig: Stethoskop, Yogamatte, Umschlag mit Euro, Kochtopf, Reisepass, Papier mit Stift. Sie werden aber im neuen Raster neu gerendert, damit am Ende alles aus einem Guss ist. Die 19 Icons aus der Liste von Richtung 7 sind hier mit enthalten.

## So läuft es ab

1. In GPT zuerst den **Stilblock** einfügen, dann den **Icon-Prompt**.
2. Ist das Icon gut, im selben Chat die **Zerlegungs-Prompts** für seine Teile schicken. Welche Teile es gibt, steht in der Spalte „Teile“.
3. Das erste wirklich gute Icon wird das **Referenzbild**. Allen weiteren Icons hängst du es an und schreibst dazu: „Match this reference exactly: same camera, same light, same materials, same scale.“
4. Dateien nach dem Namensschema unten speichern. Codex legt sie in `Design/Icons v1/` ab, ich animiere danach.

## Stilblock (immer voranstellen)

```
Premium 3D app icon object in the style of Apple's iOS 3D emoji and Airbnb's 2025 category icons. Soft matte clay material with subtle subsurface softness and very fine micro texture, rounded bevelled edges, no outlines, no text, no logos, no faces.
Camera: identical for every icon, three-quarter front view from slightly above (about 20 degrees), orthographic feel, no strong perspective distortion.
Light: one large soft key light from the upper left, gentle fill from the right, a very soft rim light, a small soft contact shadow directly under the object.
Palette: warm off-white #F7F4EE, sand #E9DCC6, dusty sage #A9BBA3, soft blush #F2C9C4, sky #C9D9E6, deep teal #075056 as the only strong accent. Never more than three colors per object.
Canvas: 1024 x 1024 px, fully transparent background (PNG with alpha). The object sits centered inside a 640 x 640 px safe area, with empty space around it.
One object only, simple and readable at 32 px, calm and friendly, not cute, no cartoon eyes.
```

## Zerlegungs-Prompts (für jedes Teil einzeln)

Diese drei Prompts schickst du direkt nach einem guten Icon, im selben Chat.

**A · Basis ohne bewegliche Teile**
```
Render exactly the same icon again, same camera, same light, same size and position on the 1024 canvas, but WITHOUT the [TEIL]. Fill the area where the [TEIL] was naturally, as if it was never there. Transparent background.
```

**B · Nur das bewegliche Teil**
```
Render ONLY the [TEIL] from this icon, exactly where it was on the 1024 canvas, same scale, same light and shadow direction, nothing else, transparent background. Do not move or resize it.
```

**C · Zweiter Zustand (nur wo in der Tabelle „Zustand“ steht)**
```
Render exactly the same icon, same camera and canvas position, but in this state: [ZUSTAND]. Transparent background.
```

Wichtig für die Animation: Die Teile müssen exakt auf der Position liegen, die sie im Gesamtbild haben. Ich lege sie übereinander und bewege nur das Teil. Verrutscht ein Teil, lieber neu erzeugen als selbst schieben.

## Dateinamen

- Ganzes Icon: `icon-<name>.png`
- Basis ohne Teile: `icon-<name>__base.png`
- Teil: `icon-<name>__<teil>.png`, zum Beispiel `icon-geschenk__deckel.png`
- Zweiter Zustand: `icon-<name>__state-<zustand>.png`

## Das Set

Die Tabellen sind nach Bereichen der App sortiert. Priorität A wird für den Start gebraucht, B für die ersten Monate danach und C für später. Die Spalte „Animation“ sagt, was ich daraus mache.

### 1 · Kern der App (Ring, Karten, Tag, Eingang)

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| A | jahresring | a flat rounded ring like a soft clay donut seen from above at an angle, sand colored, with one small teal bead sitting on the ring | perle | Perle läuft um den Ring |
| A | karten | a small stack of three rounded cards slightly fanned, cream, sage and blush | oberste-karte | oberste Karte wischt zur Seite |
| A | zwei-spuren | two soft rounded vertical pills side by side, blush and sky, with a small teal pill between them | mittlere-pille | Pille rutscht in die Lücke |
| A | eingang | a soft rounded wooden letter tray with two envelopes inside | oberer-brief | Brief gleitet hinein |
| A | magnet | a round fridge magnet in teal holding a small note | notiz | Notiz schwingt leicht |
| A | hand-nimmt | a soft rounded hand in sand color gently holding a small card | karte | Karte wird gegriffen |
| A | erledigt | a rounded teal check mark on a soft cream disc | haken | Haken zeichnet sich und ploppt |
| A | noch-offen | a soft cream disc with a small dashed ring, empty inside | ring | Ring dreht langsam |
| A | spaeter | a small rounded hourglass in sand and teal | sand | Glas dreht sich, Sand rieselt |
| A | kamera-scan | a compact rounded camera in cream with a teal lens | blitz (als Zustand) | Blitz blinkt |
| A | brief-gelesen | an open letter with a small soft teal highlighter lying on it | marker | Marker streicht über die Zeile |
| B | glocke | a small rounded bell in sand with a teal clapper | kloeppel | schwingt |
| B | sync | two rounded arrows forming a circle, sage | pfeile | dreht sich |
| B | link-abo | a rounded chain link of two soft loops, cream and teal | eine-schlaufe | Schlaufe hakt ein |
| B | schloss | a rounded padlock in sage with a teal shackle | buegel | Bügel klickt zu |

### 2 · Baby und Gesundheit

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| A | stethoskop | a pediatric stethoscope loosely coiled, teal tubing | bruststueck | Bruststück pendelt |
| A | impfung | a small rounded vaccine vial with a teal cap next to a round plaster | pflaster | Pflaster klebt sich auf |
| A | u-heft | a small yellow booklet with rounded corners, slightly open | seite | Seite blättert |
| A | flaeschchen | a small baby bottle with milk and a teal cap | milch (als Zustand: halb voll) | Milch schwappt |
| A | windeln | a neatly folded white baby diaper with a sage tab | lasche | Lasche klappt zu |
| A | kinderwagen | a small rounded baby stroller in sage | raeder | rollt vor und zurück |
| A | schnuller | a soft pacifier with a teal shield and cream handle | keins | wippt |
| B | thermometer | a rounded digital thermometer in cream with a small teal display, no numbers | anzeige (als Zustand: blush) | Anzeige färbt sich |
| B | medizin | a small amber medicine bottle with a measuring cup on top | becher | Becher hebt sich |
| B | zahn | a single soft rounded baby tooth, cream with a tiny sparkle | funkeln | funkelt |
| B | fussabdruck | a small baby footprint pressed into a soft clay disc | keins | Abdruck drückt sich ein |
| B | rassel | a baby rattle with a round sage head and cream handle | keins | rasselt |
| B | ultraschall | a small rounded ultrasound photo card with an abstract soft shape, no text | keins | taucht weich auf |
| B | hebamme | a rounded doctor's bag in sage with a small teal heart clasp | verschluss | Tasche öffnet sich |
| B | babyschale | a rounded infant car seat in sky with a sand handle | buegel | Bügel klappt |
| C | zahnarzt | a single large rounded tooth with a small toothbrush leaning on it | buerste | putzt hin und her |
| C | apotheke | a rounded pill box with a teal cross on the lid, no text | deckel | Deckel öffnet |
| C | brille | a pair of soft round glasses in sand | keins | blinzelt kurz |

### 3 · Ämter, Geld und Papiere

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| A | umschlag-euro | a soft rounded envelope with a small euro coin leaning on it | muenze | Münze rollt heran |
| A | reisepass | a small passport booklet in deep teal, closed | deckel (als Zustand: offen) | klappt auf |
| A | urkunde | a rolled certificate with a small teal ribbon | urkunde-offen (als Zustand) | rollt auf |
| A | kindergeld | a small stack of three rounded sand-colored coins | eine-muenze | Münze fällt auf den Stapel |
| A | amt | a small rounded town hall building with a clock, cream and teal | zeiger | Zeiger dreht |
| A | papier-stift | a sheet of paper with a small pencil lying diagonally | stift | Stift schreibt |
| A | frist | a small rounded desk calendar page with a teal corner fold | ecke | Ecke knickt um |
| B | krankenkasse | a rounded health insurance card in sage with a small cross, no text | keins | dreht sich |
| B | vertrag | a folded document with a small teal wax seal | siegel | Siegel drückt sich drauf |
| B | rechnung | a short receipt curling at the bottom, cream | keins | rollt sich aus |
| B | stempel | a rounded rubber stamp in teal with a wooden handle | stempel | stempelt |
| C | steuer | a small rounded calculator in sand, no digits | taste | Taste drückt |
| C | sparschwein | a soft rounded piggy bank in blush | muenze | Münze fällt hinein |
| C | versicherung | a small rounded umbrella in sky with a teal handle | schirm | Schirm spannt auf |

### 4 · Termine, Familie, Alltag

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| A | kalender | a small desk calendar with rings, blank page, teal top | blatt | Blatt blättert |
| A | uhr | a round soft alarm clock in cream with teal hands, no numbers | zeiger | Zeiger läuft |
| A | ort | a rounded map pin in teal on a soft sand disc | pin | Pin fällt und federt |
| A | telefon | a retro rounded phone receiver in sand color | keins | klingelt |
| A | chat | two soft rounded speech bubbles, cream and sage | zweite-blase | Blase ploppt auf |
| A | zuhause | a small rounded house with a warm lit window | fenster (als Zustand: dunkel) | Fenster geht an |
| A | kochtopf | a ceramic cooking pot with a lid and a wisp of steam | deckel, dampf | Deckel klappert, Dampf steigt |
| A | einkauf | a soft paper shopping bag with a baguette and a leaf of greens peeking out | keins | hüpft |
| A | geschenk | a small gift box with a teal ribbon | deckel | Deckel springt |
| A | geburtstag | a small round cake with one candle | flamme | Flamme flackert |
| A | einladung | a rounded invitation card standing upright with a small teal star | stern | Stern funkelt |
| B | paket | a small rounded cardboard parcel with a teal tape strip | klappe | Klappe öffnet |
| B | schluessel | a rounded house key in sand on a teal ring | keins | schwingt |
| B | waesche | a small stack of folded soft towels in sage and cream | oberstes-tuch | Tuch faltet sich |
| B | putzen | a rounded spray bottle in sky with a sage nozzle | spruehnebel | sprüht |
| B | muell | a small rounded bin in sage with a lid | deckel | Deckel klappt |
| B | handwerker | a rounded hammer and wrench crossed, sand and teal | hammer | klopft |
| B | auto | a small rounded family car in sky | raeder | wippt und rollt |
| C | haustier | a rounded pet bowl in blush with a small bone shape | knochen | hüpft |
| C | tierarzt | a rounded paw print on a soft sage disc | keins | drückt sich ein |
| C | pflanze | a small potted plant with three round leaves | blaetter | wiegen sich |

### 5 · Kita, Schule, Freizeit (eine Quelle unter vielen)

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| B | kita | a small rounded building block tower, three blocks in sage, blush and sand | oberer-block | Block plumpst drauf |
| B | rucksack | a small rounded kids backpack in sky with a teal zip | keins | wippt |
| B | schwimmen | a soft rounded swim ring in blush and cream | keins | schaukelt auf Wellen |
| B | musik | a small rounded drum with two sticks | sticks | trommeln |
| C | schule | a rounded school cone (Schultüte) in teal with a cream top | keins | dreht sich leicht |
| C | ball | a soft rounded ball in sage and cream | keins | hüpft |
| C | buch | a small closed picture book in sand with a teal spine | deckel | klappt auf |

### 6 · Reise und Wetter (für das Wochenwetter)

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| A | reise | a small rounded suitcase in teal with a sand handle | keins | rollt |
| B | flugzeug | a soft rounded toy airplane in cream with teal wings | keins | schwebt |
| B | sonne | a soft round sun in warm sand with short rounded rays | strahlen | Strahlen drehen |
| B | wolke | a soft round cloud in cream | keins | treibt |
| B | wolke-sonne | a soft cloud partly covering a sand sun | sonne | Sonne lugt hervor |
| B | regen | a soft cloud with three rounded sky-blue drops | tropfen | Tropfen fallen |
| B | gewitter | a soft grey-sage cloud with a rounded teal lightning bolt | blitz | Blitz zuckt |
| B | mond | a soft crescent moon with a tiny star | stern | schaukelt, Stern funkelt |

### 7 · Babybuch und Erinnerungen (später)

| Prio | Name | Objekt-Prompt | Teile | Animation |
|---|---|---|---|---|
| C | babybuch | a small rounded photo album in blush with a teal ribbon bookmark | deckel | klappt auf |
| C | foto | a small instant photo with a soft abstract landscape, no people | keins | fällt und dreht sich |
| C | herz | a soft rounded heart in blush | keins | pocht |
| C | massband | a soft rolled measuring tape in sand and teal, no numbers | band | rollt aus |
| C | waage | a small rounded baby scale in cream with a sage tray | schale | wippt |

Das sind 88 Icons: 37 mit Priorität A, 34 mit B und 17 mit C. Für den Start reichen die 37 A-Icons.

## Zustände und Leerflächen (optional, gleiche Machart)

| Name | Objekt-Prompt |
|---|---|
| leer-alles-erledigt | a small cozy cushion in sage with a cream blanket folded on it |
| fehler | a soft rounded cream cone with a small teal stripe, like a tiny traffic cone |
| offline | a soft cloud in cream with a small teal unplugged cable end |
| neu | a small rounded teal sparkle with four soft points |

## Prüfen, bevor ein Icon ins Set kommt

- **Kamera und Licht:** Lege es neben das Referenzbild. Licht von oben links, gleiche Höhe, gleicher Schatten. Wenn nicht, neu erzeugen.
- **Größe:** Das Objekt bleibt im inneren Feld von 640 × 640 px.
- **Farben:** Höchstens drei aus der Palette, Teal nur als Akzent.
- **Kein Text:** Keine Zahlen, keine Fantasiebuchstaben auf Pass, Kalender oder Karte.
- **Lesbarkeit:** Auf 32 px verkleinern. Erkennt man das Objekt noch, ist es gut.
- **Teile:** Basis plus Teil übereinandergelegt müssen genau das ganze Icon ergeben.

## Was ich danach daraus mache

Ich baue die Animationen mit den Bewegungsregeln, die wir schon nutzen: Feder-Kurve, kurze Dauer von 0,4 bis 1,2 Sekunden, und jede Animation endet ruhig. Pro Icon gibt es drei Varianten:

- **Auftritt:** Das Icon erscheint einmal, wenn ein Screen aufgeht.
- **Bestätigung:** Ein kurzer Moment, wenn etwas erledigt oder übernommen wird.
- **Ruhe:** Eine sehr leise Schleife, nur für den Startscreen und Leerflächen.

Alles läuft als CSS- oder Lottie-Animation über die Einzelteile, ohne Video. Damit bleibt die App leicht, und „Bewegung reduzieren“ in iOS und Android wird respektiert.
