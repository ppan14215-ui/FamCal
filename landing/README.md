# Landing Page

Quelle: `landing.src.html`. Die Telefone zeigen echte Screens aus der App (`shots/*.webp`), eine Funktion pro Abschnitt im Hero. Texte stehen auf Deutsch und Englisch im `T` Dictionary, die Funktionen in `feats`. Die Reihenfolge der Screens im `#mainScreen` muss zu `feats` passen.

Nach jeder neuen App-Version:

    # im App-Repo (Branch claude/project-thread-lc90u5): Web-Demo mit Beispielfamilie bauen
    EXPO_PUBLIC_DEMO=1 EXPO_OFFLINE=1 CI=1 npx expo export -p web
    # hier
    node landing/sync-screens.js <app>/dist           # Screens neu fotografieren
    python3 landing/build.py landing/landing.src.html famcal-landing.html

Danach `famcal-landing.html` auf https://claude.ai/artifact/996SkyXtAPmLNg3yicTGtW veröffentlichen.

Welche Screens wohin kommen, steht in `SCREENS` in `sync-screens.js`. Ändert sich ein Text, über den das Skript navigiert (z. B. „U6 bei Dr. Weber“ oder „Urlaub und Feiertage“), meldet es den Screen als fehlend und behält das alte Bild.
