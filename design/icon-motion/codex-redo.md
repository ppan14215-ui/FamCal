# Icons v1: Nachbesserung für Codex (Julians Bewertung, 25.10.2026)

29 freigegeben, 24 "Nochmal", 7 noch offen (einladung, hebamme, jahresring, karten, magnet, muell, u-heft).
Animation wird in der App gebaut. Hier steht nur, was am Render selbst geändert werden muss.

## Mit Julians Notiz, Render ändern
- **eingang**: "Brief sollte in die Box, nicht dahinter". Fach als zwei Ebenen liefern: `fach-hinten` und `fach-vorne` (Vorder- und rechte Seitenwand), dazwischen der Brief.
- **kalender**: "Dreieck-Korpus hinter dem Kalender sieht komisch aus". Aufsteller entfernen oder als flachen Fuß.
- **kindergeld**: "sieht nicht nach Münze aus". Münzen mit Prägung (Euro-Zeichen, Rand), nicht als glatte Scheiben.
- **kinderwagen**: "Räder kaputt, Animation schlecht". Räder sauber rund und als eigene Ebene `raeder-vorne`, `raeder-hinten`.
- **hand-nimmt**: "Hand greift nicht". Hand offen und geschlossen als zwei Zustände (`state-offen`, `state-greift`), Karte separat.
- **einkauf**: "Inhalt soll sich mitbewegen". Tasche und Inhalt (Gemüse/Baguette) als getrennte Ebenen.
- **noch-offen**: "eiert, komisches Icon". Neues Motiv, kein schräger Ring.
- **geschenk**: "kann optimiert werden". Deckel mit Schleife sauber als eigene Ebene, Box ohne Lücke darunter.

## Bereits in der Animation behoben (kein neuer Render nötig)
kochtopf (doppelter Dampf), papier-stift (zu langsam), spaeter (sprang), flaeschchen (Milch sprang), erledigt (Glanz über dem Haken entfernt).

## Ohne Notiz auf "Nochmal" (Julian fragen oder neu rendern)
amt, auto, babyschale, frist, kita, paket, schloss, schluessel, stempel, ultraschall, urkunde, zwei-spuren.
