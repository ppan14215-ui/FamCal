/**
 * Holt die App-Screens der Landing Page aus der echten App, damit beide gleich bleiben.
 * Baut man die App als Web-Demo (Beispielfamilie, keine Anmeldung), startet dieses Skript
 * einen lokalen Server darauf, lädt die Beispielfamilie und fotografiert jede Funktion
 * nach landing/shots/*.webp. Danach baut build.py die Seite.
 *
 *   (im App-Repo)  EXPO_PUBLIC_DEMO=1 EXPO_OFFLINE=1 CI=1 npx expo export -p web
 *   node landing/sync-screens.js <app>/dist
 *   python3 landing/build.py landing/landing.src.html <ausgabe.html>
 *
 * Fehlt ein Screen (Text in der App geändert), bleibt das alte Bild und das Skript
 * nennt den Schritt.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.argv[2] && path.resolve(process.argv[2]);
if (!ROOT || !fs.existsSync(path.join(ROOT, 'index.html'))) { console.error('Aufruf: node landing/sync-screens.js <app>/dist'); process.exit(1); }
const OUT = path.join(__dirname, 'shots');
const W = 393, H = 790, PORT = 8765;
const URL = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.jpg': 'image/jpeg' };

// Jeder Screen: Name in landing/shots und der Weg dorthin, ausgehend vom Chat der Beispielfamilie.
const SCREENS = [
  ['chat', async () => {}],
  ['termin', async ({ say }) => { await say('Freitag 15 Uhr Zahnarzt mit Ben'); }],
  ['einkauf', async ({ say }) => { await say('Wir brauchen Milch und Windeln'); }],
  ['nachfrage', async ({ say }) => { await say('Samstag Kindergeburtstag bei Lena'); }],
  ['fragen', async ({ say }) => { await say('Frag Tom, ob Samstag passt'); }],
  ['heute', async ({ tab }) => { await tab('Kalender'); }],
  ['tage', async ({ tab, view }) => { await tab('Kalender'); await view('Tage'); }],
  ['woche', async ({ tab, view }) => { await tab('Kalender'); await view('Woche'); }],
  ['monat', async ({ tab, view }) => { await tab('Kalender'); await view('Monat'); }],
  ['jahr', async ({ tab, view }) => { await tab('Kalender'); await view('Jahr'); }],
  ['listen', async ({ tab }) => { await tab('Listen'); }],
  ['ort', async ({ p, tab }) => { await tab('Kalender'); await p.getByText('U6 bei Dr. Weber').first().click(); }],
  ['urlaub', async ({ setting }) => { await setting('Urlaub und Feiertage'); }],
  ['kalender', async ({ setting }) => { await setting('Google Kalender'); }],
  ['widget', async ({ setting }) => { await setting('Widgets'); }],
  ['brief', async ({ p }) => { await p.goto(URL + '/foto-verstanden'); }],
  ['brieflesen', async ({ p }) => { await p.goto(URL + '/foto-lesen'); }],
];

(async () => {
  const server = http.createServer((q, r) => {
    let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(PORT);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'famcal-shots-'));
  const save = async (name) => {
    await p.waitForTimeout(1800);
    const png = path.join(tmp, name + '.png');
    await p.screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(path.join(OUT, name + '.webp'))}, 'WEBP', quality=80)`]);
    console.log('ok', name);
  };
  // Neu laden verliert die Beispielfamilie, darum jedes Mal frisch über "Ich wurde eingeladen"
  const fresh = async () => {
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForTimeout(2500);
    await p.getByText('Ich wurde eingeladen').click({ timeout: 8000 }); await p.waitForTimeout(2200);
  };
  const h = {
    p,
    say: async (t) => { await p.getByPlaceholder(/Sprich oder schreib/).fill(t); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(3000); },
    tab: async (n) => { await p.getByLabel(n, { exact: true }).first().click(); await p.waitForTimeout(1800); },
    view: async (n) => { await p.getByText(n, { exact: true }).first().click(); await p.waitForTimeout(1500); },
    setting: async (n) => { await p.getByLabel(/Einstellungen/).first().click(); await p.waitForTimeout(1500); await p.getByText(n, { exact: true }).first().click(); },
  };
  const failed = [];
  for (const [name, go] of SCREENS) {
    try { await fresh(); await go(h); await save(name); }
    catch (e) { failed.push(name); console.log('FEHLT', name, e.message.split('\n')[0]); }
  }
  await b.close(); server.close();
  if (failed.length) { console.log('Nicht aktualisiert:', failed.join(', ')); process.exitCode = 2; }
})();
