/**
 * Fotografiert den Onboarding-Schritt „Memo denkt mit“ (Baby kommt, erstes Jahr, Aufgaben, Aufteilen)
 * für die Landing Page. App als Web-Demo exportieren (LIGHT_ONLY lokal auf false für Dunkel, nie committen):
 *   EXPO_PUBLIC_DEMO=1 EXPO_OFFLINE=1 CI=1 npx expo export -p web --output-dir dist-ob
 *   node landing/sync-baby.js <app>/dist-ob [varianten] [filme]   (filme: Filmliste mit eigenen Covern)
 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(process.argv[2]), PORT = 8732, URL = `http://localhost:${PORT}`;
const VARIANTS = (process.argv[3] || 'de-light,de-dark,en-light,en-dark').split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
(async () => {
  const server = http.createServer((q, r) => {
    let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html');
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(PORT);
  const b = await chromium.launch();
  for (const v of VARIANTS) {
    const [l, mode] = v.split('-');
    const p = await b.newPage({ viewport: { width: 393, height: 790 }, deviceScaleFactor: 2, locale: l === 'en' ? 'en-US' : 'de-DE' });
    await p.goto(URL); await p.evaluate((d) => { localStorage.clear(); if (d) localStorage.setItem('famcal.theme', 'dunkel'); }, mode === 'dark');
    const q = `/onboarding/flow?step=baby&a=${l === 'en' ? 'Julia&b=Tom' : 'Julia&b=Tom'}${l === 'en' ? '#en' : ''}`;
    await p.goto(URL + q); await p.reload(); await p.waitForTimeout(3500);
    const yes = async () => { const box = p.locator('textarea').first(); await box.fill(l === 'en' ? 'Yes' : 'Ja'); await p.waitForTimeout(300); await p.getByLabel(/^(Senden|Send)$/).first().click(); };
    const shot = async (name) => { const png = `/tmp/baby-${v}-${name}.png`; await p.screenshot({ path: png }); execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${path.join(__dirname, 'shots', v, name + '.webp')}', 'WEBP', quality=78)`]); };
    if (process.argv[4] === 'filme') {
      await p.goto(URL + `/onboarding/flow?step=filme&a=Julia&b=Tom${l === 'en' ? '#en' : ''}`); await p.reload(); await p.waitForTimeout(3000);
      const box = p.locator('textarea').first(); await box.fill(l === 'en' ? 'We have to watch Dune' : 'Den Film Dune müssen wir sehen'); await p.waitForTimeout(300);
      await p.getByLabel(/^(Senden|Send)$/).first().click(); await p.waitForTimeout(4500); await shot('filme'); console.log('ok', v, 'filme'); await p.close(); continue;
    }
    try {
      await shot('baby1');
      await yes(); await p.waitForTimeout(3500); await shot('baby2');
      await yes(); await p.waitForTimeout(4500); await shot('baby');
      console.log('ok', v);
    } catch (e) { console.log('FEHLT', v, e.message.split('\n')[0]); }
    await p.close();
  }
  await b.close(); server.close();
})();
