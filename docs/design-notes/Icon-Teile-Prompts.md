# GPT-Image-Prompts: Einzelteile für 98 Icons

Stand 31.10.2026. Julians Auftrag nach dem Icon-Review: Teile, die eigentlich getrennt sind (Schläger und Ball, Trommel und Stöcke), dürfen nie als ein Bild animiert werden. Diese 98 Icons sind heute ein einziges Bild, bei dem alle Teile über den Schatten zusammenhängen. Ich kann sie nicht sauber ausschneiden. Bis die Teile da sind, tippen sie in der App nur leicht an (kein falsches Hüpfen).

## So läuft es ab

1. Neuer GPT-Chat. Den **Stilblock** aus `GPT-Bildprompts Icon-Set v1.md` einfügen.
2. Das alte Icon als Referenz anhängen (liegt als PNG im Projektordner `icon-teile/referenz/`) und schreiben:
   `Re-render this exact icon at 1024 x 1024 with the style block above. Same object, same colors, same composition. [Hinweis aus der Tabelle, falls einer da steht]`
3. Ist das Ganze gut, im selben Chat für jedes Teil aus der Spalte „Teile“ einzeln:
   - **A** (einmal pro Icon): `Render exactly the same icon again, same camera, same light, same size and position on the 1024 canvas, but WITHOUT the [TEILE]. Fill the area naturally, as if they were never there. Transparent background.`
   - **B** (pro Teil): `Render ONLY the [TEIL] from this icon, exactly where it was on the 1024 canvas, same scale, same light, keep its own small contact shadow, nothing else, transparent background. Do not move or resize it.`
   - **C** (nur wo ein Zustand steht): `Render exactly the same icon, same camera and canvas position, but in this state: [ZUSTAND]. Transparent background.`
4. Dateien so benennen: `icon-<name>.png`, `icon-<name>__base.png`, `icon-<name>__<teil>.png`, `icon-<name>__state-<zustand>.png`.
5. Einfach hier im Chat hochladen, gern mehrere auf einmal. Ich prüfe die Passgenauigkeit, verkleinere, baue die Animation und zeige sie auf der Review-Seite.

Wichtig: Jedes Teil muss exakt dort liegen, wo es im Gesamtbild liegt. Verrutscht etwas, lieber neu erzeugen. Ein Teil, das sich bewegt, braucht seine eigene Rückseite nicht, aber die Basis darunter muss vollständig sein (zum Beispiel der Kasten ohne Deckel mit sichtbarer Öffnung).

## Priorität A: Icons mit deinem Feedback und sehr häufige

| Icon | Neu rendern | Teile | Animation |
|---|---|---|---|
| batterie | **Ja.** Nur EINE stehende Batterie, Hülle aus off-white, Pol oben teal. Innen ein sichtbares Fenster mit drei Ladesegmenten. | `huelle` (leer, Fenster sichtbar), `segment-1`, `segment-2`, `segment-3` (sage, von unten nach oben) | lädt auf: Segmente füllen sich nacheinander von unten, kleiner Glanz am Ende |
| badminton | nein | `schlaeger`, `federball` | Schläger holt aus, trifft, Federball fliegt mit Drall raus und segelt zurück |
| benachrichtigung-stumm | nein | `glocke`, `strich` | Glocke klingelt kurz, Strich zieht sich diagonal darüber und die Glocke verstummt |
| blutprobe | **Ja.** Röhrchen leer und durchsichtig, Blut als eigenes Teil. | `roehrchen` (leer), `blut` (Füllung bis 70 %), Zustand `state-leer` | Blut steigt von unten im Röhrchen hoch, Deckel federt kurz |
| boule | nein | `kugel-1` (hinten), `kugel-2` (vorn), `schweinchen` (kleine Kugel) | Kugel rollt ins Bild, stupst das Schweinchen, das ein Stück weiterrollt |
| bowling | nein | `kugel`, `kegel` | Kugel rollt rein, Kegel kippt um und richtet sich wackelnd wieder auf |
| brei | nein | `schale`, `loeffel`, Zustand `state-ruehren` optional | Löffel rührt zwei Runden in der Schale |
| briefkasten | nein | `kasten` (mit offener Klappe), `klappe`, `brief`, `fahne` | Brief schiebt sich hinein, Klappe schließt, Fahne klappt hoch |
| brotdose | nein | `dose` (offen, Inhalt sichtbar), `deckel` | Deckel hebt ab, kippt nach hinten, klappt wieder zu |
| buch | nein | Zustand `state-offen` (aufgeschlagen, Seiten sichtbar), `deckel` | Buch klappt auf, eine Seite blättert, klappt zu |
| cafe | nein | `tasse` (mit Untertasse), `dampf` (zwei weiche Schwaden, sky) | Dampf steigt auf und löst sich, Tasse dreht sich minimal |
| checkliste | nein | `brett` (ohne Haken, Zeilen sichtbar), `haken-1`, `haken-2`, `haken-3` | Haken zeichnen sich nacheinander |
| cricket | nein | `schlaeger`, `ball` | Schlag aus dem Griff, Ball fliegt im Bogen |
| darts | nein | `scheibe`, `pfeil` | Pfeil fliegt von rechts ein, steckt, zittert nach |
| eingang | Teile vorhanden, aber **neu**: Fach in zwei Ebenen | `fach-hinten`, `fach-vorne`, `brief` | Brief fällt IN das Fach (zwischen hinten und vorne), nicht dahinter |
| einkauf | nein | `tuete` (leer, offen), `baguette`, `salat` | Teile fliegen einzeln nacheinander in die Tüte, Tüte federt |
| abgabe | nein | `ablage`, `zettel` | Zettel hebt ab und landet sanft in der Ablage |
| abendessen | nein | `teller`, `haube` | Haube hebt sich, kurzer Dampfstoß, senkt sich |
| musik | nein | `trommel`, `stock-1`, `stock-2` | Stöcke schlagen abwechselnd, Fell federt |
| tischtennis | nein | `schlaeger`, `ball` | wie Tennis: Schläger schlägt, Ball springt einmal auf |
| golf | nein | `schlaeger`, `ball` | Schwung, Ball rollt weg |
| hockey | nein | `schlaeger`, `ball` | Schlag, Ball rutscht weg |
| heckenschere | nein | `griff-links` (mit Klinge), `griff-rechts` (mit Klinge) | schneidet zweimal (Klingen öffnen und schließen am Gelenk) |
| friseur | nein | `kamm`, `schere-links`, `schere-rechts` | Schere schnippt zweimal, Kamm ruht |
| wolke-sonne | nein | `wolke`, `sonne` | Sonne lugt hinter der Wolke hervor, Wolke zieht ein Stück |
| regen | nein | `wolke`, `tropfen-1`, `tropfen-2`, `tropfen-3` | Tropfen fallen versetzt, Wolke atmet |
| gewitter | nein | `wolke`, `blitz` | Blitz zuckt zweimal, Wolke zittert |

## Priorität B: Alltag, Familie, Gesundheit

| Icon | Teile | Animation |
|---|---|---|
| allergie | `box`, `tuch`, `pollen` | Tuch zupft sich hoch, Pollen schwebt |
| altglas | `kiste`, `flasche-1`, `flasche-2` | Flaschen klirren nacheinander hinein |
| apotheke | `dose`, `deckel` | Deckel klappt auf und zu |
| babybuch | `buch` (Zustand `state-offen`), `bild` | Buch klappt auf, Bild hebt sich |
| babyphone | `geraet`, `antenne`, `wellen` (neu, zwei Bögen sky) | Wellen pulsieren raus, Antenne wippt |
| bibliothek | `regal`, `buch-1`, `buch-2`, `buch-3` | ein Buch wird herausgezogen und zurückgestellt |
| blutdruck | `geraet`, `manschette`, `anzeige` | Manschette pumpt, Anzeige leuchtet |
| boxen | `handschuh-links`, `handschuh-rechts` | Doppelschlag, abwechselnd |
| elternabend | `stuhl-1`, `stuhl-2`, `stuhl-3` | Stühle rücken nacheinander zusammen |
| fechten | `maske`, `degen` | Degen sticht vor (Ausfall) |
| federmappe | `etui`, `deckel`, `stifte` | Deckel klappt auf, Stifte heben sich |
| fensterputzen | `fenster`, `abzieher` | Abzieher wischt einmal quer, Glanzstreifen |
| fruehstueck | `teller`, `toast`, `ei` | Toast hüpft hoch wie aus dem Toaster |
| geschirrspueler | `maschine`, `klappe`, `korb` | Klappe öffnet, Korb fährt raus |
| gesellschaftsspiel | `figur-1`, `figur-2`, `wuerfel` | Würfel rollt, Figur zieht ein Feld |
| gruppe | `person-links`, `person-mitte`, `person-rechts` | Personen tauchen nacheinander auf |
| haendewaschen | `spender`, `pumpkopf`, `seife`, `blasen` (neu) | Pumpe drückt, Blasen steigen |
| hausaufgaben | `heft`, `stift` | Stift schreibt eine Zeile |
| haustier | `napf`, `knochen` | Knochen fällt in den Napf |
| hochstuhl | `stuhl`, `tablett` | Tablett klappt runter |
| hoergeraet | `geraet`, `wellen` (neu) | Schallwellen pulsieren |
| homeoffice | `haus`, `laptop` | Laptop klappt auf, Bildschirm leuchtet |
| kampfsport | `anzug`, `guertel` | Gürtel zieht sich fest |
| krankenhaus | `gebaeude`, `kreuz` | Kreuz pulsiert |
| kruecken | `kruecke-links`, `kruecke-rechts` | gehen abwechselnd einen Schritt |
| laptop | `unterteil`, `deckel` | klappt auf |
| link-abo | `glied-1`, `glied-2` | Glieder klicken ineinander |
| manikuere | `flasche`, `deckel`, `feile` | Feile streicht zweimal |
| massage | `liege`, `handtuch` | Handtuch legt sich auf |
| massband | `rolle`, `band` | Band rollt aus und zurück |
| meeting | `tisch`, `stuhl-links`, `stuhl-rechts` | Stühle rücken ran |
| mikrofon | `mikro`, `wellen` (neu) | Wellen pulsieren beim Sprechen |
| milchpumpe | `pumpe`, `flasche`, `milch` | Milch steigt in der Flasche |
| mittagessen | `teller`, `brokkoli`, `fisch` | Teile landen nacheinander |
| monatsplan | `kalender`, `blatt` | Blatt blättert um |
| nahrungsergaenzung | `dose`, `deckel`, `kapsel` | Deckel auf, Kapsel hüpft raus |
| notizblock | `block`, `blatt` | oberstes Blatt blättert um |
| onlinekurs | `monitor`, `play` | Play drückt sich und pulsiert |
| ordner | `ordner` (Zustand `state-offen`), `reiter` | Ordner klappt auf, Reiter hebt sich |
| pflanze | `topf`, `blaetter` | Blätter wiegen sich, wachsen ein Stück |
| physiotherapie | `matte`, `rolle` | Rolle rollt über die Matte |
| pilates | `ring`, `ball` | Ring wird zusammengedrückt, Ball rollt |
| praesentation | `staffelei`, `balken-1`, `balken-2`, `balken-3` | Balken wachsen nacheinander |
| prioritaet | `stange`, `fahne` | Fahne weht |
| pruefung | `blatt` (ohne Haken), `haken`, `stift` | Stift zeichnet den Haken |
| puzzle | `teil-1`, `teil-2`, `teil-3` | letztes Teil rastet ein |
| rechnung | `papier` (Zustand `state-eingerollt`) | Rechnung rollt sich aus |
| rudern | `ruder-links`, `ruder-rechts` | Ruder ziehen gleichzeitig durch |
| saeen | `tuete`, `keim`, `samen` | Samen fallen, Keim wächst |
| sandkasten | `kasten`, `eimer`, `schaufel` | Schaufel gräbt, Eimer wippt |
| schreibtisch | `tisch`, `lampe` | Lampe knickt und leuchtet |
| schultafel | `tafel`, `schrift` (neu, weiße Kreidestriche) | Kreide schreibt |
| schwangerschaftstest | `test`, `strich-2` | zweiter Strich erscheint langsam |
| ski | `ski-links`, `ski-rechts` | Skier kreuzen und parallel |
| sparschwein | `schwein`, `muenze` | Münze fällt in den Schlitz, Schwein wackelt |
| spielplatz | `rutsche`, `ball` (neu) | Ball rutscht runter |
| sprachkurs | `blase-1`, `blase-2`, `pfeil` | Blasen tauschen, Pfeil zeichnet sich |
| staubsauger | `geraet`, `rohr` | Rohr saugt vor und zurück |
| steuer | `rechner`, `taste` | Taste drückt sich |
| stoppuhr | `uhr`, `zeiger`, `knopf` | Knopf drückt, Zeiger läuft eine Runde |
| tagesplan | `block`, `blatt` | blättert um |
| tanzen | `schuh-links`, `schuh-rechts`, `band` | Schuhe drehen sich |
| teilen | `knoten-1`, `knoten-2`, `knoten-3`, `linien` | Knoten poppen nacheinander |
| termin-hinzufuegen | `kalender`, `plus` | Plus poppt und dreht |
| ultraschall | `monitor`, `baby` | Bild flackert an |
| umzug | `karton-1`, `karton-2` (mit Deckel) | Kartons stapeln sich |
| verband | `rolle`, `band` | Band wickelt sich ab |
| waeschestaender | `staender`, `handtuch` | Handtuch weht |
| werkzeugkasten | `kasten`, `deckel` | Deckel klappt auf |
| wochenplan | `kalender`, `markierung` | Markierung springt zum Tag |
| yogamatte | `matte` (Zustand `state-ausgerollt`) | Matte rollt aus |
| zahnarzt | `zahn`, `buerste` | Bürste putzt hin und her |

## Upgrades für Icons, die schon animiert sind

Diese bewegen sich heute schon gut als Ganzes. Mit Teilen werden sie noch besser, haben aber keine Eile.

| Icon | Teile | Animation |
|---|---|---|
| laufrad, radfahren, rollstuhl, rasenmaeher | `rad-vorne`, `rad-hinten` | Räder drehen sich beim Rollen |
| tee, cafe | `dampf` | Dampf steigt |
| bohrmaschine | `bohrer` | Bohrer dreht |
| abschluss | `quaste` | Quaste schwingt nach dem Fangen |
| kanu | `paddel` | Paddel zieht |
| augenuntersuchung | `lid` | echtes Lid statt Stauchen |
