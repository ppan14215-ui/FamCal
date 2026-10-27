# Landing Page

Quelle: `landing.src.html`. Die Telefone zeigen echte Screens aus dem Prototyp (`shots/*.webp`).

Nach jeder neuen Prototyp-Version:

    node landing/sync-screens.js <prototyp.html>      # Screens neu fotografieren
    python3 landing/build.py landing/landing.src.html famcal-landing.html

`<prototyp.html>` ist `dist/famcal-prototyp.html` aus dem Prototyp-Build oder die gespeicherte Seite des Prototyp-Links. Danach `famcal-landing.html` auf https://claude.ai/artifact/996SkyXtAPmLNg3yicTGtW veröffentlichen.

Welche Screens wohin kommen, steht in `SCREENS` in `sync-screens.js`. Ändert sich ein Text, über den das Skript navigiert (z. B. „U6 bei Dr. Weber“), meldet es den Screen als fehlend und behält das alte Bild.
