# Changelog

Alle sichtbaren Änderungen an FamCal. Neueste oben. Agenten und Menschen: Änderung unter **Unreleased** in einfacher Sprache eintragen.

## Unreleased

### Echte App: Anmelden, gemeinsamer Kalender, Sprechen mit Claude (27.10.)

- Anmelden mit Apple oder Google, ohne Passwort. Danach startest du eure Familie oder gibst den Code deines Partners ein und teilt denselben Kalender.
- Termine liegen in Supabase und erscheinen sofort auf beiden Handys. Jede Familie sieht nur ihre eigenen Daten.
- Das Mikro hört in der App direkt auf dem Handy zu, der Ton verlässt das Gerät nicht. Den Satz liest Claude und macht daraus den Termin mit Datum, Uhrzeit, wer und wo. Ohne Netz übernehmen die bisherigen Regeln.
- Umzug von bestehenden Kalendern: in der echten App übernimmt „Kalender auf diesem Handy“ eure Termine der nächsten zwölf Monate aus iCloud, Google oder Outlook in FamCal, für beide sichtbar. Arbeit bleibt ein privater Block auf deinem Handy. Zweimal übernehmen legt nichts doppelt an.
- In der echten App gilt das echte Datum. Der Testlink bleibt beim Beispieltag 29. Oktober und braucht kein Konto.
- Deutsch und Englisch von Anfang an: die App folgt der Sprache des Handys. Kalender, Listen, Sprechleiste, Anmelden, Onboarding, Einstellungen und Plus gibt es in beiden Sprachen. Englische Sätze wie „Julia has the dentist Friday at 3pm“ oder „every Tuesday 7pm“ werden verstanden, auch ohne Claude. Uhrzeiten stehen auf Englisch als 3pm. Im Testlink zeigt „#en“ am Ende des Links die englische Fassung.
- Plus kostet 79 € im Jahr oder 8,99 € im Monat, die ersten 1.000 Familien zahlen im ersten Jahr 49 €. Eingeladene Familienmitglieder sind immer gratis.
- Einstellungen in der echten App: Familiencode zum Kopieren und Abmelden. Der Bereich Prototyp bleibt nur im Testlink.
- Neuer Termin startet in der echten App leer auf heute statt mit dem Beispiel U5.
- Noch auf Deutsch: Chat, Wissen, Entwurf, Foto, Infozettel, Meilensteine und die Vorlagen der Packlisten. Die kommen mit dem neuen Zielbild.

### Kalender scrollt endlos, Tabs weichen der Tastatur (27.10.)

- Monat: das Raster nutzt die Höhe des Bildschirms, die Icons sitzen frei in ihrer Kachel, weitere Termine stehen als „+3“ darunter statt daneben. Heute ist grün, der gewählte Tag hat den Rahmen.
- Woche: seitlich wischen oder die Pfeile wechseln zur vorigen und nächsten Woche, die neue gleitet von der Seite herein. Mit zwei Fingern oder Plus und Minus zoomen: größer zeigt die Uhrzeiten, ganz groß drei Tage mit vollen Titeln.
- Heute ist in der Wochenleiste farbig, der Rahmen um die ganze Kachel zeigt den Tag im Blick und gleitet mit. Wer woanders ist, bekommt oben einen „Heute“ Knopf, der zurückspringt.
- Wie in der Claude App: auf dem Handy macht die Eingabetaste eine neue Zeile, abgeschickt wird mit dem Pfeil. Mit echter Tastatur schickt Enter ab. Der Pfeil springt beim Antippen nicht mehr weg.
- Kalender Tag: Titel, Umschalter und Wochenleiste bleiben oben stehen, nur die Tage scrollen. Die Leiste zeigt mit ihrem Rahmen den Tag, den man gerade sieht, und gleitet in die nächste Woche, wenn man sie erreicht. Die Liste geht endlos weiter, freie Tage sind eine ruhige Zeile, jede Woche beginnt mit einer Trennlinie. Tippen auf einen Tag scrollt dorthin.
- Beim Tippen ins Sprechfeld verschwinden die Tabs, das Feld sitzt direkt über der Tastatur.
- Listen: die Icons in den Tabs haben Platz zum Springen und werden nicht mehr abgeschnitten.
- Datum mit Monatsnamen wird verstanden („Am 12. November Zahnarzt um 10“), auch wenn Tag und Uhrzeit getrennt stehen.

### Eingabe und Ablauf wie in einer Chat App (27.10.)

- Das Textfeld wächst mit dem Text nach oben, bis vier Zeilen, danach scrollt es. Enter schickt ab, Shift und Enter macht eine neue Zeile.
- Während der Assistent arbeitet, steht der ganze Plan als Aufgabenliste unter der Kugel: oben der Satz, darunter jeder Schritt, der laufende dreht sich, fertige bekommen einen Haken.

### Sprechen überall, Kalender als Startansicht (27.10.)

- Ein Sprechfeld für die ganze App. Es weiß, wo ihr seid: im Kalender wird ein Satz zum Termin oder zur Antwort, auf einem Termin ändert er diesen Termin, auf einer Liste füllt er diese Liste, beim Anlegen baut er die neue Liste.
- Termin per Stimme: wer geht, was mitkommt, eine Stunde später, neuer Tag oder Ort, absagen mit Rückgängig.
- Listen per Stimme: mehrere Dinge auf einmal, Mengen werden zusammengeführt, Doppeltes wird erkannt.
- Nach jeder Änderung fliegt die Kugel genau an die geänderte Stelle und die leuchtet kurz auf.
- Heute Tab entfernt, der Kalender ist die Startansicht. Jeder Tag ist eine Karte mit Terminen, darunter Mitbringen, Aufgaben und Fristen.

### Pivot 26.10.: ein gemeinsamer Kalender, mit dem ihr redet
- Heute ist jetzt der sprechende Kalender. Unten ein Feld mit Foto, Text und Mikro wie in einer Chat App. Wo ein Chat seinen Verlauf zeigt, steht euer Kalender für die nächsten sieben Tage.
- Ein Satz wird ein Termin für die richtige Person: „Tom bringt Ben Dienstag 10 Uhr zur Krabbelgruppe“, „Erstelle mir einen Termin für Freitag bei meinem Kinderarzt“. Ohne Uhrzeit fragt er nach, ohne Person fragt er, wer geht. Rückgängig geht immer.
- Er sagt, woher er etwas weiß: die Adresse vom Kinderarzt kommt aus dem letzten Termin dort. Er warnt, wenn sich etwas beißt („Tom arbeitet da bis 14:00“).
- Fragen bekommen Antworten aus dem Kalender: „Wann haben wir beide frei?“ (Arbeit schon abgezogen), „Was steht am Wochenende an?“, „Wann ist die U5?“, „Wer bringt Ben zur U6?“.
- Die Glaskugel: beim Zuhören sitzt sie im Mikroknopf. Danach wächst sie als Welle über den ganzen Bildschirm, in den Farben von euch beiden, und zeigt ihre Denkschritte. Am Ende zieht sie sich zu einem Tropfen zusammen, der an seinen Tag fliegt, dort leuchtet der neue Termin kurz auf.
- Im Testlink ist das Mikro gesperrt. Dann spricht die App einen Beispielsatz und sagt das auch.
- Babyjahr ist optional: ohne Kind geht es nach „Zu zweit“ direkt zum Kalender. Das Intro beginnt jetzt mit „Sag es einfach“.
- Noch ohne Sprachmodell: das Verstehen sind feste Regeln in src/lib/talk.ts.

### Kommentare vom 26.10. abends
- Termin: ein anderes Symbol aus der Auswahl wird jetzt übernommen. Vorher ging die Wahl verloren. Die Herkunft zeigt nicht mehr doppelt „Aus: Aus“.
- Icons in Zeilen und Listen nochmals größer: Zeilen 46 statt 34, Listenpunkte 42 statt 30, Kacheln füllen 90 statt 78 Prozent.
- Clay Icons füllen ihre Fläche jetzt aus und wirken überall etwa ein Drittel größer. Die Bilder hatten rund ein Drittel leeren Rand.
- Neues Intro: fünf kurze Szenen statt einer Schleife. Post vom Amt, Foto und fertig, für euch beide, weiß was bei euch gilt, dann das Versprechen. Läuft einmal, Tippen springt weiter, Balken oben zeigen den Stand.
- Einkauf ergänzen: das Eingabefeld sitzt unten am Daumen und fährt mit der Tastatur hoch, Treffer erscheinen direkt darüber.
- Listen: Tabs sind so breit wie ihr Name, scrollen seitlich und der gewählte rückt ins Bild. Eigene Listen lassen sich unten mit „Liste löschen“ entfernen, mit Rückgängig.
- Termin: ohne Ort zeigt der Termin kein leeres Feld mehr, nur „+ Ort oder Notiz“.
- Foto: der Beispielbrief hat echten Text statt grauer Balken, und die Kamera sagt ehrlich, dass im Testlink ein Beispielbrief liegt.

### Jede Stadt kennt ihr Bundesland, Geburtsdatum mit Jahr
- „Wo wohnt ihr?“ kennt alle 10.942 Gemeinden aus dem Gemeindeverzeichnis des Statistischen Bundesamts (Stand 2017). Beim Tippen kommen Vorschläge mit Bundesland, darunter steht zum Beispiel „Fürth liegt in Bayern“. Gibt es den Ort mehrmals, reicht ein Tipp auf „Nein, Fürth in Hessen“.
- Das Bundesland beim Kind ist damit vorausgewählt. Der Stadt Schritt zeigt für nicht geprüfte Orte wenigstens die Feiertage des Landes.
- Erstes Jahr: abgehakte Termine bleiben mit Haken stehen und zeigen „erledigt“. Im Web Link läuft die Liste ohne Layout Animation, die in mobilem Safari Zeilen verschieben kann. Der Assistenten Funke ist neu gezeichnet.
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
