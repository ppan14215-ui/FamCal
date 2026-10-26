# Family Bot – Spec v1: der Familienassistent, der Aufgaben und Stress abnimmt (23.10.2026)

> Grundlage: Fahrplan v3 (23.10.), User Journey, Grok-Review-Analysen 02/04, 02/05, 02/06 (2.072 gelabelte von 161.215 Reviews), Hermo-Vergleich, Design-System v2 „Notion-Stil“, Prio-2-Skizzen, Architektur (03) und meine Reviews vom 22.10.
> Teil A ist die Neubewertung, Teil B die Spec. Zahlen aus den Grok-Dateien habe ich übernommen und **nicht** live nachgeprüft. Selbst geprüft (22.10.) sind nur die WhatsApp-Preise DE und die Hermo-Fakten.
> Richtung laut Julian: echter Familienassistent, der Aufgaben und Stress übernimmt. Keine Kita-Orga-App. Kita, Schule und Arzt sind nur eine Eingangsquelle unter vielen.

---

## Teil A – Neubewertung des Projektplans

### A1. Urteil in einem Satz
**GO für einen geschnittenen MVP als Nebeneinkommen.** v3 ist inhaltlich der beste Stand bisher, und die Review-Daten stützen ihn ehrlicher als frühere Versionen. Für ~1 h am Tag ist v3 aber etwa doppelt so groß wie machbar, und das Bezahlmodell fehlt noch. Beides löst diese Spec.

### A2. Was sich gegenüber meinem Urteil vom 22.10. geändert hat
| Punkt | 22.10. | Jetzt | Warum |
|---|---|---|---|
| Produktform | WhatsApp-Bot, Gefahr „Hermo-Klon“ | eigene App, Kanäle nur für Hinweise | Hermo hat keine App, keine Reviews, keine öffentliche Traktion. Eine gut gemachte App ist ein echter Unterschied |
| Kosten WhatsApp | Hauptrisiko | beherrschbar | Push ist Standardkanal, WhatsApp wird Bezahl-Feature (siehe B7) |
| Kita-Schmerz kommt spät | Kritik | entfällt | Kita ist nur noch eine Quelle; Wert entsteht ab Tag 0 aus dem Familienprofil |
| Nachfrage | Kalender belegt, KI-Schicht nicht | Erinnerungen belegt, Proaktivität nicht | v3 §3.4 zählt es sauber: 44 Lob-Labels für Erinnerungen, **0** Wünsche nach „Vorausdenken“ |
| Kapazität | NO-GO | lösbar, wenn der Umfang halbiert wird | siehe A4 |

### A3. Was die Review-Daten wirklich hergeben
Belegt (übernehme ich als harte Anforderungen):
1. **Zuverlässigkeit schlägt Funktionsumfang.** KI-Apps verlieren Nutzer durch falsche Erkennung („remind me on the wrong days“, Ohai) und fehlgeschlagene Importe (Nori). Milo wurde im Jan. 2026 genau daran eingestellt.
2. **Paywall vor dem ersten Erfolg ist Churn-Grund Nr. 1** (12 von 20 Churn-Nennungen bei KI-Apps). Das heißt nicht „alles gratis“, sondern: nichts sperren, bevor der Nutzer den Wert erlebt hat, und nichts nachträglich wegnehmen (Cozi-Shitstorm 2024).
3. **Erinnerungen, die sich von selbst melden und offen bleiben, bis jemand „erledigt“ sagt**, werden gelobt.
4. **Teilen zwischen den Eltern** ist der Lob-Treiber Nr. 1 bei Organizern (174 von 600).
5. **Nicht nerven.** Nagging und Werbung sind ein klarer Schmerz.
6. **Bestehende Kalender anbinden** statt einen eigenen zu bauen (Sync-Probleme = 4 Churn-Nennungen bei KI-Apps; Wunsch iCloud).

Nicht belegt (bleibt Hypothese, wird in der Beta gemessen):
- Dass Eltern einen Assistenten wollen, der *ungefragt* vorausdenkt. Das ist aber Julians eigentliches Versprechen. Darum wird es nicht weggestrichen, sondern früh und billig getestet (B9).
- Zahlungsbereitschaft für irgendetwas davon in DACH. Hier gibt es nur Proxys (Huckleberry, FamilyWall verdienen; Ohai ca. 1 Tsd. $ MRR, Nori < 10 Tsd. $ MRR laut Grok-Schätzung).

Ignoriert auf Julians Wunsch: der Opportunity-Scan-Vorschlag „Kita/Schul-Layer“. Er hätte ohnehin eine schwache Zahlungsbereitschaft (1,2 % Zahlungs-Nennungen, 0 „würde zahlen“ in 6.565 Schul-App-Reviews).

### A4. Was am Plan v3 nicht trägt
1. **Umfang vs. Zeit.** v3 plant 9 Screens, WhatsApp, Push, E-Mail-Eingang, Vision-Erkennung, Google- und ICS-Sync und einen Bot-Chat in KW 45–50. Das sind sechs Wochen, also bei ~1 h am Tag rund **40–50 Stunden**. Realistisch ist mit Claude Code etwa die Hälfte davon in guter Qualität. Weil Zuverlässigkeit das Hauptversprechen ist, ist „alles halb“ hier schlimmer als „wenig, aber richtig“. → Schnitt in B4.
2. **Das Bezahlmodell fehlt.** R4 („Profil, Erinnerungen, Vorschau, Erfassen dauerhaft gratis für beide Eltern“) lässt fast nichts übrig, wofür jemand zahlt, und der Preistest kommt erst ab KW 2/2027. Für die Projektregel 2 (≥ 500 €/Monat in 90 Tagen) ist das zu spät. → Modell in B7, Bezahl-Signal schon auf der Landingpage.
3. **Die laufenden Kosten sitzen genau im Gratis-Kern.** Erfassen (Vision-LLM) und proaktive WhatsApp-Nachrichten kosten pro Nutzung Geld. 1 proaktive WhatsApp pro Tag an beide Eltern sind 2 × 30 × 0,0456 € = **ca. 2,70 € pro Familie und Monat**, nur für Hinweise. Gratis geht das nicht. → Push gratis, WhatsApp und unbegrenztes Erfassen im Plus.
4. **Kita-Drift steckt noch in der Journey.** Der Aha-Moment ist ein Kita-Zettel, die Empfehlung kommt aus der Kita-WhatsApp-Gruppe, der Höhepunkt ist eine Kita-Terminverschiebung. Wer das liest, sieht wieder eine Kita-App. → Aha-Moment aus dem Profil (B3).
5. **Gesundheitsdaten.** „U5 abgehakt“ und Impfstatus sind Gesundheitsdaten (Art. 9 DSGVO). Damit wird eine DSFA (Art. 35) wahrscheinlich, und daran hängt nach § 38 BDSG ein Datenschutzbeauftragter. Das ist für ein Ein-Personen-Nebenprojekt unverhältnismäßig. → Im MVP nur die regelbasierte Zeitleiste aus dem Geburtsdatum, der Erledigt-Status bleibt auf dem Gerät (B8).
6. **Der Name.** „Family Bot“ liegt sehr nah an **Fambot** (fambot.com, 3,5 Mio. $ Pre-Seed, App im Store). Für Store-Suche, SEO und Markenrecht ist das ein Problem. Vor der Landingpage einen eigenen Namen wählen. Arbeitsname hier weiter „Family Bot“.
7. **Plattform-Risiko.** Meta Muse (Agent in WhatsApp, kann senden und buchen), Gemini und Apple Intelligence werden „erinnere mich an …“ mitliefern. Die Verteidigung ist nicht die KI, sondern das **Familiengedächtnis** (Profil, Routinen, Verlauf, wer was macht), das kein Plattform-Assistent für zwei Eltern gemeinsam hält. Daran misst sich jede Funktion.

### A5. Projektregeln (STATE) kurz
| Regel | Ergebnis |
|---|---|
| 0 Operator fit | **besteht mit Schnitt.** Kein Live-Support, keine ausgehenden Aktionen, Fehler über „falsch erkannt“-Knopf statt Mail. Schätzung: 3–6 Tickets pro Woche bei 100 Familien (Annahme) |
| 1 Distribution | **besteht.** Julians DE-Elternkanäle (TikTok, Instagram, Pinterest), Namore als Zusatz, Partner-Einladung als eingebauter Kanal |
| 2 Payback | **offen.** 500 €/Monat sind etwa 120 Plus-Abos zu 4,99 € (nach Store-Gebühr). Unbelegt, daher Bezahl-Signal vor dem Bau (B9) |
| 3 Mechanik | nicht anwendbar (kein Double-Blind-Swipe) |
| 4 Moat | **besteht als Hypothese.** Familiengedächtnis und Verlauf sind Daten, die niemand nachträglich herstellen kann |

**Label:** Nebeneinkommen, kein Jobersatz.

---

## Teil B – Spec

### B1. Produktversprechen
**„Der Assistent, der eure Familie kennt, an alles denkt und euch beiden sagt, wer was wann erledigt.“**

Drei Dinge nimmt er den Eltern ab:
1. **Merken:** Alles Wiederkehrende und Absehbare (Vorsorge, Geburtstage, Ferien, Routinen, Fristen) kennt er selbst, ohne Eingabe.
2. **Erfassen:** Foto, PDF, Text, Sprachnotiz oder Weiterleitung rein, geprüfter Eintrag raus. Egal ob Kita-Zettel, Arztbrief, Einladung zum Kindergeburtstag, Handwerkertermin oder Vertragsmail.
3. **Nachhalten und verteilen:** Jede Aufgabe hat eine Person, bleibt offen, bis sie erledigt ist, und meldet sich zur richtigen Zeit beim Richtigen. Beide Eltern sehen dasselbe.

Was er **nicht** tut (MVP): Er sendet nichts in fremdem Namen, bucht nichts, zahlt nichts und gibt keine medizinischen Ratschläge. Er bereitet vor, die Eltern drücken den Knopf. Das ist billiger, haftungsarm und laut Reviews genau das, was Vertrauen schafft.

Zielgruppe: Eltern-Paare in DE (zuerst Bayern wegen der Ferien-Daten), Kinder 0–10 Jahre. Nutzer null ist Julians Familie.

### B2. Prinzipien (aus den Reviews, verbindlich)
| # | Regel | Abnahmekriterium |
|---|---|---|
| R1 | **Nie still handeln.** Jede Erkennung wird zurückgelesen, unsichere Felder sind markiert statt geraten, jede Aktion hat Undo. „Erledigt“ und „eingetragen“ nur, wenn es wirklich so ist | 0 Phantom-Bestätigungen in 200 Testaktionen |
| R2 | **Nachrichtenbudget.** Max. 1 proaktive Nachricht pro Tag und Person + Sonntags-Vorschau + echte Fristen. Ruhezeiten. „Weniger davon“ wirkt sofort | Budget technisch erzwungen, nicht nur Vorgabe |
| R3 | **Sichtbares Gedächtnis.** Alles, was der Assistent weiß, steht im Profil und ist dort änderbar und löschbar. EU-Hosting, Kinderdaten minimal | „Was weißt du über uns?“ zeigt 100 % der gespeicherten Fakten |
| R4 | **Erst Wert, dann Preis.** Nichts wird gesperrt, bevor der erste Erfolg da war. Nichts Gratis wird später weggenommen | Paywall frühestens nach 3 bestätigten Einträgen oder Tag 7 |
| R5 | **Kalender anbinden, nicht ersetzen.** | Abo-Link (ICS) funktioniert in Apple, Google und Outlook |
| R6 | **Export ab Tag 1.** Lehre aus Maple und Milo | Ein Knopf: alles als ICS + JSON |

### B3. Der Aha-Moment (neu, ohne Kita)
Onboarding mit 4 Pflichtfeldern: Eltern-Vornamen, Kind(er) mit Geburtsdatum, Bundesland. Daraus entsteht **sofort und ohne weitere Eingabe** die erste Woche und das erste Jahr:
- nächste U-Untersuchung mit Zeitfenster (G-BA, regelbasiert, mit Quelle),
- Geburtstage der Familie (optional: Großeltern),
- Schulferien und Feiertage im Bundesland,
- Vorschläge: „Soll ich an die Zahnarzt-Kontrolle alle 6 Monate erinnern?“, „Wer kümmert sich um Omas 70.?“.

Danach die zweite Wow-Stufe: **das erste Foto** (beliebiges Dokument) wird zum geprüften Eintrag mit Zuständigem, und daraus kommt die Partner-Einladung („Tom ist zuständig – einladen?“).

Ziel: Wert in unter 60 Sekunden, ohne dass der Nutzer etwas fotografieren muss. Das löst auch das Risiko „leere zweite Woche“ aus der Journey.

### B4. Umfang: MVP-Schnitt
| Funktion | MVP (v0.1) | v0.2 | später / gestrichen |
|---|---|---|---|
| ① Familienprofil + „Was weiß der Assistent“ | ✔ | | |
| ② Heute/Woche inkl. Sonntags-Vorschau | ✔ | | |
| ③ Aufgaben mit Zuständigem, Frist, wiederkehrend, bleibt offen bis erledigt | ✔ (einfache Wiederholung „jeden Di“) | Vorabend-Hinweise aus Routinen | |
| ④ Routinen-Editor | über ③ abgedeckt | eigener Editor + erkannte Muster vorschlagen | |
| ⑤ U-Zeitleiste aus Geburtsdatum | ✔ Erinnerung; Status nur auf dem Gerät | Impf-Kalender STIKO | Impfstatus auf dem Server (erst mit DSFA) |
| ⑥ Geburtstage + Geschenk-Gedächtnis | ✔ Erinnerung + Notiz „letztes Jahr“ | Geschenkideen-Vorschlag | |
| ⑦ Erfassen: Foto, PDF, Text, Teilen-Menü | ✔ | Sprachnotiz, Mail-Weiterleitungsadresse | |
| ⑧ Bot-Chat | Freitext im Erfassen-Feld („Do holt Oma ab“) | echter Chat inkl. Fragen an das Gedächtnis | |
| ⑨ Kalender | ICS-Abo-Link (lesend, alle Kalender) | Google zwei-wegig | Outlook/Graph |
| Kanäle | Push + E-Mail (Sonntags-Vorschau) | WhatsApp (Plus) mit Schnellantwort + Deep-Link | Großeltern nur per Link/WhatsApp |
| Entwürfe („Ich hab dir die Krankmeldung/Absage/Antwort vorbereitet“) | | ✔ Text zum Kopieren/Teilen | |
| Ferien- und Betreuungsplanung (Prio-2) | | | v0.3, stärkster Stress-Hebel nach dem MVP |
| Fristen-Radar, Verträge, Verlängerungen | | v0.2 als Teil von ⑦ | |
| Medikamente | | | später (Gesundheitsdaten) |
| Essensplanung, Einkaufsliste | | | gestrichen (gelöst: Bring!) |
| Notfall-Modus, PayPal-Budget | | | gestrichen (Haftung, Zahlungsrecht) |
| Familien-Tagebuch für Großeltern | | | gestrichen (kein Stress-Thema) |
| Abend-Übergabe | | | gestrichen (v3) |

Begründung des Schnitts: Der MVP enthält genau das, was die Reviews belegen (Erinnern, Erfassen, Teilen, Übersicht), plus den billigsten Test der Proaktivität (Sonntags-Vorschau und Fristen per Push). Alles Teure (WhatsApp, Zwei-Wege-Sync, Chat) kommt erst, wenn die Beta zeigt, dass es genutzt wird.

### B5. Verhalten des Assistenten
**Zustände eines Eintrags:** `Vorschlag` → (bestätigt) → `Offen` (mit Zuständigem) → `Erledigt` | `Verschoben` | `Verworfen`. Ein Vorschlag erscheint nie im Kalender.

**Read-back-Karte** (Notion-Stil, Property-Rows):
```
📄 Aus: Foto vom 23.10., 07:36
Was      Laternenfest
Wann     Do 5.11., 17:00   ⚠ Jahr ergänzt
Wer      Ben · zuständig: [Tom] [Julia] [beide]
Mitgeben Laterne, Teelicht
[Eintragen]  [Ändern]  [Verwerfen]
```
Regeln: Fehlt ein Wert oder ist er erschlossen, wird er gelb markiert. Mehrere Termine in einem Dokument erscheinen als Liste mit Einzelbestätigung. Eine Änderung an einem bestehenden Eintrag erscheint immer als **Vorher/Nachher**.

**Proaktive Nachrichten** (Typ, Zeitpunkt, Budget):
| Typ | Wann | zählt zum Budget |
|---|---|---|
| Sonntags-Vorschau („4 Termine, 3 Dinge ohne Zuständigen“) | So 18:00, an beide | nein (fest, 1×/Woche) |
| Frist-Warnung | 7/2/0 Tage vorher, nur für den Zuständigen | nein, max. 1/Tag |
| Vorabend-Hinweis („Morgen Turnen, Beutel“) | 19:00 | ja |
| Offene Aufgabe ohne Zuständigen | 1× am Folgetag | ja |
| Vorschlag aus dem Profil („U6 ab 10.12. buchbar – wer ruft an?“) | Beginn des Zeitfensters | ja |

Jede Nachricht hat Schnellaktionen (`erledigt`, `ich mach's`, `später`, `weniger davon`) und einen Deep-Link auf den passenden Screen. Ruhezeiten Standard 21–7 Uhr.

**Sprache und Ton:** kurz, freundlich, keine Emojis-Flut, nie belehrend. Kein „Ich bin nur eine KI“. Bei Unsicherheit fragt er.

### B6. Datenmodell (Kern)
- `family` (Bundesland, Zeitzone, Plan)
- `member` (Rolle: Elternteil, Kind, Betreuer; Name, Geburtsdatum, Kanal-Präferenzen, Ruhezeiten)
- `place` (Kita, Schule, Arzt, Verein; optional)
- `item` (Typ: Termin, Aufgabe, Frist; Status; Zuständiger; Wiederholungsregel; Quelle; Vorher/Nachher-Historie)
- `capture` (Upload, Erkennungs-JSON, Konfidenz pro Feld; Original wird nach Bestätigung, spätestens nach 24 h gelöscht)
- `fact` (Gedächtnis: „Oma bekam 2025 ein Fotobuch“, Herkunft, löschbar)
- `nudge_log` (gesendet, Kanal, Reaktion, „hilfreich/egal/störend“) → Grundlage für Budget und Messung
- `consent` (Version, Zeitpunkt, je Elternteil)

Alle Tabellen mit Row Level Security pro `family_id`. Gesundheitsbezogene Status (U erledigt) werden im MVP nur lokal auf dem Gerät gespeichert.

### B7. Preis- und Kostenmodell
| | Gratis (dauerhaft, beide Eltern) | Plus 4,99 €/Monat oder 39 €/Jahr pro Familie |
|---|---|---|
| Profil, Woche, Aufgaben, Vorschau, U-Zeitleiste, Geburtstage, Ferien | ✔ | ✔ |
| Erfassen per Foto/PDF | 15 pro Monat | unbegrenzt (Fair Use) |
| Kanäle | Push, E-Mail | + WhatsApp mit Schnellantwort |
| Kalender | ICS-Abo | + Google zwei-wegig (v0.2) |
| Routinen-Hinweise, Fristen-Radar, Entwürfe | Basis | voll |
| Großeltern/Betreuer per Link | – | ✔ (v0.3) |

- Plus wird erst nach dem ersten Erfolg angeboten (R4), 14 Tage Plus gratis ab Tag 3.
- **Gründer-Angebot auf der Landingpage:** 1. Jahr Plus für 29 € als Vorbestellung. Das ist das Bezahl-Signal für Regel 2.
- Kosten pro Plus-Familie und Monat (Annahmen, im Betrieb messen): WhatsApp ca. 2,70 € bei voller Nutzung, Erkennung ca. 0,30–0,60 € bei 40 Fotos, Infrastruktur anteilig < 0,20 €. Marge bleibt positiv, aber WhatsApp ist der größte Posten. Darum: WhatsApp-Hinweise nur, wenn Push nicht reagiert wurde, und Antworten im Service-Fenster bündeln.
- Abrechnung über Store-Abos (RevenueCat wie bei Namore). Kündigung mit einem Tipp, kein Rückwirkend-Sperren.

### B8. Technik (Vorschlag, bewusst klein)
- **App:** gleicher Stack wie Namore, damit Julian nichts Neues lernen muss (Store-App mit nativem Push; PWA nur, wenn Namore auch eine ist). Design-System v2 „Notion-Stil“ ist gut und bleibt: eine Akzentfarbe, Property-Rows, Tab-Leiste Heute · Aufgaben · Eingang · Assistent · Familie.
- **Backend:** Supabase EU (Frankfurt): Postgres + RLS, Auth (Apple/Google/Magic Link), Storage mit TTL, `pg_cron` + Queues für Erinnerungen. Kein n8n im MVP (eine bewegliche Komponente weniger).
- **Erkennung:** Vision-LLM über einen EU-Endpunkt ohne Speicherung (z. B. Claude über AWS Bedrock Frankfurt oder Vertex EU), Ausgabe als festes JSON-Schema mit Konfidenz pro Feld. Datumsauflösung (ohne Jahr, „nächsten Mi“) regelbasiert nach der Erkennung, nicht im LLM.
- **Regelbasiert statt LLM:** U-Zeitleiste (G-BA), Ferien/Feiertage (offizielle Daten pro Bundesland), Wiederholungen, Budget. Das LLM darf erklären, aber nicht entscheiden.
- **DSGVO-Minimum für den MVP:** AV-Verträge (Supabase, LLM-Anbieter, später Meta), Datenschutzerklärung in Klartext, Einwilligung beider Eltern, Lösch- und Exportfunktion, keine Gesundheitsstatus auf dem Server. Kurzer anwaltlicher Check, bevor WhatsApp oder Impfstatus dazukommen.

### B9. Validierung und Abbruchkriterien
Reihenfolge so, dass das Teuerste zuletzt gebaut wird:

1. **KW 44: Name + Landingpage** mit den v2-Screens. Variante A „Der Assistent, der an alles denkt“ vs. B „Fotos und Mails werden zu Terminen für euch beide“. Warteliste + Gründer-Angebot 29 €. Verkehr aus Julians eigenen Kanälen (2–3 Posts/Slideshows). **Kill-Signal:** < 1 % Vorbesteller bei ≥ 500 Besuchen bis 22.11. → parken.
2. **KW 44–46: Erkennungs-Benchmark** auf 50 echten Dokumenten aus mindestens 5 Quellen (nicht nur Kita). Ziel ≥ 90 % korrekte Felder, 0 erfundene Daten. Unter 80 % → Erfassen auf „Text prüfen“ reduzieren, Fokus auf Profil-Erinnerungen.
3. **Ab KW 44: Nutzer null** (Julians Familie), Hinweise zunächst von Hand. Protokoll pro Nachricht: hilfreich/egal/störend; Antworten der Partnerin getrennt.
4. **KW 45–49: MVP v0.1 bauen** (Schnitt B4). Abnahme: R1–R6-Kriterien, Onboarding < 3 Min.
5. **KW 50–51: Beta mit 10 Familien.** Metriken aus der Journey, dazu: Anteil Familien, in denen der Partner in Woche 2 noch aktiv ist; Anteil proaktiver Nachrichten „hilfreich“; Anzahl „wäre ohne vergessen worden“.
6. **Abbruchkriterien:** Partner in < 5 von 10 Familien aktiv → Zwei-Eltern-Versprechen fällt, neu denken. < 50 % „hilfreich“ → nur Fristen behalten. A konvertiert nicht besser als B → als „Erfassen + Erinnern“ vermarkten, Proaktivität als Detail.
7. **Januar 2027:** Plus live schalten, 90-Tage-Uhr für Regel 2 startet.

### B10. Offene Entscheidungen für Julian
1. Neuer Name statt „Family Bot“ (Fambot-Verwechslung).
2. App-Stack: wie Namore? (Annahme: ja.)
3. Gründer-Preis 29 € für das erste Jahr ok?
4. Bundesland für den Start: Bayern zuerst?

---

## Verdict-Ledger-Zeile (zum Einfügen)
| Datum | Idee | Label | Regel-Ergebnis | Verdict | Kill-Test |
|---|---|---|---|---|---|
| 2026-10-23 | Family Bot v3: eigene App, Familienassistent, der die Familie kennt (Profil, Erinnern, Erfassen, Verteilen); Kita nur Quelle | Nebeneinkommen | 0 ✔ mit MVP-Schnitt, 1 ✔, 2 offen, 4 ✔ (Familiengedächtnis) | **GO (geschnittener MVP)**; ersetzt SPLIT vom 22.10. | Landingpage + 29-€-Gründerjahr: < 1 % Vorbesteller bei ≥ 500 Besuchen bis 22.11.2026 → parken; vorher Erkennungs-Benchmark ≥ 90 % auf 50 Dokumenten |
