/**
 * Holt die App-Screens der Landing Page aus dem Prototyp, damit beide gleich bleiben.
 * Startet den Prototyp (eine HTML-Datei, z. B. dist/famcal-prototyp.html oder die
 * gespeicherte Artifact-Seite) auf einem lokalen Server, lädt die Beispielfamilie und
 * fotografiert die Screens nach landing/shots/*.webp. Danach baut build.py die Seite.
 *
 *   node landing/sync-screens.js <prototyp.html>
 *   python3 landing/build.py landing/landing.src.html <ausgabe.html>
 *
 * Fehlt ein Screen (Text im Prototyp geändert), bleibt das alte Bild und das Skript
 * nennt den Schritt.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const SRC = process.argv[2];
if (!SRC) { console.error('Aufruf: node landing/sync-screens.js <prototyp.html>'); process.exit(1); }
const OUT = path.join(__dirname, 'shots');
const W = 393, H = 790, PORT = 8765;

// Jeder Screen: Name in landing/shots und die Schritte dorthin, ausgehend vom Kalender nach "Ich wurde eingeladen".
const SCREENS = [
  ['tag', async () => {}],
  ['talk3', async (p) => { await p.getByText('„Freitag zum Kinderarzt“').first().click(); await p.waitForTimeout(2000); }, { reload: true }],
  ['termin', async (p) => { await p.getByText('U6 bei Dr. Weber').first().click(); }, { back: true }],
  ['woche', async (p) => { await p.getByText('Woche', { exact: true }).first().click(); }],
  ['monat', async (p) => { await p.getByText('Monat', { exact: true }).first().click(); }],
  ['listen', async (p) => { await p.getByText('Listen', { exact: true }).first().click(); }],
  ['eingang', async (p) => { await p.getByText('Eingang', { exact: true }).first().click(); }],
];

(async () => {
  const page = fs.readFileSync(SRC);
  const html = page.includes('<html') ? page : Buffer.concat([Buffer.from('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>'), page, Buffer.from('</body></html>')]);
  const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(PORT);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'famcal-shots-'));
  const save = async (name) => {
    await p.waitForTimeout(1600);
    const png = path.join(tmp, name + '.png');
    await p.screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(path.join(OUT, name + '.webp'))}, 'WEBP', quality=80)`]);
    console.log('ok', name);
  };
  const start = async () => {
    await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(2500);
  };
  const failed = [];
  await start(); await save('onb');
  const invite = async () => { await p.getByText('Ich wurde eingeladen').click({ timeout: 8000 }); await p.waitForTimeout(1500); };
  await invite();
  for (const [name, go, opt = {}] of SCREENS) {
    try {
      await go(p); await save(name);
      if (opt.reload) { await start(); await invite(); }
      if (opt.back) { await p.goBack(); await p.waitForTimeout(1200); }
    } catch (e) {
      failed.push(name); console.log('FEHLT', name, e.message.split('\n')[0]);
      await start(); await invite();
    }
  }
  await b.close(); server.close();
  if (failed.length) { console.log('Nicht aktualisiert:', failed.join(', ')); process.exitCode = 2; }
})();
