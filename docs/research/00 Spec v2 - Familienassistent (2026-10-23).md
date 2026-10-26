# Family Bot – Spec v2: der Familienassistent (23.10.2026, abends)

> **Ersetzt Spec v1** vom selben Tag. Grundlage sind die Entscheidungen, die Julian und Claude am Abend des 23.10. gemeinsam getroffen haben, dazu Fahrplan v3, die Grok-Review-Analysen sowie die neuen Tiefenanalysen zu TimeTree (3.380 Reviews) und Podz (61 Reviews) in `reviews-deep/`.
> Arbeitsname bleibt „Family Bot“. Der Name ist bewusst zurückgestellt.
> Kennzeichnung: **[E]** = von Julian entschieden, **[V]** = Vorschlag von Claude, noch nicht bestätigt, **[H]** = Hypothese, die getestet werden muss. Zahlen ohne Quelle sind Annahmen.

> **Nachtrag 24.10.2026 [E]:** Die WhatsApp-Nummer des Assistenten fliegt aus dem MVP. Eingänge sind die Mail-Adresse, Foto und das Teilen-Menü (auch aus WhatsApp heraus; muss im Prototyp getestet werden). Hinweise kommen über Push und Widget, Entwürfe werden über einen `wa.me`-Link verschickt. Plus verliert damit „WhatsApp als Kanal“, die Kosten pro Plus-Haushalt sinken um ca. 0,80–1,90 € im Monat. Ob die Nummer später zurückkommt, entscheiden wir erst, wenn Nutzer sie vermissen. Wo §4, §5, §9 und §12 noch WhatsApp-Nummer oder WhatsApp-Kanal nennen, gilt dieser Nachtrag.
> **Technik der Mail-Adresse:** eigene Domain, MX-Eintrag auf einen Dienst für eingehende Mails (EU), keine echten Postfächer, eine automatisch erzeugte Adresse pro Familie mit Zufallskürzel.
> **Nachtrag 24.10.2026, abends [E]: Einstieg aufs erste Babyjahr.** Julian hat entschieden: Zum Launch wird nur der Einstieg auf Eltern im ersten Babyjahr zugeschnitten, also Onboarding, Startscreen, Landingpage und Marketing. Der Kern bleibt ein allgemeiner Familienassistent (Termine, Dokumente, Verträge, Einladungen, Einkauf), in den die Familie mit dem Kind hineinwächst. Anlass war der Post von Alex Olim (X, 24.10.): „Nimm etwas, das Leute schon nutzen, und schneide es auf eine bestimmte Gruppe zu.“ Cozi, TimeTree und Google Kalender gibt es, keiner ist fürs Babyjahr gebaut. Julians Kanäle (Namore, TikTok/Insta für Schwangere und frische Eltern) erreichen genau diese Gruppe.
> - **Positionierung:** „Der Familienassistent fürs erste Babyjahr, für beide Eltern.“ **[V, Wortlaut]**
> - **Onboarding** startet mit Geburtsdatum oder Entbindungstermin des Babys. Daraus entsteht sofort eine Zeitleiste: U2–U6, STIKO-Impfungen, Geburtsurkunde, Elterngeld-Antrag (rückwirkend nur 3 Monate), Kindergeld, Krankenversicherung des Kindes, Kinderreisepass bzw. Personalausweis. Danach Partner einladen und Kalender verbinden wie bisher.
> - **Hero-Features im Startscreen:** diese Zeitleiste, „wer bringt das Baby hin“ an jedem Termin, eingelesene Mails von Kinderarzt, Doctolib, Elterngeldstelle und Standesamt. Geschwisterkinder können angelegt werden, stehen aber nicht im Vordergrund.
> - **Vertrieb:** Namore-Cross-Sell (Paare, die gerade einen Namen suchen, sind 0–9 Monate vor dem Start) und Content für Schwangere und frische Eltern, keine bezahlten Ads. Landingpage-Variante C: „Das erste Babyjahr, ohne dass einer alles im Kopf haben muss.“
> - **Zum Launch weggelassen bzw. nachrangig:** Funktionen für ältere Kinder (Schule, Vereine, Ferienbetreuung), Kita als eigenes Thema, Länderpakete AT/CH, Marketing in anderen Sprachen als Deutsch. Die Oberfläche bleibt DE + EN.
> - **Risiko:** Die Nische ist klein und der Bedarf zeitlich begrenzt. Deshalb muss der allgemeine Kern ab Monat 12 tragen; messen über Abo-Verlängerung nach dem ersten Jahr. Abbruchkriterium neu: < 40 % der Babyjahr-Haushalte nutzen nach 3 Monaten auch Nicht-Baby-Termine → Kern nachschärfen.
> Wo §1 (Zielnutzer 0–10 Jahre), §10 (AT/CH) und §14 (Landingpage-Varianten) noch etwas anderes sagen, gilt dieser Nachtrag.

---

## 0. Was sich gegenüber v1 geändert hat
| Punkt | v1 | v2 |
|---|---|---|
| Zeitbudget | MVP wegen ~1 h/Tag halbiert | Die 1-h-Regel entfällt **[E]**. Der Umfang folgt dem Produkt; das Prinzip „wenig, aber zuverlässig“ bleibt |
| Eingänge | Foto, Teilen, später Mail | **eigene Mail-Adresse des Assistenten + WhatsApp-Nummer + Foto/Teilen** von Anfang an **[E]** |
| Ausgänge | keine | **Entwürfe**, die die Eltern bearbeiten und selbst senden **[E]** |
| Kalender | nur ICS-Abo | **eigene Wochenansicht + Sync**, in Stufen **[E]** |
| Einkaufsliste | gestrichen | **zurück**, in schlichter Form **[E]** |
| Neu | – | Dokumente & Fristen, „Wer kommt / wer bringt“, Alter in Wochen, Widgets als Hauptfläche, Maskottchen |
| Proaktivität | 1 Nachricht pro Tag | **nur Wichtiges**, Ziel 2–4 Hinweise pro Woche **[E]** |
| Positionierung | „kennt euch, denkt mit“ | dazu **„ruhig, werbefrei, nichts verschwindet“**, gestützt durch die TimeTree-Reviews |
| Sprachen | DE | **mehrsprachig** **[E]**: DE + EN zum Start **[V]** |

---

## 1. Versprechen und Positionierung
**Der Assistent für Eltern, die keine Lust haben, sich selbst ein System zu bauen.** Er kennt die Familie, denkt an alles Wichtige, sagt dem Richtigen zur richtigen Zeit Bescheid und schreibt die lästigen Nachrichten vor. So bleibt mehr Zeit und Energie für die Familie. **[E]**

Leitbild: die Assistentin, die es weiß, bevor man fragt, wie Donna in *Suits* oder Pam in *The Office*. Sie ist ruhig, kompetent, warm und hat leichten Witz. **[E]**

Abgrenzung:
- **Gegen TimeTree, Cozi, FamilyWall:** ruhig, werbefrei, nichts verschwindet, kein Umbau-Chaos. TimeTree hat seit dem Februar-Update 44 % schlechte Reviews, 23 % davon wegen Werbung und 19 % wegen des Umbaus (`reviews-deep/TimeTree …`).
- **Gegen DIY mit ChatGPT, Claude oder Grok:** Wer basteln will, kann sich das selbst bauen. Wir sind für die anderen 95 % **[E]**.
- **Gegen Hermo, Ohai, Nori:** eine eigene, schöne App statt nur WhatsApp, für jeden Mail-Anbieter, mit deutschem Familienwissen.

**Zielnutzer: beide Eltern als Team** **[E]**, mit Kindern von 0 bis 10 Jahren, zuerst in Deutschland. Nutzer null ist Julians Familie.

---

## 2. Prinzipien (verbindlich)
| # | Regel | Abnahmekriterium |
|---|---|---|
| R1 | **Nie still handeln.** Read-back vor jedem Eintrag, unsichere Felder markieren, Undo, Änderungen als Vorher/Nachher | 0 Phantom-Bestätigungen in 200 Testaktionen |
| R2 | **Nur Wichtiges melden** (Regel in §5) | Durchschnitt ≤ 4 proaktive Hinweise pro Woche und Person |
| R3 | **Sichtbares Gedächtnis.** Alles, was der Assistent weiß, ist sichtbar, änderbar und löschbar | „Was weißt du über uns?“ zeigt 100 % |
| R4 | **Was gratis ist, bleibt gratis.** Nichts wird nachträglich gesperrt **[E]** | Vertraglich in den AGB zugesagt |
| R5 | **Kalender anbinden und eine eigene Ansicht bieten** | Sync ohne Dubletten (Podz- und TimeTree-Schmerz) |
| R6 | **Export ab Tag 1** | ICS + JSON mit einem Tipp |
| R7 | **Ruhe.** Keine Werbung, keine Funktionen verstecken, Umbauten nur angekündigt und umkehrbar | Lehre aus dem TimeTree-Update im Februar 2026 |
| R8 | **Senden tun nur die Eltern** **[E]** | Kein API-Weg, der ohne Tipp nach außen sendet |

---

## 3. Funktionsumfang
### 3.1 MVP
| # | Funktion | Kern | Stress-Moment von Julian |
|---|---|---|---|
| 1 | **Familienprofil** | Eltern, Kinder (Alter **in Wochen**, später in Monaten), Großeltern, Einrichtungen, Ärzte, Bundesland; „Was weiß der Assistent“ | – |
| 2 | **Heute / Woche** (eigene Ansicht) | Termine aus allen Kalendern + Aufgaben + Fristen; Sonntags-Vorschau | „wer kommt wann“ |
| 3 | **Aufgaben** | Zuständiger (Eltern verteilen selbst **[E]**), Frist, wiederkehrend, bleibt offen bis erledigt | – |
| 4 | **„Wer kommt / wer bringt“** an jedem Termin | Am Vorabend wird genau diese Person erinnert | Freundin macht Termine, Julian vergisst sie |
| 5 | **Einkaufsliste** (schlicht, geteilt, live) | kein Rezept- und Angebots-Ballast | gemeinsame Einkaufsliste |
| 6 | **Eingang** | Mail, WhatsApp-Weiterleitung, Foto, Teilen, Sprachnotiz → Vorschlag → Read-back → Eintrag | Amtstermin muss eingetragen werden |
| 7 | **U- und STIKO-Zeitleiste** | regelbasiert aus dem Geburtsdatum, als Erinnerung im Kalender | U-Untersuchungen und Impfungen nicht auf dem Schirm |
| 8 | **Dokumente & Fristen** | Ablaufdaten von Pässen und Ausweisen, Guthaben (z. B. Kita-Essen), Verträge, Fristen aus Mails | Kein Pass, also kein Urlaub; Kita-Guthaben leer |
| 9 | **Geburtstage** | mit Vorlauf und einer Notiz zum letzten Geschenk | – |
| 10 | **Entwürfe** | Krankmeldung, Absage, Antwort an die Kita, Terminanfrage → bearbeiten → per WhatsApp/Mail/SMS selbst senden | – |
| 11 | **Widgets** (iOS + Android) | Heute, Woche, offene Aufgaben; die Hauptfläche **[E]** | – |
| 12 | **Assistent-Chat** | Fragen („Wann ist die U6?“), Änderungen, „Was weißt du über uns?“ | – |
| 13 | **Kalender-Sync** Stufe 1–2 | siehe §6 | – |

### 3.2 Danach
- **v1.1:** Kalender-Sync Stufe 3 (Apple/Outlook in beide Richtungen), Länderpakete AT und CH, Ferien- und Betreuungsplanung (Lücken in den Schließzeiten, Oma fragen).
- **v2:** **Fotos, Wachstum und Großeltern-Feed** als eigenes Modul **[E]**. Dazu Geschenkideen und Vorschläge, wer was übernimmt (optional, erst wenn gewünscht).

### 3.3 Gestrichen
Notfall-Modus, PayPal-Budget (Haftung, Zahlungsrecht), Essensplanung, Medikamente (Gesundheitsdaten), Abend-Übergabe. Der Bot schreibt nicht selbst in Kita-Gruppen **[E]**.

---

## 4. Eingänge und Ausgänge
### 4.1 Eingänge **[E]**
| Eingang | Wie | Was wir wissen | Offen |
|---|---|---|---|
| **Familien-Mail-Adresse** (`name@<app>.de`) | weiterleiten oder direkt bei Kita, Schule, Amt, Arzt und Shops hinterlegen; automatische Weiterleitungsregel in GMX, Web.de, Gmail, Outlook | anbieterunabhängig, kein OAuth, kein Google-Prüfverfahren; Hermo kann nur Gmail | Ob die Mail-Benachrichtigungen von Kita- und Schul-Apps (Stay Informed, Sdui, Leandoo, Kitaplus …) den **Inhalt** mitschicken oder nur „neue Nachricht“. **Noch nicht geprüft**, als Nächstes recherchieren |
| **WhatsApp-Nummer des Assistenten** (eine zentrale Business-Nummer) | Einzelnachrichten aus Kita-Gruppen weiterleiten, Fotos, Sprachnachrichten; Erkennung über die Handynummer | offizielle Cloud API, Task-Bot erlaubt | Ein Beitritt zu Gruppen ist nicht möglich (offizielle API); ob die API eigene kleine Gruppen anlegen kann, ist **ungeprüft** |
| **Foto, Teilen-Menü, Sprachnotiz** in der App | Kamera, Share-Sheet aus jeder App | – | – |

**Lücke, die bleibt:** WhatsApp-Gruppen müssen weiterhin von Hand weitergeleitet werden. Den Bot in eine Gruppe zu setzen geht nicht: Es ist technisch nicht vorgesehen, und er würde die Nachrichten anderer Eltern ohne deren Einwilligung mitlesen.

### 4.2 Ausgänge **[E]**
Der Assistent schreibt einen Entwurf. Die Eltern bearbeiten ihn und senden selbst:
- WhatsApp über einen `wa.me`-Link oder das Share-Sheet, mit dem Text vorausgefüllt; die Gruppe wählt man selbst.
- Mail über `mailto:` oder die eigene Mail-App.
- SMS über das Share-Sheet.

Nie wird über den privaten WhatsApp-Account der Eltern automatisiert. Das verstößt gegen die Regeln von Meta, und die private Nummer würde gesperrt.

---

## 5. Proaktiv, aber nur Wichtiges **[E]**
Ein Hinweis wird nur gesendet, wenn **alle drei** Bedingungen gelten:
1. **Es hat eine Folge, wenn man es verpasst:** eine Frist, Geld, Gesundheit, oder ein Kind steht ohne etwas da.
2. **Jemand Bestimmtes muss handeln.**
3. **Es ist nicht schon abgedeckt**, z. B. durch einen Kalendertermin mit eigener Erinnerung.

| Hinweis | Beispiel | Wann |
|---|---|---|
| Vorabend für den Zuständigen | „Morgen 9:30 Kinderarzt mit Karlo. Du bringst ihn.“ | 19:00 |
| Frist | „Guthaben Kita-Essen reicht noch für ~3 Tage.“ | 7/2/0 Tage vorher |
| Echte Vorausschau | „Ihr habt Urlaub im Mai eingetragen. Karlos Pass fehlt, Termine beim Bürgeramt dauern oft Wochen.“ | sobald erkannt |
| Vorsorge | „U5 ist zwischen 6. und 7. Monat fällig. Wer ruft an?“ | Beginn des Zeitfensters |
| Überschneidung | „Do: Elternabend und dein Training. Wer geht?“ | sobald erkannt |
| Sonntags-Vorschau | „Eure Woche: 4 Termine, 2 Dinge ohne Zuständigen.“ | So 18:00, an beide (fest) |

- **Budget:** Ziel 2–4 Hinweise pro Woche und Person, hartes Maximum 1 pro Tag plus die Sonntags-Vorschau. Ruhezeiten. „Weniger davon“ wirkt sofort.
- **Kanal:** Widget und Push als Standard. WhatsApp nur als **Rückfall**, wenn ein Push nach X Stunden unbeantwortet bleibt (Plus). Jeder Hinweis hat Schnellaktionen (`erledigt`, `ich mach's`, `später`) und einen Deep-Link.

---

## 6. Kalender: eigene Ansicht + Sync **[E]**
| Stufe | Inhalt | Warum so |
|---|---|---|
| 1 | Die App schreibt in die bestehenden Kalender (Google über die API; Apple/Outlook über ein ICS-Abo) | Termine sind sofort im eigenen Kalender |
| 2 | Google in beide Richtungen; die Wochenansicht zeigt auch fremde Termine | Die meisten Android-Nutzer und viele iPhone-Nutzer haben Google |
| 3 | Apple (CalDAV/EventKit auf dem Gerät) und Outlook (Graph) in beide Richtungen | aufwendiger, nach der Beta |

**Wichtig:** iOS entfernt bei abonnierten Kalendern standardmäßig die Erinnerungen. Ein ICS-Abo allein klingelt also oft nicht. Deshalb übernehmen Push und Widget die wichtigen Erinnerungen, der Kalender ist die Übersicht. Sync-Fehler und Dubletten sind in allen Review-Analysen ein Hauptgrund für Abwanderung, deshalb gibt es einen sichtbaren Sync-Status und Dubletten-Schutz über die Event-IDs.

---

## 7. Gesundheit und Datenschutz
- **U- und STIKO-Zeitleiste:** regelbasiert aus G-BA-Richtlinie und STIKO-Kalender, mit Quelle. Die Empfehlung selbst ist kein Gesundheitsdatum.
- **Der Status („U5 erledigt“, „Impfung erhalten“) ist ein Gesundheitsdatum nach Art. 9 DSGVO.** Vorschlag **[V]**: Im MVP liegt er nur auf dem Gerät, ohne Server-Sync. Sonst wird eine DSFA (Art. 35) wahrscheinlich, und daran hängt nach § 38 BDSG ein Datenschutzbeauftragter. *Offene Frage an Julian.*
- EU-Hosting, AV-Verträge (Datenbank, KI-Anbieter, Meta, Mail-Eingang), Löschfristen für Originale (Fotos und Mails nach Bestätigung, spätestens nach 24 h bzw. nach X Tagen), Export und Löschen mit einem Tipp.
- **EU AI Act Art. 50:** Der Assistent muss als KI erkennbar sein. Das Maskottchen darf nicht wie ein Mensch auftreten.
- Mails von Kita und Arzt enthalten Daten Dritter. Wir verarbeiten nur zur Erkennung, ohne Training.

---

## 8. Design und Maskottchen
- **Design-System v2 „Notion-Stil“** bleibt (eine Akzentfarbe, Property-Rows, ruhige Listen). Die Positionierung ist aber **„ruhig und klar“**, nicht „hübscher als die anderen“: Die Reviews stützen „TimeTree ist hässlich“ nicht (< 1 % Kritik an der Optik), sehr wohl aber „laut und unberechenbar“.
- **Maskottchen** **[E]**: ein einziger, süßer Charakter. Er erscheint nur, wenn der Assistent spricht: Hinweise, Chat, leere Zustände („Alles erledigt“), Widget. Persönlichkeit wie Donna, ohne Schuldgefühl-Mechanik à la Duolingo. Damit greifen wir auch die TimeTree-Reviews auf, die „cute“ loben und reinen Minimalismus „boring“ finden.
- Tier: **Eichhörnchen** (denkt voraus, legt Vorräte an) oder **Biber** (Familie, baut das Zuhause). Julian ist noch unentschlossen. Hinweise:
  - „Beaver“ ist im Englischen vulgärer Slang, gehört also nicht in den App-Namen.
  - **hazelhere.com** nutzt bereits ein Eichhörnchen namens Hazel für einen KI-Assistenten auf der Kita-Seite. Das Eichhörnchen braucht deshalb einen eigenen Namen und Look.
- Name: zurückgestellt **[E]**. Bereits geprüft: „Hazel“ ist stark besetzt (Noodlesoft Hazel, hazel.ai, hazelhere). „Family Bot“ ist zu nah an Fambot.

---

## 9. Monetarisierung **[E]**
**Grundsatz: Organisieren ist gratis, Arbeit abnehmen ist Plus.** Was gratis ist, bleibt gratis.

| | Gratis (für immer, beide Eltern) | Plus pro Haushalt: 4,99 €/Monat oder 39,99 €/Jahr |
|---|---|---|
| Profil, Woche, Aufgaben, „wer kommt“, Einkaufsliste, Widgets | ✔ | ✔ |
| Kalender-Sync | ✔ | ✔ |
| U/STIKO, Geburtstage, Alter in Wochen | ✔ | ✔ |
| Push-Hinweise | ✔ | ✔ |
| Erfassen (Mail, WhatsApp, Foto) | 10 pro Monat | unbegrenzt (Fair Use ~150) |
| Dokumente & Fristen | – | ✔ |
| Entwürfe | – | ✔ |
| WhatsApp als Kanal | – | ✔ (als Rückfall) |
| Großeltern-Feed (v2) | – | ✔ |

- Abo, kein Einmalkauf **[E]**. 14 Tage Plus gratis ab der ersten Erfassung. Kündigen mit einem Tipp.
- **Gründerjahr 29 €**, nur für die ersten 200 Haushalte **[V]**.
- Zum Vergleich: TimeTree Premium kostet 29,99 €/Jahr **pro Person** und hat keinen Familientarif.

**Kosten pro Plus-Haushalt und Monat** (WhatsApp-Preis am 22.10. geprüft, KI-Kosten angenommen):
| | normal | Vielnutzer |
|---|---|---|
| Netto-Einnahme Monatsabo (nach 19 % MwSt. + 15 % Store) | 3,55 € | 3,55 € |
| Netto-Einnahme Jahresabo pro Monat | 2,40 € | 2,40 € |
| WhatsApp (0,0456 €/Nachricht) | 0,80 € | 1,90 € |
| KI-Erkennung | 0,30 € | 1,20 € |
| Infrastruktur (anteilig, 100 Haushalte) | 0,30 € | 0,40 € |
| **Kosten gesamt** | **1,40 €** | **3,50 €** |

Ergebnis: Bei normaler Nutzung sind die Kosten gedeckt. Bei Vielnutzern sorgen WhatsApp nur als Rückfall und Fair Use dafür, dass das Jahresabo nicht ins Minus rutscht. Liegt der gemessene KI-Preis deutlich höher, wird das Jahresabo 44,99 €.

---

## 10. Sprachen und Länder **[E]**
- Oberfläche auf **DE + EN** ab Start **[V]**, weitere Sprachen später. Jeder Elternteil wählt seine Sprache. Die KI erkennt Dokumente in jeder Sprache.
- **Länderpakete** (U/Impfplan, Ferien, Ämter-Fristen) kommen nacheinander: DE → AT/CH → später weitere. Länder ohne Paket bekommen alles außer diesen Regeln.
- Marketing anfangs nur auf Deutsch (Julians Kanäle). Englisch läuft nur über den Store.

---

## 11. Wettbewerb und Schutz
| Wettbewerber | Stand | Was wir anders machen |
|---|---|---|
| TimeTree | DE 4,74★ / 99.796 Bewertungen, Premium pro Person, seit Feb 2026 Werbung und Umbau-Ärger | ruhig, werbefrei, Abo pro Haushalt, Assistent |
| Cozi | belegt die Nachfrage (USA), Paywall-Ärger | gratis Kern, nichts wird nachträglich gesperrt |
| FamilyWall | DE ~25.000 Bewertungen, überladen | schlicht, KI-Eingang |
| Hermo, Ohai, Nori, Sense, Fambot | KI-Assistenten, klein, ohne Graben | eigene App, jeder Mail-Anbieter, DE-Wissen |
| Podz | USA, klein, in DE nicht präsent | kein ernsthafter Gegner |
| Apple, Google, Meta Muse | liefern „erinnere mich“ gratis | gemeinsames Gedächtnis für zwei Eltern über iOS und Android, deutsches Familienwissen, keine Werbung |

**Schutz:** nicht der Code (der ist nachbaubar), sondern Zuverlässigkeit, die Zwei-Eltern-Nutzung, deutsches Familienwissen und das wachsende Familiengedächtnis.

---

## 12. Technik **[V]**
- App: gleicher Stack wie Namore, nativ mit Widgets (iOS WidgetKit, Android Glance) und Push.
- Backend: Supabase EU (Frankfurt), RLS pro Familie, Cron und Queues für Hinweise.
- Mail-Eingang: EU-Anbieter für eingehende Mails (Postmark, Mailgun EU o. ä.), Spam-Filter, Liste bekannter Absender.
- WhatsApp: Cloud API, eine zentrale Nummer, Utility-Templates.
- KI: Vision-LLM über einen EU-Endpunkt ohne Speicherung; festes JSON-Schema mit Konfidenz pro Feld; Datumsauflösung regelbasiert.
- Regelbasiert statt KI: U/STIKO, Ferien, Fristen, Budget, Wiederholungen.

---

## 13. Risiken und offene Fragen
Was Grok bisher übersehen hat, steht oben, dazu alles, was wir noch nicht wissen.

| # | Risiko / Unbekannt | Warum wichtig | Nächster Schritt |
|---|---|---|---|
| 1 | **Woher kommen die Infos?** Ein Assistent ist nur so gut wie sein Eingang. Kita-Apps sind geschlossen, WhatsApp-Gruppen nicht lesbar | Ohne Eingang gibt es nichts, worauf er proaktiv reagieren kann | Prüfen, welche Kita- und Schul-Apps Mail-Benachrichtigungen mit Inhalt schicken; 10 Eltern fragen, wo ihre Infos ankommen |
| 2 | **Zuverlässigkeit der Erkennung** | Ein falsches Datum zerstört das Vertrauen (Milo wurde daran eingestellt) | Benchmark auf 50 echten Dokumenten aus ≥ 5 Quellen, Ziel ≥ 90 % |
| 3 | **Partner macht nicht mit** | Die App für zwei Eltern fällt, wenn nur einer sie nutzt | Partner-Einladung im Aha-Moment; Beta-Kriterium ≥ 5 von 10 Familien |
| 4 | **Proaktivität ist unbelegt** (0 Wünsche in 2.072 Reviews) | Das Kernversprechen ist eine Hypothese **[H]** | Nutzer null + Beta: Anteil „hilfreich“ ≥ 50 % |
| 5 | **Zahlungsbereitschaft für die Assistenz-Schicht** **[H]** | Nachfrage nach dem Organizer ist belegt, für KI-Assistenz nicht | Landingpage mit Gründerjahr, < 1 % Vorbestellungen bei ≥ 500 Besuchen → umdenken |
| 6 | **KI-Kosten** real unbekannt | Rechnung in §9 beruht auf Annahmen | Im Benchmark messen |
| 7 | **Plattform-Risiko** (Apple, Google, Meta Muse) | gratis und vorinstalliert | Positionierung auf Zwei-Eltern-Gedächtnis + DE-Wissen; beobachten |
| 8 | **Recht:** Art. 9 (Gesundheit), Art. 8 (Kinder), DSFA/DSB, AI Act Art. 50, Daten Dritter in Mails | Bußgeld und Vertrauen | Gesundheitsstatus auf dem Gerät; kurzer anwaltlicher Check vor Launch |
| 9 | **Review-Daten sind nur halb übertragbar** (viele US-Apps, Hermo fehlt, geschichtete Stichprobe) | Grok-Zahlen nicht als Beleg für DE lesen | 5–10 Gespräche mit DE-Eltern |
| 10 | **Mail-Missbrauch und Spam** auf der Familienadresse | Fremde könnten Termine einschleusen | Unbekannte Absender landen immer im Eingang, nie direkt im Kalender |
| 11 | **Meta-Template-Freigabe und WhatsApp-Regeln** | Ohne Freigabe kein WhatsApp-Hinweis | Früh ein Utility-Template einreichen |
| 12 | **Name und Maskottchen-Kollision** (Fambot, hazelhere) | Store-Suche, Marke | Vor der Landingpage Name + DPMA/EUIPO + Domain prüfen |
| 13 | **Store-Review** von Apple/Google bei KI und Kinderdaten | Ablehnungen kosten Zeit | Datenschutz-Labels sauber, keine Altersgruppe „Kinder“ |

---

## 14. Validierung und Abbruchkriterien
1. **Sofort:** Recherche zu Kita-App-Mails (Risiko 1) und Erkennungs-Benchmark (Risiko 2, 6).
2. **Nutzer null** (Julians Familie): Mail-Adresse und Weiterleitung zuerst als Prototyp, Hinweise anfangs von Hand. Protokoll: hilfreich / egal / störend.
3. **Landingpage** mit Screens im Notion-Stil + Maskottchen. Varianten: A „Der Assistent, der an alles denkt“ vs. B „Termine aus Mails und Fotos für euch beide“. Gründerjahr 29 €.
4. **Beta mit 10 Familien.**
5. **Abbruch- bzw. Umbaukriterien:**
   - Benchmark < 80 % → Erfassen zurückstufen, Fokus auf Profil-Erinnerungen und Fristen.
   - < 1 % Vorbestellungen → Positionierung überdenken.
   - Partner in < 5 von 10 Familien aktiv → Zwei-Eltern-Versprechen überdenken.
   - < 50 % „hilfreich“ → nur Fristen behalten.

---

## 15. Offene Entscheidungen für Julian
1. Gesundheitsstatus (U erledigt, Impfstatus) im MVP nur auf dem Gerät? **[V: ja]**
2. Tier: Eichhörnchen oder Biber?
3. Name (zurückgestellt).
4. Gründerjahr nur für die ersten 200 Haushalte?
5. Start-Bundesland für Ferien-Daten (Bayern?).

---

## Verdict-Ledger-Zeile (ersetzt v1)
| Datum | Idee | Label | Regel-Ergebnis | Verdict | Kill-Test |
|---|---|---|---|---|---|
| 2026-10-23 | Familienassistent als eigene App (Arbeitsname Family Bot): Familien-Mail + WhatsApp-Eingang, Entwürfe, nur wichtige Hinweise, eigene Wochenansicht + Sync, „ruhig, werbefrei, nichts verschwindet“; Abo pro Haushalt | Nebeneinkommen | 0 ✔ (1-h-Regel aufgehoben, kein Live-Support), 1 ✔, 2 offen, 4 ✔ (Familiengedächtnis) | **GO** | Erkennungs-Benchmark ≥ 90 %; Landingpage mit 29-€-Gründerjahr < 1 % Vorbestellungen bei ≥ 500 Besuchen → umbauen |
