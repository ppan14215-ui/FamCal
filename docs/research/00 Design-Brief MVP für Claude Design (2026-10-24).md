# Design-Brief MVP: Familienassistent (für Claude Design, 24.10.2026)

> Grundlage: `00 Spec v2` (inkl. Nachtrag 24.10.) und `04 Onboarding & Mockups/v2 Notion-Stil/design-system.md`. Arbeitsname: noch offen. Bis zur Entscheidung im Design „App“ und das Maskottchen als Platzhalter verwenden.

## 1. Worum es geht
Eine Familien-App mit eingebautem Assistenten für **beide Eltern als Team**. Der Assistent kennt die Familie, denkt an alles Wichtige, meldet sich nur, wenn es zählt, und schreibt lästige Nachrichten vor. Gesendet wird von den Eltern.
**Gefühl:** ruhig, werbefrei, nichts verschwindet. Kein „hübscher als TimeTree“, sondern **Ruhe und Klarheit**.
**Leitbild der Assistentin:** wie Donna (*Suits*) oder Pam (*The Office*): weiß es, bevor man fragt, warm, leichter Witz, nie belehrend, kein Druck à la Duolingo.

## 2. Visuelle Regeln (aus design-system.md, verbindlich)
- Canvas `#FFFFFF`, Hintergrund und Callouts `#F7F7F5`; Text `#37352F` / `#787774` / `#9B9A97`; Divider `#EDEDEC`.
- **Eine Akzentfarbe:** Petrol `#2F6F73`, Fläche `#E4EFEF`.
- Schrift Inter/System; Titel 26/700, Abschnitt 15/600, Text 14/400, Meta 12,5.
- Bausteine: Seitenkopf mit Emoji-Icon, Property-Rows, schlichte Tabellen, Checklisten mit Undo-Leiste, Toggles, graue Tags, Callouts.
- Verboten: schwere Karten, Verläufe, Schatten, mehrere Statusfarben, Füll-Illustrationen, Formularwände.
- **Neu: Dark Mode** mitdenken.

## 3. Maskottchen (neu)
- Ein einziger süßer Charakter, **Eichhörnchen oder Biber** (Julian noch unentschieden, bitte beide skizzieren).
- Erscheint **nur, wenn der Assistent spricht**: Hinweis-Callouts, Chat, leere Zustände („Alles erledigt für heute“), Widget. Nirgends sonst.
- Stil: flach, wenige Linien, passt zur ruhigen Notion-Optik, funktioniert klein (24 px) und groß (Onboarding).
- Abgrenzung: hazelhere.com nutzt schon ein Eichhörnchen namens „Hazel“. Eigener Look und eigener Name nötig.
- Muss als KI erkennbar bleiben (EU AI Act), also kein menschliches Gesicht und kein „ich bin echt“.

## 4. Navigation
Tab-Leiste: **Heute · Aufgaben · Eingang · Assistent · Familie**, dazu **Widgets** als Hauptfläche außerhalb der App.

## 5. Screens (MVP) mit Status der Referenzen
| # | Screen | Inhalt | Vorhandene Referenz (`v2 Notion-Stil/`) | Zu tun |
|---|---|---|---|---|
| 1 | Onboarding (< 3 Min.) | 4 Pflichtfelder: Eltern, Kind(er) + Geburtsdatum, Bundesland; Partner-Einladung per Link | `00-onboarding.png` | Maskottchen ergänzen; Familien-Mail-Adresse am Ende zeigen |
| 2 | Familie / Profil | Mitglieder, Alter **in Wochen**, Ärzte, Einrichtungen, „Was weiß der Assistent“ | `01-familienprofil.png` | Ausweise/Pässe-Abschnitt ergänzen |
| 3 | Heute / Woche | Termine aus allen Kalendern + Aufgaben + Fristen; **„wer kommt / wer bringt“** sichtbar; Sonntags-Vorschau | `02-heute-woche.png` | „Wer“-Feld, Sync-Status |
| 4 | Aufgaben | Zuständiger, Frist, wiederkehrend, bleibt offen bis erledigt, Undo | `03-aufgaben.png` | wiederkehrend integrieren (Routinen-Screen entfällt als eigener Tab) |
| 5 | **Einkaufsliste** | geteilt, live, abhaken, schlicht | – | **neu** |
| 6 | Eingang | Mail an Familienadresse, geteilte Nachrichten (auch aus WhatsApp), Fotos → Vorschlag → **Read-back-Karte** → Eintrag | `07-erfassungs-inbox.png` | Beispiele **ohne Kita-Fokus**: Arzt-Bestätigung, Bürgeramt, Einladung, Vertrag |
| 7 | Read-back-Karte | Property-Rows, unsichere Felder gelb, Eintragen / Ändern / Verwerfen; Änderungen als Vorher/Nachher | Teil von `07` | Vorher/Nachher-Variante |
| 8 | **Dokumente & Fristen** | Pass-/Ausweis-Ablauf gegen geplanten Urlaub, Guthaben, Verträge | – | **neu** |
| 9 | U- und STIKO-Zeitleiste | aus Geburtsdatum, mit Quelle; „erledigt“ nur lokal | `05-u-impf-zeitleiste.png` | Hinweis „nur auf diesem Gerät“ |
| 10 | Geburtstage | Vorlauf, Notiz „letztes Geschenk“ | `06-geburtstage.png` | – |
| 11 | **Entwürfe** | Krankmeldung, Absage, Antwort; bearbeiten → „In WhatsApp öffnen“ / „Als Mail senden“ | – | **neu** |
| 12 | Assistent-Chat | Fragen, Änderungen, „Was weißt du über uns?“ | `08-bot-chat.png` | Maskottchen |
| 13 | Kalender-Sync | Google zuerst, Apple/Outlook; Status sichtbar | `09-kalender-sync.png` | – |
| 14 | Hinweis (Push) + Deep-Link | Beispiele: Vorabend für den Zuständigen, Pass vs. Urlaub, U-Fenster | `10-nudge-deeplink.png` | auf Push umstellen (keine WhatsApp-Nummer mehr) |
| 15 | **Widgets** iOS + Android | klein: Heute; mittel: Heute + 2 Aufgaben; groß: Woche | – | **neu** |
| 16 | Plus / Paywall | erst nach erstem Erfolg; „Organisieren gratis, Arbeit abnehmen = Plus“; nichts nachträglich gesperrt | – | **neu** |

## 6. Beispiel-Familie für alle Screens
Julia und Tom, Karlo (9 Wochen), Ben (6), Oma Renate. Beispiele:
- „Kinderarzt Do 9:30, **Tom bringt Karlo**“
- „Bürgeramt Reisepass Karlo, Termin fehlt, Urlaub am 14.05.“
- „U4 fällig 3.–4. Monat“
- „Einladung Hochzeit Lisa & Max, Antwort bis 15.11.“
- „Kita-Essen-Guthaben fast leer“, nur als **eines** von vielen Beispielen

## 7. Was es noch nicht gibt
Name, Maskottchen-Figur, App-Icon, Widgets, die 4 neuen Screens (5, 8, 11, 16), Dark Mode.
