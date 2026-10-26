---
name: family-bot-review
description: Family Bot (own family-assistant app DACH): 2026-10-23 GO for cut MVP + Spec v1; earlier rounds, Hermo facts, WhatsApp DE costs
metadata:
  type: project
  modified: 2026-10-23T19:42:14.445Z
---

Julian's "Family Bot" idea (AI family assistant for DACH: photo/mail -> event for both parents, evening handover via WhatsApp, U-/Impf reminders, Kind-krank button). Docs in vault `02 Wiki/Project Ideas/Family Bot/`; review written 2026-10-22 next to it: `00 Review - Unabhängige Validierung (2026-10-22).md` (copy in /mnt/project-files/idea-screens/2026-10-22-family-bot-review/).

Round 3 (2026-10-23, current): Julian's direction is now its own app with an in-app assistant that knows the family and takes over tasks and stress. It is NOT a Kita/school app; Kita is only one input source. Authoritative plan: `05 Fahrplan & Quellen/03 Fahrplan v3`. Spec written: `00 Spec v1 - Familienassistent (2026-10-23).md` in the vault folder. Verdict: GO for a cut MVP (side income).
- MVP: profile, today/week view with Sunday preview, tasks with an owner, U-timeline, birthdays, holidays, photo capture with read-back, push + email, ICS subscription.
- Plus tier at €4.99 or €39: WhatsApp, unlimited capture, Google sync.
- Kill test: landing page with a €29 founder year; under 1% preorders at ≥500 visits by 2026-11-22 parks it.
- Flags: the name is too close to Fambot; U/vaccination status stays on the device (Art. 9).
- Grok review data shows reminders are wanted, but there are 0 wishes for "proactive thinking ahead".

Walkthrough 2026-10-23: Julian's thesis is that design is the opening. He dislikes the TimeTree and "Podz" designs and wants a clean, Notion-like app. Proposed inputs: the assistant gets its own family mail address, a central WhatsApp number to forward to, and photo capture. Outputs are drafts only; the bot does not join or post in Kita groups (ToS and DSGVO).

Round 2 (same day, after Julian pushed back "Hermo is ugly and can't do what we plan" and felt screens are too strict): verdict revised to SPLIT. Treat weak incumbents as demand proof (Namore method). Hermo has no public traction (no app, no ratings), Gmail-only and Google-Calendar-only. Wedge: family forwarding address for any mail provider (GMX/Web.de/Outlook) + Apple via ICS + design + confirm-before-sync; no health data on server, no outbound actions; 6.99 EUR/49 EUR. Kill test: 49 EUR/yr preorder, under 20 paid by 2026-11-08 parks it; first a 50-note extraction benchmark >= 90%. Proven demand is the shared family calendar (Cozi 399K ratings), not the AI layer (Fambot 13, Sense 39 ratings).

Round 1 (superseded): NO-GO on capacity.

Facts checked live 2026-10-22 that future screens can reuse:
- **Hermo** (hermo.ai/de) is a German-language AI family assistant in WhatsApp (Gmail read, photos/voice, briefing to both parents, DB Frankfurt), £0 / £4 / £45 per month. Kills any "only German family agent" claim.
- **WhatsApp DE pricing since 2026-10-01:** utility and service messages both €0.0456 each; service messages free only for the first 1,000/month per number; in-window utility no longer free. Free Entry Point window (up to 7 days) still free.
- Fambot: 13 iOS ratings, English only, free beta. Maple sunsets 2026-12-31 (team acqui-hired by Wander 2026-07-29).

**How to apply:** if Julian brings another family-organizer / family-agent variant, cite this and the ledger row instead of re-researching. See [[verdict-ledger-location]], [[screen-ideas-standalone]].

**Babyjahr competitors, checked 2026-10-24.** These matter for the Babyjahr entry (see [[family-bot-decisions]]). Rating counts were not checked because the App Store lookup was blocked.
- **Baby Termine** (babytermine.com, iOS and Android):
  - computes U1–U9, Geburtsurkunde, Kindergeld, Elterngeld, Elternzeit, KV and Steuer-ID from one date
  - fully local, no account
- **Wegkind** (wegkind.app):
  - birth date or due date gives a personal plan
  - "Beide Eltern, ein Plan" with a partner invite link
  - covers U, STIKO, Elterngeld, Kindergeld, Kita and Bundesland benefits
- **formie** (formie.de): "Elterngeld in 7 Minuten per App" plus expert calls.
- **Traction (store pages, 2026-10-24):**
  - Baby Termine: 1 iOS rating, Play 10+ downloads; Nuremberg indie, free.
  - Wegkind: web-only, €3.99/month or €39/year, no reviews.
  - formie: 73 iOS ratings at 4.6★, €39.99 one-time per Elterngeld application.
  - Elterngeld Buddy: Play 44 reviews at 4.6★, 5K+ downloads, €39.90.
- **What this means:** the deadline timeline does not differentiate and shows no traction. Parents pay €40 for done-for-you work, and the reviews praise "nimmt Arbeit und Stress ab".
- **Julian's direction (2026-10-24):** the differentiation is the assistant that takes over the family's tasks; the timeline is only the free hook.
- **Analysis:** `reviews-deep/2026-10-24 Babyjahr-Apps - Reviews und Abgrenzung.md`.
- **Market:** 654,241 births in DE in 2025 (Destatis), about 46.6% of them first children, so roughly 300K first-time couples a year.
- **Synthesis across all analysed apps (2026-10-24 evening):**
  - Best-evidenced differentiation: a calm, reliable shared calendar with tasks and lists for both parents (Cozi and TimeTree demand; TimeTree complaints are execution failures).
  - The AI assistant is not evidenced as a subscription reason. Paid done-for-you work only shows up for big one-time tasks.
  - Proposed setup: the Babyjahr is the entry moment, the timeline is the aha moment, the assistant is a quiet helper, and Elterngeld is a one-time add-on or partnership.
  - Test: hooks A (calendar without ads) vs B (assistant does the paperwork) vs C (deadlines).
  - Julian has not decided yet.

