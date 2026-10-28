# Sicherheit vor dem Start

Julian 27.10.: Vor der Veröffentlichung muss sicher sein, dass niemand über die App das Claude Budget oder die Cloud leerräumen kann. Bei FamCal wiegt das schwerer als bei Namore, weil jeder Satz einen bezahlten Aufruf auslöst.

## Schon da

- Der Claude Schlüssel liegt nur als Secret in Supabase, nie in der App.
- Die Funktion `verstehen` nimmt nur angemeldete Nutzer an (JWT) und zählt jeden Aufruf in der Datenbank (`use_ai_call`).
- Grenzen: 60 Sätze pro Person und Tag, gratis 30 Sätze pro Familie und Monat. Ein gesperrter Satz kostet nichts.
- Eingaben werden auf 500 Zeichen gekürzt, Antworten auf 1200 Tokens.
- Plus (`families.plus_until`) können Nutzer nicht selbst setzen.
- Monatsgrenze für den Schlüssel in der Anthropic Console: 20 $.

## Muss vor dem Start erledigt sein

- [ ] Testanmeldung entfernen: Konto `test@famcal.app` löschen, die Variablen `EXPO_PUBLIC_TEST_EMAIL` und `EXPO_PUBLIC_TEST_PASSWORD` aus EAS löschen. Sie stecken lesbar in jeder Preview APK.
- [ ] Neuen Claude Schlüssel anlegen, den alten widerrufen (der jetzige stand im Chat).
- [ ] Massenhaft neue Konten bremsen: Jedes neue Konto bekommt 14 Tage Plus. Grenze pro Gerät oder Captcha bei der Anmeldung, und eine Gesamtgrenze pro Tag für alle Aufrufe, die bei Überschreitung warnt.
- [ ] Rate Limits in Supabase Auth prüfen (Anmeldungen pro Stunde).
- [ ] Warnung bei ungewöhnlichem Verbrauch (z. B. Mail an Julian, wenn ein Tag mehr als das Dreifache des Schnitts kostet).
- [ ] App Integrität: Play Integrity (Android) und App Attest (iOS) prüfen, damit nur die echte App die Funktion aufruft.
- [ ] Sicherheitshinweise in Supabase (Advisors) ohne offene Warnungen außer den bewusst erlaubten.

- Vor Release: Tabelle `ai_testers` leeren (Testkonto hat 1000 Sätze am Tag statt 60, seit 28.10.2026).
