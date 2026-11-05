# Tracking: PostHog, Sentry, RevenueCat

Stand 05.11.2026. Code: `src/lib/analytics.ts` (Katalog aller Events), `src/lib/funnel.ts`, `src/lib/sentry.ts`, `src/lib/purchases.ts`, `supabase/functions/revenuecat-webhook`.

## Regeln (aus sechs Monaten Namore)

1. Jedes Event steht zuerst im Katalog `Events` in `analytics.ts`, mit Bedeutung jeder Eigenschaft. Ein Name, der dort fehlt, kompiliert nicht. Keine Doppelten, keine Geister.
2. Funnel Schritte gibt es vor dem Start, nicht danach (Namore: 9 % Aktivierung, und niemand sah wo).
3. Jedes Event trägt den genauen Build: app_version, native_build, runtime_version, update_id, channel, schema.
4. Interne Installationen (Kanal preview, Testkonto) tragen is_internal=true. Dashboards filtern sie raus.
5. Kein Tap Autocapture, keine Rage Clicks, kein Session Replay zum Start. Lebenszyklus (Application Installed / Opened) kommt vom SDK, es gibt kein eigenes app_opened.
6. Events, die ein Screen oft feuern könnte, laufen über trackOnce.
7. Nur IDs, nie Namen, Mails oder Gesagtes. identify(Supabase user id), Familie als Gruppe `family`.
8. Fehler nur in Sentry, nicht zusätzlich in PostHog (sonst doppelt gezählt).
9. Geld Events (Kauf, Verlängerung, Kündigung) kommen vom RevenueCat Webhook auf dem Server, nicht vom Handy.
10. Plus setzt nur der Server (Webhook mit Service Key). Namore hatte eine Client RPC, mit der sich jeder Premium geben konnte.
11. Feature Flags erst, wenn ein echter Test läuft; jeder Flag im Code existiert in PostHog, eine Abfrage pro App Start.
12. Sentry hat den DSN fest im Code (öffentlich by design). Namore hatte monatelang keinen DSN und sah keine Abstürze.

## Funnels

| Funnel | Schritte |
|---|---|
| Aktivierung | Application Installed > onboarding_step_viewed(hallo) > signin_completed > family_created oder family_joined > onboarding_completed > entry_created(is_first) |
| Paar | partner_invite_sent > family_joined (Partnerseite, gleiche family Gruppe) > entry_created vom Partner |
| Sprache | voice_started > voice_transcribed(ok) > message_sent(input voice) > assistant_answered(ok) > entry_created |
| Bindung | entry_created pro Woche, nach family Gruppe |
| Bezahlen | paywall_shown > purchase_started > trial_started (Server) > purchase_completed (Server) oder purchase_failed |

Wahlen: nav_style_chosen {style, source}, time_picker_mode_chosen {mode, source}. Beide auch auf onboarding_completed und nav_style als Personen Eigenschaft.

## Einrichtung

- PostHog: eigene Organisation FamCal (EU), Schlüssel als EAS Variable `EXPO_PUBLIC_POSTHOG_KEY` (preview und production). Ohne Schlüssel ist alles ein No-op.
- Sentry: Org namore, Projekt famcal, Region de. Source Maps brauchen `SENTRY_AUTH_TOKEN` als EAS Secret; bis dahin `SENTRY_DISABLE_AUTO_UPLOAD=true` in eas.json.
- RevenueCat: Projekt FamCal, Entitlement `plus`, Keys `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` / `_IOS_KEY`. Webhook siehe Kopf von `supabase/functions/revenuecat-webhook/index.ts`, Secrets `RC_WEBHOOK_SECRET`, `POSTHOG_KEY`.
- Neue native Module (posthog, expo-application, expo-device, expo-file-system, Sentry, RevenueCat): neuer Fingerprint, also neues APK, kein OTA.
