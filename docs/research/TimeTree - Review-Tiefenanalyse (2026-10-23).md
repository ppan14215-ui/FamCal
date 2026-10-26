# TimeTree – Review-Tiefenanalyse (2026-10-23)

*Für: Family Bot (Arbeitstitel). Erstellt am 23.10.2026. Datenbasis: 3.380 Store-Reviews aus 2025–2026 (App Store DE/US, Google Play DE/US). Davon habe ich 926 gelesen, den Rest per Schlagwort-Regeln gezählt.*

---

## Kurzfazit

1. TimeTree wird fast nur für **eine** Sache geliebt: Partner und Familie sehen denselben Kalender. Das steckt in ~40 % aller 4–5★-Reviews, in ~57 % der ausführlichen. Danach folgt „einfach“ (~21 %).
2. Die Beschwerden kommen meist von **langjährigen Nutzern, die es nicht mehr ertragen**. Drei Auslöser: autoplay-Videowerbung **mit Ton** (seit ~Okt 2025), das UI-Update im **Feb 2026** (Notizen/Einkaufsliste und Suche versteckt) und **kein Export bzw. keine Zwei-Wege-Sync** (Lock-in).
3. Im Feb 2026 waren **44 % aller Reviews 1–2★**, im Schnitt 2025 waren es ~14 %. Das ist der klarste Bruch im Datensatz.
4. **Design-These: nur teilweise gestützt.** Über die *Optik* (hässlich, altbacken) klagt fast niemand, das sind < 1 % (geschätzt). Viele loben TimeTree sogar als „cute/aesthetic/clean“. Belegt ist dagegen der Ärger über **Unruhe**: Werbung, versteckte Funktionen, dauernde Umbauten. Etwa jede vierte Negativ-Review betrifft Navigation, Übersicht oder Bedienung.
5. Für Family Bot heißt das: Das Argument heißt nicht „schöner als TimeTree“, sondern **ruhig, werbefrei, verlässlich, ohne Lock-in, ein Abo für die ganze Familie**. Dazu kommt, was TimeTree gar nicht kann: Listen und Aufgaben, die offen bleiben, bis jemand sie erledigt.

---

## Basisdaten

Live abgerufen am 23.10.2026.

| Kennzahl | Wert | Quelle |
|---|---|---|
| App Store DE | **4,74★ bei 99.796 Bewertungen** | iTunes Lookup API, id 952578473 (App-ID verifiziert: „TimeTree: Gemeinsamer Kalender“, TimeTree, Inc.) |
| App Store US | **4,85★ bei 92.903 Bewertungen** | iTunes Lookup API |
| Google Play DE | **4,5★, ~236–240 Tsd. Rezensionen**, 10 Mio.+ Downloads | Play-Store-Seite `works.jubilee.timetree`, hl=de |
| Google Play US | **4,7★, ~232–236 Tsd. Reviews**, 10M+ Downloads | Play-Store-Seite, hl=en_US |
| Aktuelle Version | 15.33.0 vom 20.10.2026, ab iOS 18 | iTunes Lookup |
| Premium-Preis | **2,99 €/Monat bzw. 29,99 €/Jahr** (US: 4,49 $ / 44,99 $). Erster Monat gratis. **Pro Account, kein Familien- oder Sharing-Plan** | TimeTree Help Center, timetreeapp.com/premium |
| Premium enthält | Werbefreiheit, Dateianhänge, vertikale Stundenansicht, Termine pinnen/sortieren, Support | timetreeapp.com/premium |
| Nutzer laut Firma | 67–68 Mio. registriert, 13 Mrd. gespeicherte Termine (Herbst 2025). Store-Text: „75 Mio.“ | PR TIMES 05.11.2025, KEPPLE 26.09.2025, App-Store-Text |

**Unternehmen und News 2025–2026**

- **Eigentümer:** TimeTree, Inc. (Tokio) ist weiter eigenständig und VC-finanziert. CEO ist Taito Fukagawa (深川泰斗). Im Jan 2025 wurde TimeTree Korea gegründet.
- **Sep 2025:** Kapital- und Geschäftsallianz mit **SK Telecom**. SKT investiert 2,2 Mrd. ¥, Ziel sind KI-Funktionen auf Basis der Termindaten. Genannt werden außerdem Kontakte zu Deutsche Telekom, T-Mobile und NTT Docomo.
- **Nov 2025:** **Series F** abgeschlossen, Lead-Investor SK Telecom. Rund 1,6 Mrd. ¥ sind neues Kapital, inklusive Secondary-Anteilen ~3,2 Mrd. ¥. Insgesamt wurden bisher **6,7 Mrd. ¥** eingesammelt. Bewertung laut INITIAL ~23,6 Mrd. ¥ (≈ 150 Mio. €, *Fremdangabe*). Ein Börsengang gilt als „starke Option“.
- **Pivot zu KI und Werbung:**
  - 15.01.2026: Die Datenschutzerklärung erlaubt jetzt die Analyse per LLM. Laut TimeTree werden keine Daten fürs Training genutzt.
  - 16.04.2026: weitere Änderung der Datenschutzerklärung.
  - 31.07.2026: Ein-/Aus-Schalter für KI-Vorschläge.
  - Feb 2026: Ein Berater für „agentische Werbung“ wird verpflichtet.
  - Werbung ist das Kerngeschäft („TimeTree Ads“, u. a. „Target Day“-Anzeigen).
- **Produkt:**
  - Jan 2025: „Calendar Chat“ eingestellt.
  - Feb 2026: großes UI-Update mit neuer Kalender-Navigation, Memos wandern in den jeweiligen Kalender.
  - 2025/26: Termin-Scan per Foto (neu: über das Teilen-Menü).
  - Jul 2026: Google-Login.
  - Aug 2026: Dark Mode im Web.
  - Jan 2026: höhere Mindest-OS-Version, ältere Geräte fallen raus.
- **Umsatz (nur Schätzungen, nicht verifiziert):**
  - Sensor Tower: ~200 Tsd. $/Monat App-Store-Umsatz weltweit.
  - apptomy: Japan ~250 Tsd. $/Monat (Spanne 76 Tsd.–1 Mio. $, „low confidence“).
  - Owler: ~12,5 Mio. $/Jahr Gesamtumsatz.
  - Belegt ist nur der Bilanzverlust: Laut Jahresabschluss zum 31.08.2024 beträgt der kumulierte Verlust −3,42 Mrd. ¥.

---

## Methode

**Korpus.** Die Rohdaten liegen auf Julians Mac, Stand der Abzüge 22.10.2026: `raw/timetree-appstore.jsonl` und `raw/timetree-play.jsonl`. Ich habe nur gelesen und nichts geschrieben. Gefiltert auf 01.01.2025–20.10.2026, Länder DE und US:

| Quelle | n | Hinweis |
|---|---|---|
| App Store DE | 500 | RSS liefert nur die neuesten 500 (15.05.2025–Okt 2026) |
| App Store US | 500 | ab 29.03.2025 |
| Google Play DE | 1.159 | |
| Google Play US | 1.221 | |
| **Summe** | **3.380** | |

**Sterne:** 4–5★: 2.531 (74,9 %) · 3★: 253 (7,5 %) · 1–2★: 596 (17,6 %). Die Store-Schnitte (4,5–4,85) liegen höher, weil dort viele Bewertungen ohne Text mitzählen.

**Gelesen:**
- **alle 596** Reviews mit 1–2★ (Text gekürzt auf ~220–330 Zeichen)
- 220 zufällige Reviews mit 4–5★ und mehr als 70 Zeichen
- 110 zufällige Reviews mit 3★
- alle 121 positiven Reviews mit Design-Begriffen

Zusammen sind das **926 gelesene Reviews**.

**Zählung.** Die Cluster habe ich mit Schlagwort-Regeln (Regex, DE und EN) über alle 3.380 Reviews gezählt. Die Regeln habe ich gebaut, nachdem ich die Reviews gelesen hatte, und auf Fehltreffer geprüft. Die Zählung ist **selbst gezählt, aber regelbasiert**. Rechne mit ±10–20 % Unschärfe pro Cluster. Mehrfachnennungen sind möglich. Wo ich von Hand zusammengefasst habe, steht „(Schätzung)“.

**Grenzen:**
- Die Shares im App Store sind auf neuere Reviews verzerrt, weil das RSS nur die letzten 500 liefert.
- Trustpilot, Reddit und Capterra habe ich nur qualitativ angeschaut, nicht gezählt.

---

## Lob-Cluster

Basis sind 2.531 Reviews mit 4–5★. In Klammern steht der Anteil unter den 1.396 ausführlichen Reviews (> 70 Zeichen).

| # | Cluster | Anzahl | Anteil | Anteil ausführlich |
|---|---|---|---|---|
| 1 | **Teilen mit Partner, Familie, Freunden, Team** | 1.017 | **40 %** | 57 % |
| | davon Partner/Ehe explizit genannt | 568 | 22 % | 35 % |
| 2 | **Einfach, intuitiv, unkompliziert** | 538 | **21 %** | 25 % |
| 3 | Farben/Labels pro Person | 185 | 7 % | 13 % |
| 4 | „Übersicht / alles im Blick“ | 160 | 6 % | 8 % |
| 5 | Kostenlos bzw. viel ohne Premium | 155 | 6 % | 10 % |
| 6 | Erinnerungen und Benachrichtigungen | 123 | 5 % | 8 % |
| 7 | Optik: „cute/aesthetic/clean“, Sticker, Deko | ~60 explizit (Schätzung, aus 121 Treffern) | ~2 % | – |
| 8 | Memos/Notizen als Einkaufs- und To-do-Liste | 87 | 3 % | 6 % |
| 9 | Plattformübergreifend (iPhone + Android) | 24 | 1 % | 2 % |
| 10 | Termin-Scan per Foto | 14 | < 1 % | 1 % |
| – | **Japanische Herkunft** | **0 positive Nennungen** | 0 % | – |

**1 · Teilen ist der Kern.** Der Partner trägt selbst ein, und keiner muss mehr nachfragen.

> „Endlich bin ich nicht mehr die Sekretärin meines Mannes und er schafft es selbständig Termine auszumachen ohne dass ich danach alles umplanen oder nach Babysitter schauen muss.“ (Google Play DE, 15.06.2025, 5★)

> „Einfach genial und mein Mann muss nicht mal mehr mit mir reden und ich weiß trotzdem wo er ist.“ (App Store DE, 10.03.2026, 5★)

> „Great to connect my wife's iPhone and my Android with a single shareable calendar.“ (Google Play US, 20.12.2025, 5★)

**2 · Einfach, und zwar vor dem Februar-Update.**

> „Bestens – genau das was ich gesucht habe. Einfach zu bedienen, mit nur den nötigsten Dingen…“ (App Store DE, 15.03.2026, 5★)

> „Super simple and easy to use … a simple, not over the top calendar with minimalist graphics.“ (Google Play US, 23.02.2026, 5★)

**3 · Farben pro Person.** Dazu gibt es viele Wünsche nach mehr als 10 Labels.

> „We have 5 people in our household and I assigned each person a color … it has been a life saver!“ (Google Play US, 03.05.2025, 5★)

**7 · Die Optik wird eher gelobt als kritisiert, vor allem von jüngeren Nutzerinnen in den USA.**

> „I love how aesthetic the app is! 💕“ (App Store US, 29.08.2026, 5★)

> „This is better than Google Calendar and it's so aesthetic and clean to organize your events.“ (App Store US, 26.07.2026, 5★)

> „Super übersichtlich, intuitiv, schön gestaltet.“ (App Store DE, 08.01.2026, 5★)

**8 · Memos als geteilte Einkaufsliste.** Das ist eine heimliche Kernfunktion, wie die Beschwerden unten zeigen.

> „Wir organisieren uns komplett über die App inkl. Einkaufszettel.“ (Google Play DE, 30.04.2026, 4★)

**Japanische Herkunft:** Kein einziger Nutzer nennt sie als Grund. „Japan“ taucht nur als Reiseziel auf, und dort beim Zeitzonen-Bug. Als Marketing-Aspekt ist das irrelevant.

---

## Beschwerde-Cluster

Basis sind 596 Reviews mit 1–2★, alle gelesen und regelbasiert gezählt.

| # | Cluster | Anzahl | Anteil an 1–2★ |
|---|---|---|---|
| 1 | **Werbung** | 135 | **23 %** |
| | davon Video-Werbung mit Ton/Autoplay | 73 | 12 % |
| | davon unangemessen (sexualisiert, Clickbait, Krypto) | 8 | 1 % |
| 2 | **UI-Umbau, Navigation, „früher war es besser“** | ~113 | **19 %** |
| | Memos/Notizen versteckt oder weg | 49 | 8 % |
| | Kalender wechseln, falscher Kalender, Kalender vermischt | 25 | 4 % |
| | Suche entfernt bzw. versteckt | 22 | 4 % |
| 3 | **Sync, Import, Export, Lock-in** (Google/Outlook/iOS/ICS) | 99 | **17 %** |
| | davon „kein Export, man kommt nicht raus“ explizit | 30 | 5 % |
| 4 | Paywall, Preis, Abo | 63 | 11 % |
| | „lieber Einmalkauf als Abo“ | 15 | 3 % |
| | „Abo nur pro Person, kein Familienplan“ | 6 | 1 % |
| | Widget hinter Paywall | 5 | 1 % |
| 5 | Allgemein unübersichtlich, kompliziert, verschachtelt (nicht an ein Update gebunden) | ~38 (Schätzung) | ~6 % |
| 6 | Bugs, Abstürze, Serverfehler | 57 | 10 % |
| 7 | Datenverlust (alle Termine weg, Duplikate) | 31–37 | ~6 % |
| 8 | KI und Datenschutz (neue AGB, KI-Zwang, Tracking) | 34 | 6 % |
| | davon KI explizit (Peak Jul–Sep 2026) | 20 | 3 % |
| 9 | Alte Geräte nicht mehr unterstützt (Jan 2026) | 33 | 6 % |
| 10 | Login/Konto | 26 | 4 % |
| 11 | **Partner sieht meine Termine nicht** (Shared-Sync-Fehler) | 22 | 4 % |
| 12 | Widget | 20 | 3 % |
| 13 | Benachrichtigungen (fehlen oder zu viele) | 17 | 3 % |
| 14 | Support | 16 | 3 % |
| 15 | Zeitzonen verschieben Termine | 6 | 1 % |

**Zeitverlauf.** 1–2★-Reviews pro Monat:

| Zeitraum | 1–2★ | Reviews gesamt | Anteil |
|---|---|---|---|
| Schnitt 2025 | 240 | 1.756 | 13,7 % |
| Jan 2026 | 66 | 257 | 26 % |
| **Feb 2026** | **117** | **267** | **44 %** |
| Mär 2026 | 40 | 204 | 20 % |
| Apr–Okt 2026 | – | – | ~15–17 % |

Im Feb 2026 kamen zwei Dinge zusammen: das UI-Update und die Welle der Video-Werbung mit Ton.

**1 · Werbung mit Ton ist der klare Abwanderungs-Trigger.**

> „Ich sitze in einer Besprechung und checke einen Termin… und TimeTree spielt mit Ton und sehr laut eine Werbung ab!“ (Google Play DE, 16.05.2026, 1★)

> „Will in der Arztpraxis meinen Termin eintragen und beschalle plötzlich den gesamten Warteraum…“ (Google Play US, deutschsprachige Review, 27.02.2026, 1★)

> „Not Family Friendly Ads! Several inappropriate ads have appeared and there is no way to change the type of ads unless you buy the no ad version.“ (Google Play US, 13.10.2026, 1★)

**2 · Der UI-Umbau im Februar 2026.** Memos und Einkaufsliste rutschen in Untermenüs, die Suche verschwindet.

> „Newest update is bad; memos are now buried, and that was core functionality for our family. Shared to do lists, shopping lists, chore charts …“ (Google Play US, 17.02.2026, 1★)

> „Ich habe selten eine App gesehen, die so konsequent mit jedem Update schlechter und schlechter wird. Funktionen verschieben sich, mal da, dann da, dann wieder zurück …“ (Google Play DE, 03.02.2026, 2★)

> „Not loving the new design – It's a little crowded and too much going on. I use this app because its simple.“ (App Store US, 20.01.2026, 1★)

**3 · Sync und Lock-in.** Rein geht es, raus nicht.

> „Missing widgets, synchronization problems and the inability to export/share calendar items with the native iOS calendar is the reason I will have to … manually copy all my calendar items … and then delete TimeTree.“ (App Store DE, englischsprachig, 03.10.2026, 1★)

> „Keinerlei Integrationsmöglichkeiten und damit eine Sackgasse. Ich nutze TimeTree seit Jahren und dachte immer, das kommt bestimmt bald.“ (App Store DE, 15.05.2025, 1★)

> „It does not have the ability to export into my work calendar. I'm having to switch back-and-forth between calendars to determine if I can take a meeting.“ (App Store US, 24.03.2026, 1★)

**4 · Paywall und Preis.** Abo statt Einmalkauf, und jede Person zahlt einzeln.

> „With this app being a shared calendar app it makes no sense that there isn't a family plan … it's $45 a year per person.“ (App Store US, 14.05.2026, 2★)

> „Ich bezahle gewiss keine 60 € für mich und meine Frau jedes [Jahr].“ (Google Play DE, 14.05.2026, 1★)

> „Ohne Werbung nur als Abo. Ich würde für die App einmalig bezahlen.“ (Google Play DE, 06.07.2026, 1★)

**7 · Datenverlust.** Das ist der GAU für eine Familien-App.

> „Seit 48 Stunden sind alle Termine in unserem Familienkalender verschwunden … da viele medizinische Werte dort über das Jahr gesammelt wurden. Auch nach mehrmaligen Anschreiben, keine Hilfe.“ (Google Play DE, 27.09.2026, 1★)

> „Nach dem Update zur V.15.22.1 am 26.07.2026 sind alle Termine verschwunden … Dasselbe Problem hatten wir in der Familie schon zweimal.“ (App Store DE, 26.07.2026, 1★)

**8 · KI-Ablehnung.** Für Family Bot ist das relevant.

> „uninstalled because of the addition of ai. a calendar app does not need ai.“ (Google Play US, 22.09.2026, 1★)

> „Mit den neuen Bedingungen … KI darf alles nutzen und an Dritte werden die Daten auch weiter gegeben … wenn man nicht zustimmt kann man den Dienst nicht mehr nutzen.“ (Google Play DE, 05.06.2026, 1★)

> „When you opt out of personalized ai features, it just doesn't save your preferences!“ (App Store US, 31.08.2026, 1★)

**11 · Der Partner sieht meine Termine nicht.** Damit fällt das Kernversprechen.

> „Kalender updatet nicht alles, somit trag ich was ein und meine Frau sieht es nicht. Katastrophe!“ (Google Play DE, 28.08.2026, 1★)

> „Constantly unsyncs itself and my wife and I have to manually update almost daily to ensure our calendars match.“ (App Store US, 08.09.2026, 1★)

### Erinnerungen, Aufgaben, Partner (Spezialfrage)

- **Memos sind die heimliche Aufgaben- und Einkaufsliste.** 49 Negativ-Reviews (8 %) drehen sich nur darum, dass sie schwerer erreichbar sind. Viele sagen ausdrücklich „das war der Grund, warum wir die App haben“.
  > „The WHOLE reason I got this is because of the shared shopping list function, now it's just a shared calendar which is useless to me.“ (Google Play US, 04.02.2026, 1★)
- **Echte To-dos fehlen oder sind kaputt.** Erledigt-Status wird nicht gespeichert, bei wiederkehrenden Terminen werden alle Instanzen abgehakt, Listen löschen sich.
  > „The to do list feature just doesn't work. It does not remember which items were marked as done … rarely manages to share task status with other users.“ (Google Play US, 31.12.2025, 2★)

  > „Die Listen löschen sich ständig. Für Einkäufe etc. absoluter Frustfaktor.“ (Google Play DE, 29.06.2026, 3★)
- **Erinnerungen** sind klein, aber kritisch. Ein Teil verpasst Termine, weil Erinnerungen ausbleiben. Ein anderer Teil bekommt zu viele, nämlich jede Erinnerung für jedes Familienmitglied.
  > „Habe schon mehrmals einen Termin verpasst, weil ich keine Benachrichtigung bekommen habe. Obwohl die alle aktiviert sind.“ (Google Play DE, 17.10.2026, 1★)

  > „Jeder bekommt von jedem die Erinnerung – das ist umständlich und nervig.“ (Google Play DE, 20.07.2025, 1★)
- **Wünsche:** Essensplan, „eine Familienlizenz“, Erinnerungen für wiederkehrende Haushaltsaufgaben, „sehen, von wem ein Termin ist“.

---

## Design-These: gestützt oder nicht?

**Julians These:** TimeTree ist unschön, und es gibt Platz für eine schön gestaltete, saubere Alternative.

### Was die Daten sagen

| Art der Design-Kritik | Anzahl (2025–26, DE+US) | Bewertung |
|---|---|---|
| **Ästhetik** („hässlich“, „trist“, „outdated“, Schrift zu klein, Icon hässlich, iPad wirkt klobig) | ~25–30 in allen 3.380 Reviews (Schätzung), **< 1 %**. Unter 1–2★ ~10 | **Kaum vorhanden.** |
| **Struktur**: „unübersichtlich, verschachtelte Menüs, zu viele Klicks“, unabhängig von einem Update | ~38 von 596 Negativen (~6 %, Schätzung) | Real, aber klein |
| **Änderungs-Chaos**: Update verschiebt Funktionen, Memos/Suche weg | ~113 von 596 (19 %) | **Groß**, aber es geht um Stabilität und Gewohnheit, nicht um Schönheit |
| **Werbung zerstört das Bild** („ads make the calendar hideous“, „half the UI is covered“) | Teil der 135 Werbe-Beschwerden | Groß. Visuelle Unruhe kommt von der Werbung |
| **Gegenstimmen: Optik positiv** („cute“, „aesthetic“, „clean“, „schön gestaltet“) | ~60 explizit | Mehr Lob als Tadel |
| **Gegenstimmen: wollen mehr Deko** (Sticker, Hintergründe, Animationen zurück) | ~25 (Schätzung) | Ein Teil der Zielgruppe will mehr Verspieltheit |

**Bezeichnende Stimmen:**

> „Optik könnte etwas zeitgemäßer sein, funktional passt es aber.“ (App Store DE, 12.10.2026, 5★)

Das ist die einzige klare Stimme aus DE, die genau Julians Punkt trifft, und sie vergibt trotzdem 5★.

> „Integration einfach, aber Design sehr trist. Eine Funktion das Design zu ändern oder zumindest den Hintergrund wäre wirklich sinnvoll.“ (Google Play DE, 21.01.2026, 3★)

> „I don't like the minimalist stuff and also did they get rid of memos???“ (App Store US, 27.02.2026, 3★)

> „Used to be able to change the background … also looked nicer. Now it's just boring and plain.“ (Google Play US, 12.02.2025, 2★)

> „I really don't like the appearance. Red text for day of month for Sunday … Day of month text is tiny.“ (Google Play US, 19.09.2026, 2★)

**Fremde Einschätzungen bestätigen das:**
- Reddit: „landed on timetree mostly because the interface is nicer and my wife liked the little sticker things“.
- Capterra: „I really prefer the aesthetic of the app“.
- Konkurrent Sense AI: „one of the cleaner shared calendars out there“.

### Urteil

- **Die These „TimeTree sieht schlecht aus“ ist nicht gestützt.** Das ist überwiegend Julians Geschmack. Die Mehrheit findet TimeTree „einfach“ und teils „cute“. Notion-artiger Minimalismus wird von einem Teil der TimeTree-Basis sogar abgelehnt („boring and plain“, „don't like the minimalist stuff“).
- **Eine umformulierte These ist stark gestützt:** „TimeTree ist laut, unruhig und unberechenbar geworden.“ Grund sind Werbung (mit Ton), wechselnde Navigation, versteckte Kernfunktionen und KI-Zwang. Zusammen machen Werbung und Umbau-Chaos **~40 % aller 1–2★-Reviews** aus (mit Überschneidung). Die Botschaft „ruhig, aufgeräumt, bleibt, wie es ist“ trifft einen echten Schmerz.
- **Kurz:** Kein Design-Problem, sondern ein **Ruhe- und Vertrauens-Problem**. Clean Design hilft, wenn es als **„keine Werbung, kein Lärm, nichts verschwindet“** verkauft wird, nicht als „schöner“.

---

## Was heißt das für Family Bot?

### Do

1. **Zwei-Personen-Kern zuerst.** Partner sieht sofort, was ich eintrage, mit sichtbarem Sync-Status („bei Anna angekommen ✓“). Shared-Sync-Fehler und Datenverlust (~10 %) sind das, was Familien am wenigsten verzeihen.
2. **Ein Abo für den ganzen Haushalt.** „Pro Person zahlen“ ist ein wiederkehrender Hassgrund. Prüfen: Einmalkauf oder Lifetime-Option (15 Nennungen „lieber einmal zahlen“).
3. **Keine Werbung, nie.** Das ist der größte Einzelgrund für Wechsel. „Werbefrei für die ganze Familie“ gehört auf den Screenshot Nr. 1.
4. **An bestehende Kalender andocken, mit Zwei-Wege-Sync und Export.** 17 % der Negativen beklagen Sync und Lock-in. „Deine Daten gehören dir, Export jederzeit (ICS/CalDAV)“ ist ein klares Gegenversprechen.
5. **Listen und Aufgaben als Erste-Klasse-Objekte.** Geteilte Einkaufsliste, To-dos mit Status und Zuständigkeit, bleiben offen bis erledigt. Das ist genau die Lücke, die TimeTree mit „Memos“ halb und kaputt füllt.
6. **Stabile Navigation.** Maximal 3–4 feste Tabs, Kernfunktionen nie verschieben. Wenn doch etwas wandert: ankündigen und die alte Position eine Weile anbieten. „Bleibt, wie es ist“ ist ein Feature.
7. **KI unsichtbar und opt-in.** Erfassung aus Foto, Mail und WhatsApp als **Assistent mit Bestätigung** („Ich habe 3 Termine gefunden, übernehmen?“), nicht als „KI-Feature“ vermarkten. Klarer EU/DSGVO-Datenschutz, kein Training, kein Teilen mit Dritten. Die TimeTree-Basis reagiert allergisch auf KI-Zwang und neue AGB.
8. **Erinnerungen fein steuerbar.** Wer wird erinnert, wann, für wen. Nicht „jeder bekommt alles“.
9. **Personalisierung leicht, aber vorhanden.** Farben pro Person (mehr als 10 Labels), eventuell ein dezentes Emoji oder Sticker pro Tag. Clean darf nicht „steril“ heißen, ein Teil der Nutzer will Wärme.
10. **Lesbarkeit:** Schrift skalierbar, heutiger Tag deutlich markiert, iPad- und Tablet-Layout, Widget mit mehreren Tagen, gratis.
11. **DE-Lokalisierung:** Feiertage pro Bundesland, KW-Nummern (ein Bug bei TimeTree 2026), Wochenstart Montag, Zeitzonen-sichere Termine (Urlaubsreisen).

### Don't

1. **Nicht „schöner als TimeTree“ als Hauptargument.** Das trägt nicht, TimeTree gilt vielen als hübsch. Lieber: „ruhig, werbefrei, verlässlich, macht die Arbeit für dich“.
2. **Kein Widget und keine Basisfunktion hinter die Paywall.** Das hat bei TimeTree 2025 Wutwellen ausgelöst.
3. **Keine Zwangs-Updates oder hohe Mindest-OS-Version** ohne Not. Großeltern und Seniorenhandys sind Teil der Familie.
4. **Keine AGB-Pop-ups, die die App blockieren**, und keine Opt-out-Schalter, die nicht halten.
5. **Kein Login-Zwang über Google**, wenn Nutzer gerade Google meiden wollen. Mehrere Login-Wege anbieten.
6. **Keine Funktionen ersatzlos streichen** (TimeTree: Chat, Sticker, Hintergründe, Suche). Jede Streichung erzeugt messbar 1★-Wellen.

---

## Quellen

**Rohdaten (nur gelesen):** `~/Obsidian/02 Wiki/Project Ideas/Family Bot/02 Markt & Wettbewerb/Reviews-Rohdaten/reviews/raw/timetree-appstore.jsonl` (8.568 Reviews, 10 Länder à ≤ 500) und `raw/timetree-play.jsonl` (35.927 Reviews, DE + US). Abzug vom 22.10.2026, davon 3.380 Reviews aus 2025–2026 in DE und US ausgewertet.

**Live abgerufen am 23.10.2026:**
- iTunes Lookup API: https://itunes.apple.com/lookup?id=952578473&country=de und &country=us
- Google Play: https://play.google.com/store/apps/details?id=works.jubilee.timetree (hl=de/gl=DE und hl=en_US/gl=US)
- TimeTree Premium: https://timetreeapp.com/intl/en/premium · Help Center „What is TimeTree Premium?“: https://support.timetreeapp.com/hc/en-us/articles/4647239978905
- TimeTree Newsroom: Datenschutzerklärung 15.01.2026, Änderung 09./16.04.2026, KI-Schalter 31.07.2026, Google-Login 10.07.2026, Web Dark Mode 26.08.2026, Ende Calendar Chat 02.12.2024: https://timetreeapp.com/intl/en/newsroom
- Series F: PR TIMES 05.11.2025 https://prtimes.jp/main/html/rd/p/000000131.000017462.html · THE BRIDGE 06.11.2025
- SK-Telecom-Allianz: KEPPLE 26.09.2025 https://kepple.co.jp/articles/23ikbtivt
- Bewertung: INITIAL/Speeda https://initial.inc/companies/A-16398 (Fremdangabe)
- Jahresabschluss FY10 (31.08.2024): https://assets.ctfassets.net/tisgewbnygdw/4wwYu8OJPSyLtPdI6c5Zpj/2b080941e39c956aa7601a20ea2be464/BS_202408.pdf
- Umsatzschätzungen, unverifiziert: Sensor Tower Publisher-Seite, apptomy.com (JP/KR), revshot.app, Owler
- Qualitativ: Reddit r/apps und r/ProductivityApps (Familienkalender-Threads), Capterra TimeTree Reviews, Vergleiche von kincalendar.com und kinmory.ai (Preise geprüft Juli/Aug 2026), getsense.ai/from-timetree (Konkurrent, befangen)

*Hinweis: Die direkten iTunes-RSS-Abrufe (Seiten 1–10) waren aus dieser Umgebung blockiert (Proxy 403). Ich habe stattdessen den RSS-Abzug vom 22.10.2026 auf Julians Mac verwendet, der dieselbe Quelle (sortby=mostrecent, 500 pro Land) abbildet.*
