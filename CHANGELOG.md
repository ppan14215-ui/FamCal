# Changelog

Alle sichtbaren Änderungen an FamCal. Neueste oben. Agenten und Menschen: Änderung unter **Unreleased** in einfacher Sprache eintragen.

## Unreleased

### Jede Stadt kennt ihr Bundesland, Geburtsdatum mit Jahr
- „Wo wohnt ihr?“ kennt alle 10.942 Gemeinden aus dem Gemeindeverzeichnis des Statistischen Bundesamts (Stand 2017). Beim Tippen kommen Vorschläge mit Bundesland, darunter steht zum Beispiel „Fürth liegt in Bayern“. Gibt es den Ort mehrmals, reicht ein Tipp auf „Nein, Fürth in Hessen“.
- Das Bundesland beim Kind ist damit vorausgewählt. Der Stadt Schritt zeigt für nicht geprüfte Orte wenigstens die Feiertage des Landes.
- „Zu zweit“ nimmt die Farbe des Partners an: Hintergrund und Punkt im Titel wechseln mit, sobald sie gewählt ist.
- Geburtstag und errechneter Termin haben ein eigenes Datumsfeld: eintippen wie „14.9.2022“ oder „14. September 2022“, oder im Kalender erst Jahr, dann Monat, dann Tag wählen. Vier Jahre zurück sind drei Tipps. Keine Uhrzeiten mehr als Beispiele.

### Echte Kalender vom Handy
- In der App liest FamCal jetzt die Kalender, die schon auf dem Handy sind (iCloud, Google, Outlook) über expo-calendar. Ihr wählt pro Konto, welche erscheinen, und wem sie gehören. Arbeitskalender erscheinen nur als gestreifter Block, Feiertage kommen nach Bundesland dazu. FamCal liest nur und schreibt nichts zurück.
- Im Web Testlink bleibt die Anmeldung simuliert, dort gibt es keine Gerätekalender.
- Einstellungen zeigen die wirklich verbundenen Kalender und führen zur Auswahl zurück. Der Titel zeigt eure Namen statt „Familie Huber“.

### Stadt, Assistent mit Quellen, alles bearbeitbar
- Onboarding fragt zuerst Namen und Stadt. Danach zeigt „Das gilt in Köln“, was der Assistent nachgeschlagen hat (Kita-Portal, Bürgeramt, Feiertage), jeweils mit Quelle. Im Prototyp geprüft für Köln, München, Düsseldorf, Berlin und Hamburg. Das Bundesland kommt aus der Stadt.
- Die Karte „Kita-Platz anfragen“ nennt das Portal der Stadt und verlinkt es (Köln: LITTLE BIRD).
- Termin beim Bürgeramt für einen Pass: der Assistent schreibt die Mitbringliste dazu und markiert jede Zeile mit „Vom Assistenten ergänzt“ und der Quelle.
- Termine sind komplett bearbeitbar: Symbol, Titel, Ort, Tag und Zeit, wer hingeht und jede Zeile der Mitbringliste samt wer sie mitbringt. Nach links wischen löscht eine Zeile, mit Rückgängig.
- Listen: das Icon des gewählten Tabs spielt seine Animation.
- Wer kümmert sich: das Icon auf der Karte lehnt sich beim Wischen mit und spielt ab der Schwelle seine Animation.

### Erster Start, echte Eingaben, Bewegung
- Die App startet komplett leer, wie beim allerersten Öffnen. Die Beispielfamilie gibt es über „Ich wurde eingeladen“ oder in den Einstellungen.
- Neues Intro auf dem ersten Screen: Brief, Stethoskop und Einkaufstüte landen nacheinander in einer ruhigen Heute-Karte. Antippen springt zum Ende.
- Eure Kinder: Name mit Platzhalter, Geburtstag oder errechneter Termin per Schreibzeile oder Kalender, Bundesland als Auswahlliste. Daraus entsteht das erste Jahr (U-Untersuchungen, Impfungen, Elterngeld, Kindergeld, Kita).
- Wann-Feld als Schreibzeile: Text wie „Do 15 Uhr“ oder „jeden Di 19-20:30“ wird verstanden, „Kalender“ schaltet auf das Monatsraster, das Gerät merkt sich die Wahl.
- Kalender verbinden: Anmelden, gefundene Kalender auswählen, Besitzer wählen, übernehmen. Termine, Arbeitsblöcke und Feiertage nach Bundesland erscheinen danach. Die Anmeldung ist im Prototyp noch simuliert.
- Farben im Partner-Screen lassen sich wirklich ändern. Avatare zeigen den ersten Buchstaben des eingetragenen Namens.
- „Alle anzeigen“ im ersten Jahr klappt die Liste an Ort und Stelle auf.
- Abhaken bewegt das Icon: jedes Clay-Icon spielt seine eigene kleine Geschichte.
- Bewegung nach den Namore-Prinzipien auf allen Screens (siehe docs/MOTION.md). Gesten wie bei Namore: Entscheidung beim Loslassen, Schwung bleibt erhalten.
- Heute zeigt auch überfällige Aufgaben und hat einen Hinweis, wenn noch nichts da ist.
- Web: Einblendungen verschieben das Layout nicht mehr.

### Live-Prototyp mit allen Canvas-Screens
- Expo-App mit dem Namore-Stack: Onboarding (7 Schritte bis zum Kartenstapel), Heute, Kalender mit Tag, Woche, Monat und Jahresring, Listen (Aufgaben, Einkauf, Kliniktasche, Geschenke, neue Liste), Eingang mit Neu und Dokumente, Erfassen per Foto, Termin anlegen und ansehen, Symbolauswahl, Aufteilen, Entwürfe, Assistent mit „Was ich weiß“, Einstellungen, Plus und drei Demos (Sperrbildschirm, Teilen aus dem Chat, Widgets).
- Echte Gesten: Haken mit Haptik, nach links wischen löscht mit Rückgängig, Text antippen bearbeitet die Zeile (Menge und Notiz aus „2 Hafermilch, ungesüßt“), Person antippen wechselt Tom, Julia, niemand, Karten nach links zu Julia und nach rechts zu Tom, Jahresring halten, ziehen, loslassen.
- Beispieldaten von Julia, Tom und Ben. Heute ist fest Do 29. Oktober 2026, 8:50. Wochentage gegen den echten Kalender geprüft, dabei Laternenbasteln auf Sa 14. Nov korrigiert (der 15. ist ein Sonntag).
- Web-Version als einzelne HTML-Datei zum Testen am Handy (`npm run artifact`).
