# GPT-Image-Prompt: Spielkarten-Icon (Rommé, Skat, Uno)

Stand 01.11.2026. Julian: "Wir brauchen noch ein passendes Spielkarten Icon." Bis es da ist, zeigen Spiel-Listen das Gesellschaftsspiel-Icon (Würfel und Figuren), nicht mehr die leeren Karten.

## Ablauf

1. Neuer GPT-Chat. Zuerst den Stilblock aus `GPT-Bildprompts Icon-Set v1.md` einfügen.
2. Als Referenz ein vorhandenes Icon anhängen (z. B. `icon-gesellschaftsspiel.png` aus `icon-teile/referenz/`) und dazuschreiben: "Match this reference exactly: same camera, same light, same materials, same scale."
3. Dann diesen Prompt:

```
Icon: a small fanned hand of three playing cards, held as if just dealt. Cards in warm off-white #F7F4EE with soft rounded corners and a thin sand #E9DCC6 edge. The front card shows one large simple heart pip in soft blush #F2C9C4 in its center, the card behind it one simple spade pip in deep teal #075056, the back card shows only its back: a calm sage #A9BBA3 surface with a subtle inset border. No numbers, no letters, no faces, no court cards. The fan opens to the right, about 25 degrees between cards. Readable at 32 px.
```

4. Ist das Ganze gut, im selben Chat die Teile:
   - **A** `Render exactly the same icon again, same camera, same light, same size and position on the 1024 canvas, but WITHOUT the front card with the heart. Fill the area naturally, as if it was never there. Transparent background.`
   - **B** `Render ONLY the front card with the heart from this icon, exactly where it was on the 1024 canvas, same scale, same light, keep its own small contact shadow, nothing else, transparent background. Do not move or resize it.`
5. Dateien: `icon-spielkarten.png`, `icon-spielkarten__base.png`, `icon-spielkarten__vorderste-karte.png`. Hier im Chat hochladen.

## Animation (baue ich danach)

Die vorderste Karte wird mit einem kleinen Schwung nach oben aus dem Fächer gezogen, kippt leicht und gleitet zurück. Nur bei neuer Runde und beim Öffnen, nie als Dauerschleife.
