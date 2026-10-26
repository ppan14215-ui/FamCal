---
name: family-bot-decisions
description: Product decisions Julian made in the Family Bot plan walkthrough on 2026-10-23 (users, inputs, calendar, proactivity, money, languages)
metadata:
  type: project
  modified: 2026-10-24T09:19:46.812Z
---

Julian made these decisions in the walkthrough on 2026-10-23. Spec v2 captures them: vault `Family Bot/00 Spec v2 - Familienassistent (2026-10-23).md`, with a copy in /mnt/project-files/idea-screens/2026-10-22-family-bot-review/. Next steps: check whether Kita-app email notifications carry their content, and run the 50-document extraction benchmark.

**Users**
- Both parents, as a team.

**Inputs**
- The assistant has its own family email address. Parents forward mail to it or give it directly to Kita, Amt and doctors.
- The central WhatsApp number was dropped from the MVP on 2026-10-24. WhatsApp content comes in through the share sheet instead. Revisit only if users miss it.
- Photo capture and the share sheet.

**Outputs**
- The assistant writes drafts only. Parents edit and send them.
- It never posts in Kita WhatsApp groups and never automates the parent's own account.

**Calendar**
- The app has its own week view and syncs with existing calendars, rolled out in stages. Card answer: "Beides".

**Features Julian wants**
- A simple shared shopping list. It was cut in v3; it is now back.
- A "who brings / who comes" field on appointments.
- Documents & deadlines: passport expiry checked against planned holidays, Kita meal-account balance, contracts.
- STIKO/U schedule as calendar reminders.
- Child's age shown in weeks.
- Photos, growth tracking and the grandparents feed are a later module (v2).

**Proactivity**
- Only important things: missing it has a consequence, a specific person must act, and it is not already in the calendar.
- Parents assign tasks themselves; the assistant does not suggest who.
- Home-screen widgets are the main surface.

**Money**
- Subscription, not a one-time purchase.
- Principle: "Organisieren gratis, Arbeit abnehmen = Plus". What is free stays free forever.
- Price: €4.99/month or €39.99/year per household, with a €29 founder year. Julian accepted it on 2026-10-23, provided it covers our costs.
- Cost check (net after 19% VAT and 15% store fee): the monthly plan nets about €3.55/month, the yearly plan about €2.40/month, and the founder year about €1.70/month.
- Estimated cost per Plus household: about €1.40/month for typical use and €3.50 for heavy use. The AI cost is an assumption; measure it in the KW44 benchmark.
- Cost levers: WhatsApp hints only as a fallback, fair use of 150 captures per month, and the founder year only for the first 200 households. If the AI cost turns out higher, raise the yearly plan to €44.99.

**Positioning and moat**
- Target users are people who want a finished solution, not tinkerers who would DIY it with ChatGPT.
- Moat: reliability, works for both parents across iPhone and Android, German family knowledge, and family memory that grows over time.

**Babyjahr-Einstieg (Julian, 2026-10-24 abends) [E]**
- At launch only the entry is cut to parents in the baby's first year: onboarding, home screen, landing page and marketing.
- The core stays a general family assistant.
- The onboarding starts with the birth date or due date. From it the app builds the first-year timeline: U, STIKO, Geburtsurkunde, Elterngeld, Kindergeld, Pass.
- Deprioritized at launch: features for older kids, Kita, AT/CH packs and non-German marketing.
- Trigger: the Alex Olim X post "repackage an existing thing for one specific group".
- Recorded in a Spec v2 Nachtrag.
- Canvas onboarding is now 6 steps; the new step 3 is the first-year timeline as the aha moment.

Mascot and name: see [[family-bot-name-mascot]].

**Languages**
- Several languages. Proposed: German and English UI from the start. Country rule packs roll out DE first, then AT and CH. Marketing stays German.

See [[family-bot-review]] and [[family-app-review-findings]].
