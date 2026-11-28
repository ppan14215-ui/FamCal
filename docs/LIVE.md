# Echte App einrichten

Was einmal eingerichtet wird, damit FamCal mit Konto, gemeinsamem Kalender und Claude läuft. Der Testlink braucht nichts davon.

## Aufbau

- **Supabase**: Anmeldung, Tabellen `families`, `family_members`, `events` (Migration in `supabase/migrations`), Live Abgleich über Realtime.
- **Edge Function `verstehen`**: bekommt einen Satz, fragt Claude (kleines schnelles Modell) und gibt einen Termin als JSON zurück. Der Schlüssel liegt nur dort als Secret `ANTHROPIC_API_KEY`.
- **App**: `src/lib/cloud.ts` (Client), `auth.ts` (Apple, Google), `sync.ts` (Familie und Termine), `verstehen.ts` (Satz zu Claude). Ohne `.env` läuft alles lokal wie im Testlink.

## Schritte

1. Supabase Projekt anlegen, Migration einspielen, Function `verstehen` deployen, Secret `ANTHROPIC_API_KEY` setzen.
2. `.env` aus `.env.example` füllen (URL und Publishable Key aus Supabase).
3. **Google**: in der Google Cloud Konsole (Projekt von Namore geht) zwei OAuth Clients für FamCal anlegen: „Web application“ und „iOS“ mit Bundle ID `com.julian.famcal`, für Android zusätzlich „Android“ mit Paket `com.julian.famcal` und dem SHA-1 aus EAS. Die Web Client ID und ihr Secret in Supabase unter Authentication, Sign In Providers, Google eintragen, dort auch die iOS Client ID unter „Authorized Client IDs“ ergänzen.
4. **Apple**: im Apple Developer Konto bei der App ID `com.julian.famcal` „Sign in with Apple“ einschalten. In Supabase unter Apple die Bundle ID `com.julian.famcal` als Client ID eintragen. Für Apple Login im Web braucht es zusätzlich eine Services ID, das kann warten.
5. Entwicklungs Build: `eas build --profile development --platform ios` (Spracherkennung, Apple und Google Login brauchen einen eigenen Build, Expo Go reicht nicht).
