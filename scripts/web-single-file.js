/**
 * Packs the web export (dist/) into one self-contained HTML page, for hosts
 * that cannot serve the app from a site root (e.g. a Claude Artifact link to
 * test on the phone). JS goes inline, every asset becomes a data: URI that
 * expo-asset looks up instead of fetching /assets/...
 *
 *   EXPO_OFFLINE=1 CI=1 npx expo export -p web && node scripts/web-single-file.js
 *
 * Output: dist/famcal-prototyp.html (only the page body; the host adds <html>/<head>).
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(DIST, 'famcal-prototyp.html');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf' };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const src = html.match(/<script src="([^"]+)"/)[1];
let js = fs.readFileSync(path.join(DIST, src), 'utf8');

// 1. Every asset under dist/assets becomes a data: URI in one global map.
const assets = {};
for (const f of walk(path.join(DIST, 'assets'))) {
  const mime = MIME[path.extname(f)];
  if (mime) assets['/' + path.relative(DIST, f).split(path.sep).join('/')] = `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
}

// 2. Point the bundle at the map. Images and fonts are exported as literal
//    "/assets/..." strings; anything resolved at runtime goes through expo-asset.
let hits = 0;
js = js.replace(/"(\/assets\/[^"?]+)"/g, (lit, u) => (assets[u] ? (hits++, `__ASSETS[${JSON.stringify(u)}]`) : lit));
const hook = "this.fromSource(e.toString().replace(e.origin,''))";
if (!js.includes(hook)) throw new Error('expo-asset resolver not found; check AssetSourceResolver in the bundle');
js = js.replace(hook, "this.fromSource(((p)=>__ASSETS[decodeURIComponent(p.split('?')[0])]||p)(e.toString().replace(e.origin,'')))");

// 3. Keep the inline script from ending early in the HTML parser.
js = js.replace(/<!--/g, '\\x3C!--').replace(/<script/g, '\\x3Cscript').replace(/<\/script/g, '<\\/script');

const page = `<title>FamCal Prototyp</title>
<style>
  html, body { height: 100%; }
  body { overflow: hidden; background: #F5F5F4; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>var __ASSETS = ${JSON.stringify(assets)};</script>
<script>${js}</script>
`;
fs.writeFileSync(OUT, page);
console.log(`${path.relative(process.cwd(), OUT)}: ${(page.length / 1048576).toFixed(1)} MB, ${Object.keys(assets).length} assets inline, ${hits} references`);
