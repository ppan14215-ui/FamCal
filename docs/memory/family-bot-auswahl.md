---
name: family-bot-auswahl
description: Selection page "Bausteine wählen" where Julian picks one design block per function from the Family Bot canvas
metadata:
  type: reference
  modified: 2026-10-25T19:25:06.121Z
---

Old Bausteine page (superseded): https://claude.ai/artifact/BUemiBSfWUg6ssAF2imz4i, db `picks`. Related: [[family-bot-design]].

Superseded 2026-10-25 22:00 (Julian: picking one board per slot does not fit). Use Canvas-Review instead: https://claude.ai/artifact/EDxZ4c91eBufKhFdPDaJor — 87 boards from Richtung 7 on; Julian taps a spot and writes feedback. db `pins` {board,x,y (0..1),kind ja|nein|frage,text,tags,by}; `notes/richtung` {text} = overall direction. Read both before building the final flow. Draft DESIGN.md: project files design/DESIGN.md (design-taste skill requires it).

2026-10-25 22:40: Julian annotated all screens (30 pins). Merge proposal Claude Doc "Familienassistent: Zusammenführung v1": https://claude.ai/artifact/NxB2Gm3zKW4kw5Fmu8k5b2 (base Clay-Ruhe-System + Ruhig nav, clay tabs, tinted icon surfaces from Clay2-Heute, Clay3-Kalender day view, striped work blocks pink=Julian/blue=partner, card-split as module, missing flows: photo->Infozettel, Entwürfe, Karten). Julian also likes the plain in-phone demo on the icons page. Open: font Geist vs Nunito, Zeitleiste vs Ring.

2026-10-25: Full merged v1 flow canvas "Familienassistent v1 Flow": https://claude.ai/artifact/2D3QEB3EFs2MSUy7CVkCno (22 boards: Onboarding 6, Heute/Kalender Tag+Woche/Termin/Jahr-Ring, Neu-Sheet + Foto->Analyse->Infozettel, Eingang/Aufgaben/Karten-Split/Entwurf, System + Widgets). Personas Julia (pink) and Tom (blue). Generator: scratchpad v1flow/gen.py (session-only).
2026-10-25 23:15: v1 Flow now 33 boards after Julian's canvas comments + Spec v2 check (gap list: project files design/v1-flow-spec-abgleich.md). Landing page https://claude.ai/artifact/MBEeeaHc5KCriXzdwJx8fQ v3 uses real v1 screenshots, Preise section (gratis vs Plus, Gründerjahr 29 €).

**Landing v4 (2026-10-25 late):** Julian rejected v3 (dark mode via prefers-color-scheme, unclear). v4 at the same link is light-only, sections modelled on namore.app (hero with 2 phones + waitlist, 3 cards, input->result examples instead of testimonials, 4 steps, split, grid, promise table, founder quote, pricing, FAQ, final CTA). Source: scratchpad land2 (not durable). Waitlist form is a preview only, not connected. Founder quote is a draft in Julian's voice from his stress list; he must approve it.

**Positionierung (2026-10-26, Vorschlag, Julian noch nicht bestätigt):** Kategorie = Familienkalender, "denkt mit" ist Eigenschaft. Claim "Nie wieder: Hast du daran gedacht?", Subline "Der ruhige Familienkalender, der für euch beide mitdenkt". Landing v7 nutzt das. Doc mit Feature-Abgleich, Unschärfen, Abgrenzung, Hook-Test: https://claude.ai/artifact/VbuCWZ2b82zWHASLDXDuHp

**Designsystem v2 Einfachheit (Julian 2026-10-26):** B-Varianten (Wabi x Devouring Details) sind Standard; v1 Flow canvas v19 hat Foto-Kamera -> Wird gelesen -> Verstanden -> Infozettel + neuen Termin. 8 Regeln (Farbe nur im Objekt, ein dunkles Element, aufklappen, weniger Labels; DD: Objekt bleibt, Warten am Ort, Bewegung nach Häufigkeit, Gesten) in project files design/DESIGN.md v0.2. DD-Regeln 5-8 sind Interaktion, noch nicht als Prototyp gebaut.
**IA (2026-10-26, canvas v34):** Heute ohne Tabs; Listen = Clay-Tabs (Aufgaben, Einkauf, eigene Listen, + Neu); Termin hat Symbolauswahl aus allen Clay-Icons (128 Icons als web-192 im Vault Icons v1); Eingang = Neu | Dokumente (Fristen oben). Details in DESIGN.md.
**Canvas v36 (2026-10-26):** Bearbeiten = nur Textfeld (wie Wabi, Menge/Notiz aus Text), Jahresring-Interaktion als 3 Boards (Halten, Ziehen, Loslassen), Swipe-Karten färben sich in Personenfarbe, Abo-Hinweis fragt "Soll ich ein Abo aufsetzen?".
