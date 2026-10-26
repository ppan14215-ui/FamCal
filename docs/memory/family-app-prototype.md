---
name: family-app-prototype
description: Family calendar app moves from canvas to live prototype (2026-10-26): own repo + new project, Namore stack, handoff folder
metadata:
  type: project
  modified: 2026-10-26T16:55:10.848Z
---

2026-10-26 Julian: The design canvas (https://claude.ai/artifact/2D3QEB3EFs2MSUy7CVkCno, v37) is far enough. Next we build all screens as a live prototype and iterate on the prototype instead of the canvas. He works from his phone from 2026-10-27 on.

- Repo: https://github.com/ppan14215-ui/FamCal (private, created by Julian 2026-10-26). Handoff pushed to main (275 files). FamCal is a working name; the app name is still open.
- It also gets its own new project, which Julian creates. The handoff goes into the repo so the new project sees it.
- Handoff folder is staged here: /mnt/project-files/family-app-handoff/
  - HANDOFF.md
  - docs: DESIGN.md, spec-v2, spec gap list
  - design/screens: 50 dc.html files, canvas.json and gen.py
  - assets/icons: 217 webp at 192px
- Stack decision (Julian): exactly the same as Namore (ppan14215-ui/namore-baby-name-app).
  - Expo SDK 55, expo-router, RN 0.83, Reanimated 4, gesture-handler, EAS.
  - Supabase, RevenueCat, PostHog and Sentry come later.
- First prototype scope: mock data (Julia, Tom, Ben), no login, no backend, no real AI, real gestures.

Related: [[family-bot-auswahl]], [[family-bot-decisions]].
