---
name: family-bot-design
description: Family Bot UI design state and Julian's feedback (2026-10-24): canvas link, inspo board, lead direction 6 Ruhig (full flow)
metadata:
  type: project
  modified: 2026-10-24T10:05:04.531Z
---

Design canvas (Claude Design): https://claude.ai/artifact/9GDWtc5H1RMUaEmBNVENoo, titled "Familienassistent MVP". It has 40 boards.

**Julian's feedback, 2026-10-24**
- The first Notion-style version was "langweilig": minimal and on-principle, but without the charm of the Peekly "Parents Care" reference (X post by peekly_app). The reference image is in the vault under `Family Bot/04 Onboarding & Mockups/v2 Notion-Stil/reference.png`.
- The charm comes from three things:
  - a pencil-sketch illustration
  - pastel person colors
  - multicolor status pills
- He wants the complete flow as screens so he can iterate on them and picture the whole app. That means onboarding, chat and the shared calendar, not just a few screens.
- Directions are made like "Namore Redesign Directions" (https://claude.ai/artifact/X8yrMjQgq33sBAnyqq4UUg), Tobi's stop-slop process.

**Older directions 1-5** (y=0..~9000) superseded by Richtung 6.

**Positioning shift (Julian, 2026-10-24 evening)**
- The differentiation is now design and UX of a simple, calm shared family calendar.
- Design roadmap Claude Doc: https://claude.ai/artifact/BV6mm9X3h8s2pHY4axpWrE
- Julian's answers (2026-10-24 21:32):
  - Direction: stay Notion-like, "simple, usable, beautiful, consistent". This overrides the Skizzenbuch recommendation as the base.
  - Images: he has GPT (ChatGPT) access for image generation.
  - Mobbin: skip Mobbin Pro and use the free route.

See [[family-bot-decisions]] and [[family-bot-name-mascot]].

## Inspo-Board (2026-10-24)
https://claude.ai/artifact/1JnwnqL1EFpvgUVUwFfUsj: 204 design images from Julian's X reposts plus 45 Mobbin screens as link tiles at the top. Julian marks each one "Mitnehmen" or "Nicht"; picks are stored in the artifact db, collection `picks`, doc id = item id (x<index> / m01..). Source images: vault `02 Wiki/Project Ideas/Family Bot/04 Onboarding & Mockups/inspo-picks/` (index -> `inspo-sheets/map.json`).

## Richtung 6 "Ruhig" -> 7 "Ruhig x Clay" (2026-10-24 late)
- Ruhig: built from Julian's 34 inspo picks + Marten/Divan minimalism refs. 27 boards Ruhe-* at y=9860..13640 (4 rows). Generators in scratchpad fbgen/ (not durable).
- Illustration feedback: clay squirrel "viel zu verspielt"; pencil (Peekly) scenes tried; clay OBJECT icons liked ("erinnert an Airbnb").
- Comparison Clay vs Bleistift at y=14600 + motion board y=15560.
- DECISION 22:51: Richtung 7 "Ruhig x Clay" is the lead. v56: 27 boards Clay-Ruhe-* from y=16600. 6 clay icons exist, 19 missing shown as grey placeholders.
- Prompts in /mnt/project-files/idea-screens/2026-10-22-family-bot-review/design/: GPT-Bildprompts Richtung 6.md; Icon-Set v1 (2026-10-25, 88 clay icons split into base+parts for animation, 37 prio A). Julian renders in GPT, Codex files them.
- Vault project: `02 Wiki/Projects/Family Assistant/` (README with folder tree, naming `<motiv>_vNN.png`, manifest). Research still in `Project Ideas/Family Bot/`.
- 7.3 (v59, y=22950, fbgen/rz_clay3.py): Airbnb principles applied; rules in design/Airbnb-Prinzipien.md.
- 7.4 (v60, y=24210, fbgen/rz_notion.py): Notion principles; rules in design/Notion-Prinzipien.md. Clay as page emojis.
- 7.5-7.8 (v61, y=25470+): Things 3, Structured, Headspace, Apple Invites (Julian: "all"); rules in design/App-Stile-7.5-bis-7.8.md.
- 7.9 "Satz für Satz" (v63, y=30510, elayadesign landing-page-design skill): day as one sentence with inline clay icons, glass island nav. Landing page: https://claude.ai/artifact/MBEeeaHc5KCriXzdwJx8fQ.
- 8.0 Stapel + 8.1 Jahresring (2026-10-25, canvas v64, rz_neu.py). Julian 08:00: Ring = visual anchor, Stapel cards = assign birth-related tasks with owners; both extend the core. 8.2-8.6 (v65). 9.0 Kombi (v66, y=40590, rz_kombi.py): tabs Jahr/Karten/Tag/Eingang; loop Post->Karte->Besitzer->Ring. Shortlist doc: claude.ai/artifact/VdFkmnt275S9nhsLkTVj5L
