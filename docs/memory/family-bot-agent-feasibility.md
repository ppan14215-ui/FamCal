---
name: family-bot-agent-feasibility
description: Familienassistent agent check 2026-10-26: what an acting agent can do (mail, phone, Doctolib, browser agents) and the recommendation
metadata:
  type: project
---

Julian (2026-10-26) wants the in-app agent to actually do tasks (find appointments, answer mail, write cancellations), not just prepare; logins that need him again make it worthless. Doc: https://claude.ai/artifact/8nGy97rsVpF3ddYcsxATxY

Findings, checked 2026-10-26:
- Doctolib API is partner-only (medical software vendors). An unofficial doctolib-mcp uses the internal JSON API to search, find the earliest slot and book with a live session. Doctolib ToS were not readable, so automated access is unverified.
- Doctolib now sells practices a KI-Telefonassistent; fertig.ai does the same for medatixx, samedi and Doctolib.
- Doctolib's patient app now has family profiles plus check-up and vaccination reminders, which overlaps with our Babyjahr entry.
- Gmail: gmail.send is sensitive; read, compose and modify are restricted and need an annual CASA assessment. Microsoft Graph Mail.Send and Mail.Read work for personal accounts. GMX needs IMAP switched on plus an app password.
- Browser agents: Browserbase from $20 for 100 hours, then $0.10–0.12/h. Online-Mind2Web self-reported scores are 65–97%. ChatGPT cloud browser needs a login handoff and can be blocked by sites.
- AI Act Art. 50 (since 2026-08-02): a voice agent must disclose that it is AI.

Recommendation, which Julian has not yet confirmed:
- MVP: the agent acts through our own family mail address after a one-tap confirm.
- Plus stage 2: a phone agent to cancel, move or request appointments.
- Doctolib booking is not a product promise; use a deep link instead.
- Cheapest test: 10 real calls with a voice agent. 7/10 means go; fewer than 4 means drop.

See [[family-bot-decisions]].
