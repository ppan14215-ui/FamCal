---
name: family-bot-icons-v1
description: Clay icon set v1 status (60/88 rendered), where files live, and the review/animation page with Julian's verdicts
metadata:
  type: project
  modified: 2026-10-25T21:56:34.264Z
---

2026-10-25: Codex rendered 60 of 88 icons (36 A, 24 B, 0 C) before hitting usage limits, already split into base/parts/states and filed in the vault: `02 Wiki/Projects/Family Assistant/Design/Icons v1/` (1024 PNG + icons-v1-manifest.json with layerOrder base-first/parts-first). Raw renders: Mac `~/.codex/generated_images/01a16ff0-.../`. Still missing: uhr, ort (A), 9 B (weather, flugzeug, musik, link-abo, medizin), all 17 C.

512px webp copies: vault `Icons v1/web-512/` and project files `idea-screens/2026-10-22-family-bot-review/design/icons-v1/` (img/, meta.min.json, template.html = animation engine source; build index by replacing __META__).

Review page with animation tests (Auftritt/Bestätigung/Ruhe, SVG layer engine), color backgrounds, 48/32/24px check: https://claude.ai/artifact/M5VQVHmhAu7bq4nT5c6mGn. Julian's verdicts in db collection `review`, doc id = icon name, {status: ok|redo, note}.

Flagged by Claude: einladung star, paket flap, amt hand hidden under base (parts-first); u-heft yellow off-palette; reisepass/reise/schnuller too much teal; kindergeld, rechnung, frist weak at small size; stempel base empty.

Related: [[family-bot-design]], [[family-bot-auswahl]].

## Julian's design feedback 2026-10-25 21:47
- Clay icons belong in content tabs/categories like the Airbnb board (Clay3-Heute: Termine/Aufgaben/Fristen/Dokumente as clay tabs). Bottom main nav uses simple line icons, never clay.
- Best bottom nav = Ruhig (Clay-Ruhe-Heute): floating pill bar Heute/Kalender/Listen/Eingang with line icons + separate round dark "+" button.
- He likes parts of many directions; picking one board per slot (Bausteine page) does not fit. He wants to give text feedback per element on the canvas ("this I want, this not").

## Animation direction (Julian 2026-10-25 22:03)
v2 (strict icon-motion: short, scale-only, no loops) was rejected as "langweiligste Animation". Julian wants object stories: sand runs in the hourglass, calendar page flips, pen writes, money jumps. v3 (template3.html + engine3.js in project files icons-v1/) does this with HTML layers, CSS 3D (rotateX/rotateY) and an SVG overlay for ink, sand grains, steam, confetti. Use v3 as the baseline; never fall back to scale-only motion.
2026-10-25 22:10: v3 still "schwach"; Julian wants the earlier canvas motion 1:1 (fbgen/motion_v3.txt keyframes: lid lifts on steam, coin rotateY spin, pen writes 3 lines, damped pendulum, m-hop with squash). Masks (clip reveals) do not count as animation. v4 (template4.html + engine4.js) = baseline now: continuous loops, anticipation squash, settle, contact shadow, gloss, perspective() for real 3D, check pops instead of clip, in-phone demo. Never ship clip-reveal or scale-only icon motion.
2026-10-25 22:20: Julian rated 53/60 (29 ok, 24 redo). Codex brief with notes: project files design/icons-v1/codex-redo.md. Icon loop now starts per icon on hover (Julian), not autoplay.
