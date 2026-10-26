---
name: Familienassistent (Arbeitstitel Kobel)
version: 0.2
updated: 2026-10-26
status: Entwurf von Claude aus Julians Entscheidungen bis 25.10.; Werte mit "# estimate" sind noch nicht von Julian bestätigt
colors:
  text: "#0A0A0A"
  text-sub: "#666666"
  text-mute: "#A3A3A3"          # estimate (bisher rgba(10,10,10,.28))
  bg: "#FFFFFF"
  surface: "#F5F5F4"
  hairline: "#E7E5E4"
  accent: "#0B6B6B"            # Deep Teal, nur für Aktion und Status
  accent-on: "#FFFFFF"
  warn: "#B4460B"              # Fristen, "noch 26 Tage"
  person-julia: "#F2C9C4"      # Blush
  person-tom: "#C9D9E6"        # Himmel
  clay-cream: "#F7F4EE"        # nur in Illustrationen, nicht als Seitenhintergrund
  clay-sand: "#E9DCC6"
  clay-sage: "#A9BBA3"
  clay-teal: "#075056"
typography:
  family: "Geist"
  family-mono: "Geist Mono"    # nur Uhrzeiten und Zahlen, keine Labels
  scale: [12, 14, 16, 18, 24, 30, 36]   # px
  weights: [400, 500, 600]
  body: {size: 16, line: 24}
  title: {size: 30, line: 36, weight: 600, tracking: "-0.5px"}
spacing: [4, 8, 12, 16, 24, 32, 48]
radius:
  tile: 16
  card: 24                     # Karte 24 = Kachel 16 + Innenabstand 8 (verschachtelt)
  pill: 999
elevation:
  flat: "none"                 # Standard: Flächen statt Schatten
  float: "0 0 0 1px rgba(10,10,10,.06), 0 8px 24px rgba(10,10,10,.06)"  # nur schwebende Navigation
motion:
  enter: "cubic-bezier(0.23, 1, 0.32, 1)"
  move: "cubic-bezier(0.77, 0, 0.175, 1)"
  ui-max-ms: 300
  icon-confirm-ms: [400, 700]  # estimate, nur bei seltenen Zustandswechseln
---

# DESIGN.md: Familienassistent

## Auftrag in drei Zeilen
- **Thema:** das erste Babyjahr als gemeinsamer Plan von zwei Eltern.
- **Publikum:** müde Eltern, die abends zu zweit auf dem Sofa planen und tagsüber nur kurz draufschauen.
- **Hauptaufgabe jedes Screens:** Wer macht was, und was kommt als Nächstes.

## Einfachheit (v2, Julian 26.10.: "so einfach wie möglich")
Julian hat am 26.10. die B-Varianten von Neuer Termin, Foto lesen/Verstanden und Infozettel als Standard gewählt. Diese acht Regeln gelten seitdem für jeden Screen. Quelle: Wabi (Reduktion) und Devouring Details (Interaktion), Analyse im Doc https://claude.ai/artifact/DMGtNXjqxzapeDwsx2pV14.

Aus Wabi (statisch, im Canvas umgesetzt):
1. **Farbe nur im Objekt.** Flächen sind weiß oder `surface`. Farbe tragen nur Clay-Icons (inkl. ihrer kleinen Kachel), Personen und Fristen. Große getönte Karten gibt es nicht mehr. Ausnahmen: Bühne über einem Termin, Swipe-Karte, Widget, Onboarding-Start (dort ist die Fläche das Objekt).
2. **Ein dunkles Element pro Screen**, dazu das Plus in der Leiste. Auswahl zeigt Ring (Kategorie, Tag) oder Personenfarbe (Wer), nie Dunkel.
3. **Schrittweise aufklappen.** Sichtbar ist, was fast jeder braucht (Titel, Wann, Wo, Wer). Der Rest ist eine Zeile mit Wert und Pfeil ("Mitnehmen · 4 Dinge"), seltenes steht unter "Mehr".
4. **Weniger Beschriftung.** Kein Feldname, wenn der Wert sich selbst erklärt. Keine Versal-Labels. Ergebnisse als ein Satz ("Bis 12. Dezember fehlt noch die Arbeitgeberbescheinigung.").

Aus Devouring Details (Interaktion; als Regel festgelegt, im statischen Canvas nur teilweise sichtbar):
5. **Objekt bleibt Objekt.** Was fotografiert wird, bleibt als dasselbe Blatt sichtbar: Kamera, Lesen, Verstanden, Infozettel. Später als Morph-Übergang (Foto schrumpft zum Anker).
6. **Warten am Ort.** Kein Spinner. Schritte erscheinen dort, wo das Ergebnis entsteht, und haken sich ab (Screen "Foto · Wird gelesen").
7. **Bewegung nach Häufigkeit.** Täglich gesehen: keine Animation. Wöchentlich: kurz, unter 200 ms, ease-out. Selten (Foto übernommen, erledigt, Partner beigetreten): Clay-Icon darf sich bewegen.
8. **Gesten mit Widerstand.** Erledigt nur per Tipp auf den Haken (Julian 26.10.). Text antippen macht die Zeile zum Textfeld, sonst nichts (kein Sheet, keine Chips): Menge und Notiz werden aus dem Text gelesen ("2 Hafermilch, ungesüßt"), der Bereich sortiert sich selbst, Tipp auf die Person wechselt Tom, Julia, niemand (Julian 26.10., "wie Wabi"). Nur nach links wischen = löschen, danach Rückgängig statt Rückfrage. Nach rechts wischen gibt es nicht. Sheets federn am Rand, jede Bewegung lässt sich mittendrin abbrechen.
   Jahresring (Canvas v36, Zeile 6): Halten macht den Ring dicker und zeigt einen Griff. Ziehen rollt die Wochenzahl mit, an jedem Punkt Tick, der Punkt unter dem Daumen hebt sich als Clay-Objekt. Loslassen auf einem Punkt: Objekt wächst zur Karte; daneben: Griff federt zu heute. Swipe-Karten im Onboarding färben die Icon-Fläche beim Ziehen in der Personenfarbe (rechts Tom blau, links Julia rosa).

## Komponenten

**Hauptnavigation (unten).** Vorbild ist die Ruhig-Navigation: eine schwebende Pillen-Leiste mit einfachen Linien-Icons (Phosphor Regular, 20 px) und Text darunter, daneben ein runder dunkler Plus-Knopf. Clay-Icons kommen in der Hauptnavigation nie vor. (Julian, 25.10.)

**Informationsarchitektur (Julian 26.10.).** Keine Inhalts-Tabs mehr, weil sie Heute und Listen doppelt zeigten. Heute: ohne Tabs, nur was heute und bald ansteht (Termine, fällige Aufgaben, nahe Fristen). Kalender: alles mit Uhrzeit. Listen: oben Clay-Tabs (Aufgaben, Einkauf, eigene Listen wie Kliniktasche, + Neu); Julian 26.10.: die Inhalts-Tabs gehören nur hierhin. "Neu" legt eine Liste mit Vorlage an. Termin: 4 Kategorien + "Alle" öffnet die Symbolauswahl aus allen Clay-Icons (Sport, Gesundheit, Familie, Amt, Unterwegs); gewählte Symbole rücken nach vorn. Eingang: "Neu" (zu bestätigen) und "Dokumente" (Infozettel, oben die Fristen). Eine Frist ist das Datum eines Dokuments und erscheint automatisch in Heute und Kalender. Clay-Icons stehen als Kachel in Zeilen und Kategorien.

**Karten.** Eine Kachel mit Clay-Icon (16 Radius, Tönung des Objekts), daneben Zeit in Mono, Titel und Unterzeile; rechts der Besitzer als Initialen-Kreis in Personenfarbe. Karten sind weiße Flächen ohne Schatten; getönt ist nur die Icon-Kachel.

**Ring und Karten** sind der Kern (Julian, 25.10. 08:00): der Jahresring ist der visuelle Anker, die Karten verteilen Aufgaben mit Besitzern.

**Clay-Icons.** Siehe `icons-v1/`. Bewegung nur bei Zustandswechseln, die selten sind (übernehmen, erledigen, Brief angekommen). Keine Endlosschleifen in Listen.

## Do
- Eine Schrift auf einer echten Skala. Mono nur für Uhrzeiten.
- Dunkel (Tinte) nur für die eine Hauptaktion pro Screen und das Plus; Teal nur für "erledigt".
- Personenfarben nur für Besitzer, nie als Dekoration.
- Texte aus echten Fällen (U4, Elterngeld, Passfoto), nie Lorem.

## Don't
- Clay-Icons in der unteren Navigation.
- Versale Mono-Labels mit Sperrung als Überschriften-Ersatz ("ALS NÄCHSTES"). Das ist ein KI-Muster; stattdessen Überschrift in 18/600.
- Cremefarbener Seitenhintergrund (#F4F1EA-Look); Creme bleibt den Illustrationen vorbehalten.
- Verläufe, lila Töne, identische Kartengitter mit Schatten.
- Einblend-Animation auf jedem Abschnitt. Ein orchestrierter Moment pro Screen reicht.

## Offen (Julian entscheidet im Canvas-Review)
- Startscreen: Jahresring oder Wochenleiste?
- Satz-Ansicht ("Tom bringt Ben um 09:30 zur U4") als Kopf von Heute?
- Größe der Clay-Icons in Listen (56 vs. 40 px)  # estimate
