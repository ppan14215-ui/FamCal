/**
 * Holt die App-Screens der Landing Page aus der echten App, damit beide gleich bleiben.
 * Baut man die App als Web-Demo (Beispielfamilie, keine Anmeldung), startet dieses Skript
 * einen lokalen Server darauf, lädt die Beispielfamilie und fotografiert jede Funktion
 * nach landing/shots/*.webp. Danach baut build.py die Seite.
 *
 *   (im App-Repo)  git apply <famcal>/landing/screens-harness.patch
 *                  EXPO_PUBLIC_DEMO=1 EXPO_OFFLINE=1 CI=1 npx expo export -p web
 *                  git checkout -- src   (Patch wieder entfernen, nie committen)
 *   node landing/sync-screens.js <app>/dist
 *   python3 landing/build.py landing/landing.src.html <ausgabe.html>
 *
 * Der Patch ist nur für die Fotos: Antworten des Assistenten (Rezept, Watchlist, Merken) kommen
 * fest aus CANNED statt vom Server, und der Chat von Tom wird vorab eingetragen. Ortssuche und
 * Kartenkacheln sind in der Cloud gesperrt, darum antwortet routes() mit einer Beispielpraxis und
 * einer neutralen Kachel (shots-tile.png).
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

const CANNED = {
  'Ich koche heute Abend Bolognese': { text: 'Mach ich.', actions: [{ tool: 'rezept', input: { dish: 'Bolognese', items: [], extra: ['Hackfleisch 500 g', 'Spaghetti', 'Passierte Tomaten', 'Zwiebeln', 'Karotten', 'Parmesan'] } }] },
  'Erstelle eine Watchlist mit Dune, Oppenheimer und Barbie': { text: 'Mach ich.', actions: [{ tool: 'liste_neu', input: { name: 'Watchlist', items: ['Dune', 'Oppenheimer', 'Barbie'] } }] },
  'Merk dir, Ben hat Schuhgröße 22': { text: 'Gemerkt.', actions: [{ tool: 'merken', input: { fact: 'Ben hat Schuhgröße 22', about: 'Ben' } }] },
  'Merk dir, Oma Inge mag keine Lilien': { text: 'Gemerkt.', actions: [{ tool: 'merken', input: { fact: 'Oma Inge mag keine Lilien', about: 'Oma Inge' } }] },
  'Merk dir, Ben verträgt keine Erdbeeren': { text: 'Gemerkt.', actions: [{ tool: 'merken', input: { fact: 'Ben verträgt keine Erdbeeren', about: 'Ben' } }] },
  'Merk dir, der Kinderarzt hat mittwochs zu': { text: 'Gemerkt.', actions: [{ tool: 'merken', input: { fact: 'Der Kinderarzt hat mittwochs zu', about: 'Kinderarzt' } }] },
};
const TILE = fs.readFileSync(path.join(__dirname, 'shots-tile.png'));
const feat = (name, street, housenumber, postcode, city, lon, lat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, street, housenumber, postcode, city } });
async function routes(p) {
  await p.route(/photon\.komoot\.io/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'FeatureCollection', features: [feat('Zahnarztpraxis Dr. Müller', 'Lindenstraße', '8', '80331', 'München', 11.5702, 48.1371)] }) }));
  await p.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: TILE }));
}

// Jeder Screen: Name in landing/shots und der Weg dorthin, ausgehend vom Chat der Beispielfamilie.
const SCREENS = [
  ['chat', async () => {}],
  ['termin', async ({ say }) => { await say('Freitag 15 Uhr Zahnarzt mit Ben'); }],
  ['einkauf', async ({ say }) => { await say('Wir brauchen Milch und Windeln'); }],
  ['nachfrage', async ({ say }) => { await say('Samstag Kindergeburtstag bei Lena'); }],
  ['fragen', async ({ say }) => { await say('Frag Tom, ob Samstag passt'); }],
  ['rezept', async ({ can, say }) => { await can(); await say('Ich koche heute Abend Bolognese'); }],
  ['chat2', async ({ p, say }) => {
    await say('Wir brauchen Milch und Windeln');
    await p.evaluate(() => {
      const at = (m) => new Date(Date.now() + m * 60000).toISOString();
      globalThis.__feed.put({ id: 'ft2', at: at(1), by: 'T', kind: 'made', said: 'Sonntag 15 Uhr Zoo mit Lena, wir alle', events: ['e-zoo'], text: 'Zoo mit Lena steht im Kalender.', snap: { events: [{ id: 'e-zoo', title: 'Zoo mit Lena', date: '2026-11-01', start: '15:00', end: '17:00', icon: 'kinderwagen' }] } });
      globalThis.__feed.put({ id: 'ft3', at: at(2), by: 'T', kind: 'msg', said: 'Ich hol Ben morgen um 16 Uhr ab 👍' });
    });
  }],
  ['heute', async ({ tab }) => { await tab('Kalender'); }],
  ['mitgedacht', async ({ p, tab }) => { await tab('Kalender'); await p.mouse.move(200, 400); await p.mouse.wheel(0, 260); }],
  ['briefing', async ({ p, tab }) => { await tab('Kalender'); await p.getByText('Wochenbriefing').first().click(); }],
  ['tage', async ({ tab, view }) => { await tab('Kalender'); await view('Tage'); }],
  ['woche', async ({ tab, view }) => { await tab('Kalender'); await view('Woche'); }],
  ['monat', async ({ tab, view }) => { await tab('Kalender'); await view('Monat'); }],
  ['jahr', async ({ tab, view }) => { await tab('Kalender'); await view('Jahr'); }],
  ['bearbeiten', async ({ p, tab }) => { await tab('Kalender'); await p.getByText('U6 bei Dr. Weber').first().click(); }],
  ['listen', async ({ tab }) => { await tab('Listen'); }],
  ['watchlist', async ({ p, can, say, tab }) => { await can(); await say('Erstelle eine Watchlist mit Dune, Oppenheimer und Barbie'); await tab('Listen'); await p.getByText('Watchlist', { exact: true }).last().click({ timeout: 3000 }).catch(() => {}); }],
  ['wissen', async ({ can, say, setting }) => { await can(); for (const t of ['Merk dir, Ben hat Schuhgröße 22', 'Merk dir, Oma Inge mag keine Lilien', 'Merk dir, Ben verträgt keine Erdbeeren', 'Merk dir, der Kinderarzt hat mittwochs zu']) await say(t); await setting('Was ich weiß'); }],
  ['wieder', async ({ say }) => { await say('Montag 10 Uhr U7 mit Ben'); }],
  ['karte', async ({ p, say }) => { await say('Freitag 15 Uhr Zahnarzt mit Ben'); await p.getByPlaceholder(/Dr. Müller/).fill('Dr. Müller'); await p.getByText('Suchen', { exact: true }).click(); }],
  ['urlaub', async ({ setting }) => { await setting('Urlaub und Feiertage'); }],
  ['kalender', async ({ setting }) => { await setting('Google Kalender'); }],
  ['widget', async ({ setting }) => { await setting('Widgets'); }],
  ['teilen', async ({ setting }) => { await setting('Teilen aus einem Chat'); }],
  ['mail', async ({ p }) => { await p.getByLabel(/Einstellungen/).first().click(); }],
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
  await routes(p);
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
    can: () => p.evaluate((c) => { globalThis.__canned = c; }, CANNED),
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
