---
name: family-app-review-findings
description: TimeTree and Podz review deep-dives (2026-10-23): design is not the gap; "calm, ad-free, nothing disappears" is
metadata:
  type: project
  modified: 2026-10-23T19:49:10.544Z
---

Files: `/mnt/project-files/idea-screens/2026-10-22-family-bot-review/reviews-deep/` holds the TimeTree and Podz analyses.

**TimeTree**
- Store numbers, checked live 2026-10-23: App Store DE 4.74★ (99,796 ratings), US 4.85★ (92,903). Play has about 235K reviews each in DE and US.
- Premium is €2.99/month or €29.99/year per account, with no family plan.
- Funding: Series F in Nov 2025, led by SK Telecom.
- Of 596 1–2★ reviews from 2025–26:
  - ads 23%
  - Feb-2026 UI overhaul 19% (lists and memos hidden)
  - sync and export 17%
  - paywall 11%
- Since Feb 2026, 44% of all reviews are 1–2★, against 13.7% in 2025.
- Under 1% criticise the looks, and many praise them.

**Podz**
- Strikebrite LLC, US. App Store US 4.84★ with 232 ratings, almost nothing in DE.
- Only 61 text reviews: about 5% criticise the looks, about 10% find it confusing.
- Not a threat in DACH.

**Why it matters:** Julian's thesis "competitors are ugly, build a Notion-like app" is not supported as stated. The supported version is: incumbents became noisy, ad-heavy and unpredictable.

**How to apply:**
- Position Family Bot as "ruhig, werbefrei, nichts verschwindet".
- One subscription per household, not per account.
- Shared list and tasks as stable core features.
- Export from day 1.

See [[family-bot-review]].

**Competitor scan (2026-10-25, positioning 4-perspective check)**
- Email forwarding to events is commodity: Cozi Max ($79/yr AI Event Import), Ohai, Sense, Mental Loadless (FR, from €3.99, 9 languages, household email even free), Hermo (reads Gmail directly). Maple shuts down 31.12.2026.
- familymind (Munich GmbH, EXIST): German family AI, "Nest: first 90 days with baby", U-checks/vaccinations DE, $8.99/mo or $59.99/yr per family, small (Play 500+ downloads). Closest DACH rival to the Babyjahr entry.
- Positioning review doc: https://claude.ai/artifact/JrncgJgosbyAXumcHAjGS4 (top change: lead with first-year timeline from birth date, not "Post").

## Calendar import (verified 2026-10-25)
TimeTree has no export and shut its API on 2023-12-22 (developers.timetreeapp.com); only unofficial password-scraping exporters exist, so no TimeTree import button. Julian prefers "everyone keeps their own calendar, we overlay them": read device calendars (EventKit / Android CalendarProvider) + ICS subscription link out; skip two-way sync in MVP. TimeTree-only events: screenshot import.
Shared calendar (Julian asked 2026-10-25 08:18, wants new app events to appear in both partners' calendars): proposed app-owned "Familie" calendar as source of truth. MVP = ICS subscription (read-only, Google refreshes slowly); step 2 = app writes a local "Familie" calendar on each phone via EventKit/CalendarProvider; full two-way shared calendar (own CalDAV or shared Google/iCloud) deferred. Personal calendars read-only for free/busy.
