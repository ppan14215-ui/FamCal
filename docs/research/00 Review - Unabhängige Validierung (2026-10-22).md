---
title: "Family Bot – unabhängige Validierung"
type: review
created: 2026-10-22
related:
  - "[[00 Family Bot - Gesamtdokument]]"
  - "[[STATE]]"
  - "[[Verdict ledger]]"
---

# Family Bot – unabhängige Validierung (22.10.2026)

**Gelesen:** Gesamtdokument (Teil A und B1–B9 vollständig), README, Storyboard-MD, dazu STATE.md und Verdict ledger. Die Detaildateien in 01–05 sind laut README im Gesamtdokument wortgleich enthalten; ich habe sie dort gelesen. Live geprüft am 22.10.2026: Fambot (App Store, Presse), Hermo (Website DE/EN, Preise), familymind, Maple, Milo, WhatsApp-Preise (Meta-Doku und Rate-Card-Tracker), Destatis-Betreuungsquote. Alles andere ist als ungeprüft markiert.

---

## 0. Runde 2 (22.10., nach Julians Einwand) – neuer Stand

Julians Einwand: Hermo ist hässlich und kann nicht, was Family Bot vorhat. Der Einwand ist berechtigt. Ich lese Hermo deshalb nach der Namore-Methode: als Beleg, dass es den Bedarf gibt, mit einem schwachen Anbieter. Neues Verdict: **SPLIT.** Den Gesamtplan nicht bauen, aber einen **engen Keil** testen (0.4). Die Abschnitte 1–7 unten sind Runde 1 und gelten nur dort, wo 0.x sie nicht korrigiert.

### 0.1 Was Hermo ist (live geprüft)
- London, zwei Gründer (Jenna & Fabian Blaicher-Brown). Ihre erste Firma Shipamax (YC17, Dokument-Extraktion) ging an WiseTech Global. Sie können also Extraktion.
- **Traktion: öffentlich nicht belegt.** Es gibt keine App-Store-App (nur WhatsApp + Web), also keine Bewertungen. Belege sind drei Testimonials auf der Website und eine Erwähnung bei Sifted. Keine Nutzerzahl, keine Finanzierung (Crunchbase: 1 Mitarbeiterprofil).
- Preise: 0 £ / 4 £ / 45 £ im Monat. Die deutsche Seite ist eine Übersetzung, der Inhalt bleibt UK (NHS-Nummer, Half-Term).

**Für die Wettbewerbsfrage heißt das:** Hermo widerlegt den Satz „einziger deutschsprachiger Agent“ formal, ist aber kein starker Platzhirsch. Mein Satz aus Runde 1 „Differenzierung widerlegt“ war zu hart.

### 0.2 Was Hermo nicht kann, und ob Eltern dafür zahlen würden
| Fähigkeit von Family Bot | Hermo | Zahlungsrelevanz für DE-Eltern |
|---|---|---|
| Mail-Eingang für **jeden Anbieter** (Weiterleitungsadresse) | **Nur Gmail** per OAuth (Pricing-FAQ) | **Hoch.** In DE sind GMX, Web.de, T-Online und Outlook sehr verbreitet [Marktanteile nicht live geprüft]. Ein Gmail-only-Produkt verliert einen großen Teil der Paare vor dem ersten Schritt. Die Weiterleitungsadresse ist zugleich billiger (kein CASA-Audit). |
| **Apple-Kalender** | Nur Google Calendar | **Hoch.** In DE nutzen viele iPhone-Paare den iCloud-Kalender. Mindestens ein ICS-Abo ist Pflicht. |
| Eigene, schöne App mit **einer Hauptaktion** | Keine App, Web + WhatsApp, generisches Design | **Mittel bis hoch für die Conversion.** Das ist Julians Stärke und war bei Namore der Hebel. Für die Zahlungsbereitschaft ist es nicht bewiesen. |
| **Rückfrage vor jedem Eintrag** („Mi 5.11., 15:00 – passt?“) | Liest automatisch, fragt teils nach | Mittel. Vertrauen ist der Kern (Milo ist an Zuverlässigkeit gescheitert). |
| **Abendliche Übergabe** an Partner 2 ohne App | Morgen-Briefing an beide | Gering. Das ist Parität, kein Unterschied. |
| **Handeln nach außen** (Kind krank → Mail an Kurs/Kita) | „Never sends“ | Gering bis mittel. Selten im Jahr, und Kitas haben eigene Apps. Gut für Content, schwach als Kaufgrund. |
| **U-/STIKO-Plan** für Deutschland | Fehlt (UK) | Gering als Abo-Grund, hoch als **Gratis-Lead-Magnet**. |
| Deutsche Inhalte (Kita, Elterngeld, Amtsdeutsch) | Nur übersetzte Oberfläche | Mittel. Die Extraktion deutscher Kita-Mails muss Family Bot erst beweisen (Benchmark mit 50 echten Zetteln). |

**Fazit 0.2:** Drei Lücken haben echtes Gewicht: Mail für jeden Anbieter, Apple-Kalender, Design. Sie bilden zusammen den Keil. Kind-krank, Notfall und U-Reminder sind nette Extras, aber kein Grund, warum jemand zahlt.

### 0.3 Was aus Runde 1 noch gilt
- **Nachfrage-Beweis, nach dem Namore-Maßstab:** Bewiesen ist die Kategorie **„geteilter Familienkalender“** (Cozi 399.000 App-Store-Ratings, FamilyWall mit klaren Schwächen in DE). **Nicht bewiesen** ist, dass jemand für die **KI-Schicht** zahlt: Fambot hat 13 Ratings, Sense 39 Ratings und „2.000+ families“ (6,99 $/Monat, 59,99 $/Jahr), Hermo hat keine Zahlen. Das demand-first-Gate (≥ 5.000 US- oder ≥ 500 DE-Ratings bei den Top-3) besteht nur die alte Kategorie, nicht die KI-Agenten. Family Bot sollte sich also als **besserer Familienkalender mit KI-Erfassung** positionieren, nicht als „Agent“.
- **WhatsApp-Kosten gelten weiter** (0,0456 € pro Nachricht in DE seit 01.10.2026). Sie sind aber lösbar: WhatsApp nur für die eine Abend-Übergabe an Partner 2 (~30 Nachrichten ≈ 1,40 €/Monat), Push für den Hauptnutzer, Preis bei 6,99 €/Monat bzw. 49 €/Jahr (Sense-Niveau statt 4,99 €).
- **Kapazität gilt für den Gesamtplan weiter.** Für den Keil sinkt sie stark, wenn keine Gesundheitsdaten gespeichert werden (kein Art. 9, damit wahrscheinlich keine Pflicht-DSFA und kein DSB) und es keine Aktionen nach außen gibt.
- **Zielgruppe gilt weiter:** Der Schmerz liegt bei Kita- und Schulfamilien, nicht bei Schwangeren. Namore taugt für die Warteliste, aber nicht als Hauptkanal.

### 0.4 Was die Idee tragfähig macht (Bedingungen)
1. **Keil statt Plattform:** „Zettel oder Mail rein → Rückfrage → Termin in **euren** Kalendern (Google, Apple per ICS) → Partner bekommt abends eine Zeile.“ Sonst nichts im MVP.
2. **Familien-Mailadresse statt Gmail-OAuth**, damit es mit GMX, Web.de, T-Online und Outlook funktioniert. Das ist der klarste Unterschied zu Hermo, Fambot und Sense, und es spart den CASA-Audit.
3. **Keine Gesundheitsdaten auf dem Server.** Der U-/Impf-Plan wird lokal als ICS erzeugt und ist ein Gratis-Magnet, kein Feature mit Datenhaltung.
4. **Natives iOS mit Push** für den Hauptnutzer, WhatsApp nur für Partner 2. Preis 6,99 €/Monat bzw. 49 €/Jahr, pro Familie.
5. **Kanal:** TikTok-SEO auf Kita-Suchanfragen („Kita Elternbrief Termine“, „Laternenfest wann“), Kita-Eltern-Gruppen, und Namore nur als Startliste.
6. **Zeitrahmen:** 2–3 Monate bei ~1 h/Tag für den Keil, erst nach bestandenem Zahlungstest.
7. **Erst messen:** Extraktions-Benchmark mit 50 echten deutschen Kita-Zetteln und -Mails, Ziel ≥ 90 % korrekt. Das geht an einem Abend mit Claude oder GPT, ganz ohne App.

**Kill-Test (ersetzt Abschnitt 6):** 15–20 Slideshows mit dem Hook „Kita-Mail an GMX → Termin bei euch beiden“ plus eine Landingpage mit **49 €/Jahr Vorbestellung** (Gründerpreis, erstattbar). Unter 20 bezahlte Vorbestellungen bis **08.11.2026** → parken. Ab 20 und mit ≥ 90 % im Benchmark → Keil bauen.

---

## 1. Kurzfazit (Runde 1)

**Verdict Runde 1: NO-GO für den Bau wie geplant (side income).** Ein enger, billiger Test ist vertretbar (Abschnitt 6). *Durch Abschnitt 0 auf SPLIT korrigiert.*

Drei Gründe, in Reihenfolge der STATE-Regeln:

1. **Die Kategorie steht schon im Verdict ledger als ⛔.** Zeile „Family organizer (FamilyWall / Cozi)“; STATE.md listet „family organizers“ ausdrücklich als „off the table“. Das Gesamtdokument erwähnt das nirgends. Der neue Dreh (KI-Agent, WhatsApp, Partner ohne App) wäre ein legitimer Grund für einen erneuten Screen, aber nur, wenn er die alten Killgründe adressiert. Das tut er teilweise (Partner 2 ohne App, siehe Ledger: „Winners stopped requiring two-sided adoption“), die übrigen nicht.
2. **Regel 0 (Operator fit) fällt durch, als „capacity“.** Der Stack (Kalender-Zwei-Wege-Sync, WhatsApp Cloud API, Vision-LLM, Art.-9-Gesundheitsdaten, DSFA, DSB) ist kein 1-h/Tag-Produkt, und jeder Fehleintrag ist ein Support-Ticket mit Kind-Bezug.
3. **Die zentrale Differenzierung ist falsch.** „Einziger deutschsprachiger KI-Agent für Familienlogistik in DACH, über WhatsApp“ stimmt nicht: **Hermo** hat eine deutsche Seite (hermo.ai/de), lebt in WhatsApp, liest Gmail, nimmt Sprachnachrichten und Fotos, schickt beiden Eltern ein Morgen-Briefing, hostet in Frankfurt und kostet 0 / 4 £ / 45 £ im Monat.

---

## 2. Annahmen, die nicht belastbar sind

| # | Annahme im Dokument | Befund | Quelle / Status |
|---|---|---|---|
| 1 | „Kein verifizierter KI-Familienassistent ist deutschsprachig und auf DACH ausgerichtet“ (B4 §6, §9) | **Falsch.** Hermo: „KI-Familienassistent in WhatsApp“, deutsche Oberfläche, Gmail lesen, Fotos/Sprachnotizen, Partner tritt per WhatsApp bei, Morgen-Briefing an beide, Datenbank in Frankfurt. familymind.ai sitzt in Aichach (Bayern), bisher englischsprachig auf der Website, Mental-Load-Fokus. | hermo.ai/de, hermo.ai/en/pricing, Tracxn (live, 22.10.) |
| 2 | WhatsApp als Kanal ist ein Unterscheidungsmerkmal gegenüber Fambot (SMS) | Hermo hat genau das. Fambot liest WhatsApp-Gruppen bereits. Der Kanal ist kein Burggraben. | wie oben, Fambot App Store |
| 3 | Service-Nachrichten und Utility-Templates im offenen Fenster sind kostenlos (B6 §2.4) | **Veraltet seit 01.10.2026.** Meta berechnet Service-Nachrichten ab der 1.001. pro Monat und Nummer, Utility auch im offenen Fenster. Deutschland: **0,0456 € pro Utility- bzw. Service-Nachricht** (EUR-Rate-Card ab 01.10.2026). Nur das „Free Entry Point“-Fenster (bis 7 Tage nach Antwort im Service-Fenster) bleibt frei. | developers.facebook.com/docs/whatsapp/pricing; Rate-Card-Tracker keaz.app, chatmaxima |
| 4 | Preis 4,99 €/Monat trägt das Modell | Rechnung mit den Zahlen aus B6: 68 Templates/Familie/Monat × 0,0456 € ≈ **3,10 €** WhatsApp-Kosten im ungünstigsten Fall. Bei 4,99 € minus 15 % Store-Gebühr bleiben ≈ 4,24 €, also rund 1,10 € vor LLM, Hosting, DSB und Steuer. Mit Quick-Reply-Buttons und FEP-Fenster sinkt das, aber die Marge hängt an Nutzerverhalten. Preisanker der direkten Konkurrenz: Hermo 4 £, Fambot gratis in der Beta, später „etwa Netflix-Preis“. | eigene Rechnung aus belegten Raten |
| 5 | Zielgruppe „Babyphase“ hat den Zettel-Schmerz | Der Kern-Use-Case (Kita-/Schulzettel, Elternbriefe, Kurse absagen) entsteht erst mit Kita und Schule. Betreuungsquote unter 3 Jahren 37,2 % (01.03.2026), im ersten Lebensjahr nur ein kleiner Bruchteil davon [genaue Zahl nicht live geprüft]. Das Namore-Publikum (Schwangere) hat die Logistik also 1–3 Jahre **später**. Die Storyboard-Familie hat bezeichnenderweise einen 7-Jährigen als Zettel-Quelle. | Destatis PM 26/342 |
| 6 | U-/Impf-Reminder sind ein Differenzierer | Frequenz ist gering (U2–U7 im ersten Jahr, wenige Impftermine), die Arztpraxis vergibt die Termine ohnehin, und gelöste Einzel-Apps gibt es (B4 §3 sagt selbst „als Differenzierer schwach“). Es ist ein Lead-Magnet, kein Grund für ein Abo. | B4 §3 |
| 7 | „Kind krank“-Knopf ist USP | Kita-Apps besitzen die Krankmeldung bereits (B4 §1). Viele Einrichtungen erwarten Anruf oder App. Bleibt der Nutzen bei Kursen/Vereinen: selten, aber haftungs- und datenschutzsensibel (Art. 9, falscher Empfänger). Ein Feature, kein Kaufgrund. | B4 §1, B6 §4.4 |
| 8 | Phase-0-Ziel „300 Wartelisten-Einträge“, „40 % zahlen ≥ 3 €“, „20 % Trial-to-Paid“, „40 % W4-Retention“ | Alle Zielwerte sind laut A13.3 Annahmen des Assistenten, ohne Benchmark. Umfrage-Zahlungsbereitschaft ist kein Zahlungsbeleg. Wie viele Namore-Nutzer pro Monat einen CTA sehen würden, steht nirgends. | A13.3; Namore-Zahlen nicht gezogen (kein RevenueCat-Zugriff in diesem Thread) |
| 9 | MVP in 7 Wochen (23.11.–10.01.) bei 1–2 h/Tag | Das sind etwa 50–100 Stunden, über Weihnachten, mit Neugeborenem. Darin: Google-OAuth-Verifizierung (Wochen), Meta-Business-Verifizierung, Template-Freigaben, Vision-Benchmark, Consent-System, DSFA-Entwurf, Anwalts-Check. Nicht realistisch. Laut Projektgedächtnis ist das Budget eher ~1 h/Tag, nicht 1–2 h. | B5, B6, B9 |
| 10 | Der Fahrplan basiert auf belastbaren Lehren | Er stützt sich auf 33 Reposts von Julians eigenem X-Feed (Indie-Hacker-Erfolgsgeschichten, Survivorship Bias). Einige wurden nur angelesen, die Links „nicht geprüft“ (README). Taugt als Ideenliste, nicht als Evidenz. | B9 Datenbasis, README |

Kleinere Punkte:
- **Maple:** Dokument sagt „schließt 31.12.2026“, Ledger sagt „acqui-hired Jul 2026“. Beides stimmt (Wander hat am 29.07.2026 das Team übernommen; Sunset 31.12., laut einem Tester in der App teils 30.11.). Kein Widerspruch, aber der Hebel „Maple-Wechsler“ ist US-Publikum und läuft in Wochen aus.
- **Ledger-Wissen fehlt im Dokument:** Yohana (Panasonic) Jan. 2026 eingestellt, Skylight ~300 Mio. $ Umsatz mit Hardware, Cozi/FamilyWall im Rollup. Diese Friedhofs- und Gewinnerdaten sollten in B3 stehen.
- **Fambot-Stand bestätigt:** 13 Bewertungen, 5,0, nur Englisch, Beta gratis, Gmail/Outlook/Hotmail + WhatsApp-Gruppen (App Store US, 22.10.). Die Schwäche „nur lesend“ stimmt.

---

## 3. Fehlende Risiken und offene Fragen

1. **Hermo als direkter Konkurrent in DE.** Wie gut ist Hermo auf Deutsch wirklich (Kita-Mails, Elternbriefe, Amtsdeutsch)? Hat es deutsche Nutzer? Ohne diese Antwort ist die Positionierung leer. *Billigster Check: selbst 30 Minuten mit Hermo DE testen.*
2. **DSB-Pflicht als Fixkosten.** Wenn die Verarbeitung DSFA-pflichtig ist, muss nach § 38 Abs. 1 S. 2 BDSG unabhängig von der Mitarbeiterzahl ein Datenschutzbeauftragter benannt werden. Das ist bei Kinder-Gesundheitsdaten wahrscheinlich und ein externer DSB kostet laufend Geld. B6 markiert das nur als [unsicher]; es gehört in die Kostenrechnung. *(Rechtliche Einschätzung, keine Rechtsberatung.)*
3. **Supportlast (Regel 0) wird nirgends geschätzt.** Fehlextraktion, doppelte Termine, OAuth-Token abgelaufen, WhatsApp-Nachricht nicht angekommen, Partner hat Opt-in nicht gemacht: Das sind synchrone, emotionale Tickets („Wir haben die U6 verpasst“).
4. **Abhängigkeit von zwei Plattformen mit Preis- und Policy-Macht.** Meta hat 2025/26 zweimal die Spielregeln geändert (KI-Chatbot-Klausel ab 15.01.2026, Service-Gebühren ab 01.10.2026). Ein aufgabenbezogener Bot ist laut Meta nicht betroffen, aber „primary functionality“ entscheidet Meta „in its sole discretion“. Google kann Calendar-Scopes neu einstufen.
5. **Sinkender Markt.** U3-Kinder in Betreuung −11,7 % seit 2023, getrieben durch sinkende Geburten (Destatis). Das trifft auch Namore.
6. **Kannibalisierung von Julians Zeit.** Das Ziel ist ein Portfolio kleiner Projekte. Family Bot ist ein Plattformprodukt, das das Jahr frisst, und konkurriert direkt mit drei offenen Tests (Family-Faces-Set, Malbuch-App, Couples-Question-App) um dieselben Stunden.
7. **Scope-Drift im Material selbst.** Drei MVP-Fassungen (A6), Mockups folgen einer vierten Reihenfolge, das Storyboard führt Kinder-Accounts (Ben, 7) ein, obwohl die Architektur „Nutzung ab 18“ vorsieht und die Zielgruppe Babys sind. Das ist ein Zeichen, dass noch kein Kernproblem gewählt ist.
8. **Haftung im Text der Übergabe.** „Gesundheitsbegriffe nie im Template“ (B6 §5.5) und „Partner muss wissen, dass morgen U6 ist“ widersprechen sich. Das ist eine Produktfrage, keine Technikfrage.
9. **Apple-Nutzer.** In DE ist der iPhone-Anteil hoch; ohne Zwei-Wege-Sync für iCloud bleibt für viele Paare nur das ICS-Abo, das langsam aktualisiert. Wie viele Namore-Paare nutzen Google Kalender? Unbekannt.

---

## 4. Durch die STATE-Regeln

| Regel | Ergebnis | Begründung |
|---|---|---|
| Schritt 1 Ledger | **Treffer** | „Family organizer (FamilyWall / Cozi) ⛔“ und STATE „off the table: family organizers“. Neuer Screen nur für den KI-Agent-Dreh gerechtfertigt. |
| 0 Operator fit | **⛔ capacity** | Kalender-Sync + WhatsApp + Vision-LLM + Art. 9 + DSFA/DSB. Bei 100 Familien realistisch mehr als 5 h Support pro Woche [Schätzung, kein Wettbewerber-Forum ausgewertet]. Gilt als „capacity“, nicht als Evidenz gegen die Idee. |
| 1 Distribution | 🟡 | Namore-Kanäle erreichen werdende Eltern, aber die zahlende Zielgruppe (Kita-/Schulfamilien) erst Jahre später. TikTok-SEO auf „U3 Untersuchung wann“ ist plausibel. |
| 2 Payback | ⛔ / unbewiesen | ≥ 500 €/Monat in 90 Tagen heißt ~120 zahlende Familien bei 4,99 € (vor Kosten). WhatsApp allein frisst bis zu ~3 €/Familie. Konkurrenz ist gratis oder 4 £. Kein Zahlungsbeleg vorhanden. |
| 3 Mechanik | n/a | Kein Double-Blind-Swipe. |
| 4 Moat (pre-launch) | schwach | Familienprofil und Kalenderhistorie wären „Decision by-product“, aber jeder Konkurrent sammelt dasselbe. Nichts, was nicht aufgeholt werden kann. |

Roast Room: bewusst nicht gelaufen. Das ist ein Review, und die Regel-0-Entscheidung beruht auf Kapazität, die der Rat nicht überstimmen kann. Auf Wunsch nachholbar.

---

## 5. Was ich priorisieren und was ich streichen würde

**Streichen (für dieses Jahr):**
- Kind-krank-Knopf, Notfall-Modus, PayPal, Amazon, Essensplanung, Tagebuch, Kinder-Accounts, Haustiere, Geschenke, Großeltern-Rollen, Telegram, Outlook/CalDAV, eigenes Web-Postfach.
- Den 4-Phasen-Fahrplan mit MVP bis 10.01. Er ist für 1 h/Tag nicht machbar.
- Den Anspruch „einziger deutscher Familien-Agent“ in jedem Text.

**Behalten, als Test statt Produkt:**
- Das Versprechen „Zettel fotografiert, Termin ist bei euch beiden“ als **Content-Test**. Es kostet keinen Code.
- Den **U-/Impf-Plan als kostenlosen Lead-Magneten**: Geburtsdatum rein, ICS-Kalenderabo für beide Eltern raus, Berechnung im Browser, nichts gespeichert. Keine Art.-9-Datenhaltung, ein Wochenende Arbeit, passt in Namores Funnel und baut eine Liste, falls Family Bot später doch kommt.

**Priorität, falls Julian trotzdem weitermachen will:**
1. Hermo DE selbst testen (30 Min.). Wenn es Julians eigenes Problem löst, ist das die Antwort.
2. Zahlungsbeleg statt Umfrage: Landingpage mit **bezahlter Vorbestellung** (z. B. 29 €/Jahr Gründerpreis), nicht „würde 3 € zahlen“.
3. Erst bei Beleg: „Concierge“-Beta mit 5 Familien, bei der Julian die Extraktion halb manuell prüft (n8n + LLM + Google Kalender, ohne WhatsApp, Bestätigung per Mail). So misst man Fehlerquote und echte Nutzung, bevor man Meta, DSFA und Sync baut.

---

## 6. Billigster Test, der die Idee killt

**14 Tage, keine App:**
- 15–20 Slideshows/Reels auf den bestehenden Accounts, drei Hooks: Zettel → Termin bei beiden; „Welche U-Untersuchung steht an?“; „Wer holt morgen ab?“.
- Landingpage mit Demo-GIF aus dem P1-Mockup und **29 € Vorbestellung für ein Jahr** (Rückerstattung zugesagt, falls kein Launch).
- Parallel der kostenlose U-/Impf-ICS-Generator als zweiter CTA.

**Kill-Kriterium:** unter 20 bezahlte Vorbestellungen bis **06.11.2026** → Family Bot bleibt geparkt, der ICS-Generator läuft als Namore-Lead-Magnet weiter.
**Weiter-Kriterium:** ≥ 20 Vorbestellungen und Hermo-Test zeigt eine echte Lücke auf Deutsch → Concierge-Beta mit 5 Familien.

---

## 7. Ledger-Zeile (zum Einfügen)

**Aktuell (Runde 2):**

| Family Bot – KI-Familienkalender DACH (2026-10-22, Review) | 🟡 SPLIT, side income | **Ledger:** Kategorie „Family organizer“ schon ⛔; ein neuer Screen ist nur für den KI-Keil gerechtfertigt. **Nachfrage:** geteilter Familienkalender bewiesen (Cozi 399K Ratings), KI-Schicht nicht (Fambot 13, Sense 39 Ratings/2.000 Familien bei 6,99 $, Hermo ohne öffentliche Zahlen, Gmail- und Google-only, keine App). **Keil:** Familien-Mailadresse für jeden Anbieter (GMX/Web.de/Outlook) + Apple per ICS + Design + Rückfrage; keine Gesundheitsdaten, keine Aktionen nach außen. **Regel 0:** Gesamtplan capacity-⛔, Keil machbar. **Regel 2:** WhatsApp DE 0,0456 €/Nachricht → nur für Partner 2, Preis 6,99 €/49 €. Kill-Test: 49 €/Jahr Vorbestellung + 15–20 Slideshows, unter 20 bezahlt bis 08.11.2026 parkt es; vorher Extraktions-Benchmark mit 50 Kita-Zetteln ≥ 90 %. Council: nicht gelaufen. Siehe [[00 Review - Unabhängige Validierung (2026-10-22)]] |

**Überholt (Runde 1):**

| Family Bot – KI-Familienassistent DACH (2026-10-22, Review) | ⛔ side income (Build) / 🟡 Test | **Ledger:** Kategorie „Family organizer“ schon ⛔. **Regel 0 (capacity):** Zwei-Wege-Kalender-Sync, WhatsApp Cloud API, Vision-LLM, Art.-9-Kinderdaten mit DSFA/DSB passen nicht in ~1 h/Tag. **Differenzierung widerlegt:** Hermo gibt es auf Deutsch in WhatsApp (Gmail, Fotos, Sprachnotizen, Briefing an beide, DB Frankfurt, 0/4/45 £). **Regel 2:** WhatsApp DE seit 01.10.2026 0,0456 €/Utility- und Service-Nachricht → bis ~3,10 €/Familie/Monat bei 4,99 € Preis; Fambot gratis. Kita-Zettel-Schmerz kommt 1–3 Jahre nach dem Namore-Moment (U3-Betreuungsquote 37,2 %). Kill-Test: 29 €-Vorbestellung + 15–20 Slideshows, unter 20 bezahlt bis 06.11.2026 killt es; U-/Impf-ICS als Lead-Magnet. Council: nicht gelaufen (Review). Siehe [[00 Review - Unabhängige Validierung (2026-10-22)]] |
