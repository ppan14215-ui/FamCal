/**
 * Holt die App-Screens der Landing Page aus der echten App, damit beide gleich bleiben.
 * Baut man die App als Web-Demo (Beispielfamilie, keine Anmeldung), startet dieses Skript
 * einen lokalen Server darauf, lädt die Beispielfamilie und fotografiert jede Funktion
 * nach landing/shots/*.webp. Danach baut build.py die Seite.
 *
 *   (im App-Repo)  git apply <famcal>/landing/screens-harness.patch
 *                  EXPO_PUBLIC_DEMO=1 EXPO_OFFLINE=1 CI=1 npx expo export -p web
 *                  git checkout -- src   (Patch wieder entfernen, nie committen)
 *   node landing/sync-screens.js <app>/dist [varianten] [screens]
 *   (Varianten: de-light, de-dark, en-light, en-dark; Bilder nach landing/shots/<variante>/)
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
// Optional: nur bestimmte Varianten (de-light,en-dark) und Screens (chat,termin)
const VARIANTS = (process.argv[3] || 'de-light,de-dark,en-light,en-dark').split(',');
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const URL = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.jpg': 'image/jpeg' };

const CANNED = {
  'Ich koche heute Abend Bolognese': { text: 'Mach ich.', actions: [{ tool: 'rezept', input: { dish: 'Bolognese', items: [], extra: ['Hackfleisch 500 g', 'Spaghetti', 'Passierte Tomaten', 'Zwiebeln', 'Karotten', 'Parmesan'] } }] },
  'Erstelle eine Watchlist mit Dune, Oppenheimer und Barbie': { text: 'Mach ich.', actions: [{ tool: 'liste_neu', input: { name: 'Watchlist', items: ['Dune', 'Oppenheimer', 'Barbie'] } }] },
  "I'm cooking Bolognese tonight": { text: 'On it.', actions: [{ tool: 'rezept', input: { dish: 'Bolognese', items: [], extra: ['Minced beef 500 g', 'Spaghetti', 'Passata', 'Onions', 'Carrots', 'Parmesan'] } }] },
  'Make a watchlist with Dune, Oppenheimer and Barbie': { text: 'On it.', actions: [{ tool: 'liste_neu', input: { name: 'Watchlist', items: ['Dune', 'Oppenheimer', 'Barbie'] } }] },
};
const FACTS = {
  de: [['Ben hat Schuhgröße 22', 'Ben'], ['Oma Inge mag keine Lilien', 'Oma Inge'], ['Ben verträgt keine Erdbeeren', 'Ben'], ['Der Kinderarzt hat mittwochs zu', 'Kinderarzt']],
  en: [['Ben wears shoe size 22', 'Ben'], ['Grandma Inge doesn\'t like lilies', 'Grandma Inge'], ['Ben can\'t have strawberries', 'Ben'], ['The pediatrician is closed on Wednesdays', 'Pediatrician']],
};
for (const l of ['de', 'en']) for (const [fact, about] of FACTS[l]) CANNED[(l === 'de' ? 'Merk dir, ' : 'Remember, ') + fact] = { text: 'Ok.', actions: [{ tool: 'merken', input: { fact, about } }] };

// Was die Steps je Sprache antippen oder sagen
const TX = {
  de: { invited: 'Ich habe eine Einladung', cal: 'Kalender', lists: 'Listen', settings: /Einstellungen/, days: 'Tage', week: 'Woche', month: 'Monat', year: 'Jahr',
    termin: 'Freitag 15 Uhr Zahnarzt mit Ben', karte: 'Freitag 15 Uhr Zahnarzt mit Ben', einkauf: 'Wir brauchen Milch und Windeln', nachfrage: 'Samstag Kindergeburtstag bei Lena', fragen: 'Frag Tom, ob Samstag passt',
    rezept: 'Ich koche heute Abend Bolognese', watch: 'Erstelle eine Watchlist mit Dune, Oppenheimer und Barbie', u7: 'Montag 10 Uhr U7 mit Ben',
    brief: 'Wochenbriefing', u6: 'U6 bei Dr. Weber', wissen: 'Was ich weiß', urlaub: 'Urlaub und Feiertage', gcal: 'Google Kalender', teilen: 'Teilen aus einem Chat', search: 'Suchen', who: 'Dr. Müller',
    zoo: 'Sonntag 15 Uhr Zoo mit Lena, wir alle', zooT: 'Zoo mit Lena', pick: 'Ich hol Ben morgen um 16 Uhr ab 👍', kontext: 'Verschieb Bens Kinderarzt auf Montag', ok: 'Mach ich.' },
  en: { invited: 'I was invited', cal: 'Calendar', lists: 'Lists', settings: /^Settings$/, days: 'Days', week: 'Week', month: 'Month', year: 'Year',
    termin: 'Swimming with Ben on Friday at 3 pm', karte: 'Hairdresser on Friday at 3 pm', einkauf: 'We need milk and nappies', nachfrage: "Kids' birthday party at Lena's on Saturday", fragen: 'Ask Tom if Saturday works',
    rezept: "I'm cooking Bolognese tonight", watch: 'Make a watchlist with Dune, Oppenheimer and Barbie', u7: 'Monday 10am U7 checkup with Ben',
    brief: 'Weekly briefing', u6: 'U6 checkup with Dr. Weber', wissen: 'What I know', urlaub: 'Vacation and holidays', gcal: 'Google Calendar', teilen: 'Teilen aus einem Chat', search: 'Search', who: 'Salon Miller',
    zoo: 'Sunday 3pm zoo with Lena, all of us', zooT: 'Zoo with Lena', pick: "I'll pick Ben up tomorrow at 4 👍", kontext: "Move Ben's pediatrician to Monday", ok: 'On it.' },
};

// Die Beispielfamilie ist auf Deutsch angelegt; für die englischen Screens werden ihre Texte übersetzt.
const EN_DATA = {
  'Arbeit': 'Work', 'Hebamme Sarah': 'Midwife Sarah', 'Nachsorge zu Hause': 'Home visit', 'Krabbelgruppe': 'Baby group', 'Gemeindehaus Südstadt': 'Community hall',
  'U6 bei Dr. Weber': 'U6 checkup with Dr. Weber', 'Tom bringt Ben': 'Tom takes Ben', 'Kinderarztpraxis Weber · Hauptstr. 12': 'Weber Pediatrics · 12 High St', 'Kinderarztpraxis Weber': 'Weber Pediatrics',
  'Aus der Bestätigung von Doctolib, 12. Oktober': 'From the Doctolib confirmation, 12 October', 'U-Heft': 'Health booklet', 'Impfpass': 'Vaccination card', 'Versichertenkarte': 'Insurance card',
  'Rückbildung': 'Postnatal class', 'Hebammenpraxis': 'Midwife practice', 'Hebammenpraxis Lind': 'Lind midwife practice', 'Jeden Donnerstag': 'Every Thursday', 'Jeden Dienstag': 'Every Tuesday',
  'Bürgeramt: Pass': 'Passport for Ben', 'Ben muss mit': 'Ben has to come', 'Bürgeramt Mitte': 'Citizens office', 'Geburtsurkunde des Kindes': "Child's birth certificate",
  'Digitales biometrisches Passfoto vom Fotografen': 'Biometric passport photo', 'Ausweise von euch beiden': 'IDs of you both', '37,50 Euro Gebühr (unter 24 Jahren)': '37.50 euro fee',
  'Falls einer von euch nicht mitkommt: seine Einverständniserklärung und Ausweiskopie': "If one of you can't come: their consent and ID copy",
  'Oma Renate kommt': 'Grandma Renate visits', 'Abendessen': 'Dinner', 'Wochenmarkt': 'Farmers market', 'Gemüse für die Woche': 'Veggies for the week', 'Zoo mit Lena': 'Zoo with Lena', 'Kinderwagen mitnehmen': 'Bring the stroller',
  'Krankenkasse anrufen': 'Call health insurance', 'Ben anmelden': 'Register Ben', 'U3 bei Dr. Weber': 'U3 checkup with Dr. Weber', 'U5 bei Dr. Weber': 'U5 checkup with Dr. Weber', 'erledigt': 'done',
  'Geburtstag Lena': "Lena's birthday", 'Kaffee bei Lena': "Coffee at Lena's", 'Essen bei Lena': "Dinner at Lena's", 'Nachtisch mitbringen': 'Bring dessert', 'Babyflohmarkt': 'Baby flea market', 'Schule am Park': 'Park School',
  'Oma Inge wird 70': 'Grandma Inge turns 70', 'Geburtstag': 'Birthday', 'Fußball': 'Football', 'Sportplatz Süd': 'South sports ground',
  'Bescheinigung anfragen': 'Request employer letter', 'bis 28. Nov': 'by 28 Nov', 'Passfotos machen': 'Get passport photos', 'heute fällig': 'due today', 'Geburtsurkunde abholen': 'Pick up birth certificate',
  'Geschenk für Oma Inge': 'Gift for Grandma Inge', 'bis So 1. Nov': 'by Sun 1 Nov', 'Windeln Größe 3 bestellen': 'Order size 3 nappies', 'ab Dezember': 'from December', 'Essen für Sonntag planen': 'Plan Sunday lunch',
  'Kita-Platz anfragen': 'Apply for nursery place', 'bis Ende Januar': 'by end of January',
  'Einkauf': 'Shopping', 'Drogerie': 'Drugstore', 'Windeln Gr. 2': 'Nappies size 2', 'ab Dezember Größe 3': 'size 3 from December', 'Wundcreme': 'Nappy cream', 'Supermarkt': 'Supermarket',
  'Hafermilch': 'Oat milk', 'ungesüßt': 'unsweetened', 'Brot': 'Bread', 'Kaffee': 'Coffee', 'Bananen': 'Bananas', 'Kliniktasche': 'Hospital bag', 'Geschenke': 'Gifts',
  'Oma Inge, 70': 'Grandma Inge, 70', 'Fotobuch vom ersten Monat': 'Photo book of the first month', 'Mia, 3': 'Mia, 3', 'Holzpuzzle': 'Wooden puzzle', 'Oma Gisela': 'Grandma Gisela',
  'Erste Impfungen': 'First vaccinations', 'Elterngeld: Bescheinigung fehlt': 'Parental allowance: letter missing', 'Elterngeld': 'Parental allowance',
};
async function english(p) {
  await p.evaluate((M) => {
    const tr = (v) => (typeof v === 'string' ? (M[v] ?? v) : Array.isArray(v) ? v.map(tr) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' ? x : tr(x)])) : v);
    globalThis.__fc.set((st) => ({ events: tr(st.events), tasks: tr(st.tasks), lists: tr(st.lists), milestones: tr(st.milestones), inbox: tr(st.inbox), people: tr(st.people) }));
  }, EN_DATA);
}
const TILE = fs.readFileSync(path.join(__dirname, 'shots-tile.png'));
// Echte wirkende Karte rund um den Pin (make-map-tiles.py), Mitte = Kachel 16/34874/22743.
const mapTile = (u) => { const m = /\/16\/(\d+)\/(\d+)\.png/.exec(u); if (!m) return TILE; const f = path.join(__dirname, 'maptiles', `${m[1] - 34874}_${m[2] - 22743}.png`); return fs.existsSync(f) ? fs.readFileSync(f) : TILE; };
const feat = (name, street, housenumber, postcode, city, lon, lat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, street, housenumber, postcode, city } });
async function routes(p) {
  await p.route(/photon\.komoot\.io/, (r) => {
    const q = decodeURIComponent(r.request().url()), salon = /salon/i.test(q);
    const f = /weber/i.test(q) ? feat(/pediatrics/i.test(q) ? 'Weber Pediatrics' : 'Kinderarztpraxis Weber', 'Hauptstraße', '12', '80331', 'München', 11.5702, 48.1371) : salon ? feat('Salon Miller', 'Lindenstraße', '8', '80331', 'München', 11.5702, 48.1371) : feat('Zahnarztpraxis Dr. Müller', 'Lindenstraße', '8', '80331', 'München', 11.5702, 48.1371);
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'FeatureCollection', features: [f] }) });
  });
  await p.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: mapTile(r.request().url()) }));
}

const vac = (p, l) => p.evaluate((en) => globalThis.__fc.set((st) => ({ events: [...st.events,
  { id: 'e-vac1', title: en ? 'Vacation at Lake Garda' : 'Urlaub am Gardasee', icon: 'strand', date: '2026-08-03', endDate: '2026-08-14', start: '', allDay: true, who: 'both' },
  { id: 'e-vac2', title: en ? 'Vacation' : 'Urlaub', icon: 'urlaub', date: '2026-12-28', endDate: '2026-12-30', start: '', allDay: true, who: 'J' }] })), l === 'en');

// Eigene Cover (make-covers.py, keine Studio-Poster) plus Jahr und Regie, wie die App sie sonst online nachschlägt.
const COVERS = { Dune: ['dune', '2021', 'Denis Villeneuve'], Oppenheimer: ['oppenheimer', '2023', 'Christopher Nolan'], Barbie: ['barbie', '2023', 'Greta Gerwig'] };
const films = (p) => p.evaluate((m) => globalThis.__fc.set((st) => ({ lists: st.lists.map((l) => ({ ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.map((i) => (m[i.name] ? { ...i, data: { ...(i.data || {}), kind: 'film', cover: m[i.name][0], year: m[i.name][1], by: m[i.name][2] } } : i)) })) })) })),
  Object.fromEntries(Object.entries(COVERS).map(([k, [f, y, b]]) => [k, ['data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'covers', f + '.png')).toString('base64'), y, b]])));

// Jeder Screen: Name in landing/shots und der Weg dorthin, ausgehend vom Chat der Beispielfamilie.
const SCREENS = [
  ['chat', async () => {}],
  ['termin', async ({ p, say, t }) => { await say(t.termin); await p.getByText(/^(Done|Passt)$/).first().click({ timeout: 1500 }).catch(() => {}); }],
  ['einkauf', async ({ say, t }) => { await say(t.einkauf); }],
  ['nachfrage', async ({ say, t }) => { await say(t.nachfrage); }],
  ['fragen', async ({ say, t }) => { await say(t.fragen); }],
  ['rezept', async ({ can, say, t }) => { await can(); await say(t.rezept); }],
  ['chat2', async ({ p, say, t }) => {
    await say(t.einkauf);
    await p.evaluate((t) => {
      const at = (m) => new Date(Date.now() + m * 60000).toISOString();
      globalThis.__feed.put({ id: 'ft2', at: at(1), by: 'T', kind: 'made', said: t.zoo, events: ['e-zoo'], snap: { events: [{ id: 'e-zoo', title: t.zooT, date: '2026-11-01', start: '15:00', end: '17:00', icon: 'kinderwagen' }] } });
      globalThis.__feed.put({ id: 'ft3', at: at(2), by: 'T', kind: 'msg', said: t.pick });
    }, t);
  }],
  ['heute', async ({ tab, t }) => { await tab(t.cal); }],
  ['mitgedacht', async ({ p, tab, t }) => { await tab(t.cal); await p.mouse.move(200, 400); await p.mouse.wheel(0, 260); }],
  // Die Karte auf Heute ist ausgeblendet (HIDDEN.briefing); die Seite /woche gibt es weiter, darum In-App Navigation ohne Neuladen.
  ['briefing', async ({ p }) => { await p.evaluate(() => { history.pushState({}, '', '/woche'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(1500); }],
  ['tage', async ({ tab, view, t }) => { await tab(t.cal); await view(t.days); }],
  ['woche', async ({ tab, view, t }) => { await tab(t.cal); await view(t.week); }],
  ['monat', async ({ tab, view, t }) => { await tab(t.cal); await view(t.month); }],
  // Zusammenhang: der Satz nennt weder Termin noch Tag genau; die feste Antwort zeigt auf die echte U6 der Beispielfamilie.
  ['kontext', async ({ p, say, t }) => {
    await p.evaluate(({ said, title, ok }) => {
      const e = globalThis.__fc.get().events.find((x) => x.title === title);
      const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      globalThis.__canned = { [said]: { text: ok, actions: [{ tool: 'termin_aendern', input: { id: e.id, date: iso } }] } };
    }, { said: t.kontext, title: t.u6, ok: t.ok });
    await say(t.kontext);
  }],
  // Aufteilen: der Kartenstapel „Wer kümmert sich?“; Eure Familie: Personen mit Großeltern. Beide per In-App Navigation.
  ['aufteilen', async ({ p }) => { await p.evaluate(() => { history.pushState({}, '', '/aufteilen'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(1800); }],
  ['personen', async ({ p }) => { await p.evaluate(() => { history.pushState({}, '', '/personen'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(1800); }],
  ['bearbeiten', async ({ p, tab, t }) => { await tab(t.cal); await p.getByText(t.u6).first().click(); }],
  ['listen', async ({ tab, t }) => { await tab(t.lists); }],
  ['watchlist', async ({ p, can, say, t }) => { await can(); await say(t.watch); await films(p); await p.evaluate(() => { history.pushState({}, '', '/listen'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(1800); await p.getByText('Watchlist', { exact: true }).last().click({ timeout: 3000 }).catch(() => {}); }],
  ['wissen', async ({ can, say, setting, t, l }) => { await can(); for (const [fact] of FACTS[l]) await say((l === 'de' ? 'Merk dir, ' : 'Remember, ') + fact); await setting(t.wissen); }],
  // Wieder: nur die Karte im Chat (Julian 05.11.: zu voll). Entwurf mit Passt schließen, „Wer geht?“ mit Tom beantworten.
  ['wieder', async ({ p, say, t }) => { await say(t.u7); await p.getByText(/^(Passt|Done)$/).last().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); await p.getByText(/^Tom$/).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); }],
  ['karte', async ({ p, say, t }) => { await say(t.karte); await p.getByPlaceholder(/Dr\.|Salon|e\.g\./).first().fill(t.who); await p.getByText(t.search, { exact: true }).click(); }],
  // Urlaub: zwei Urlaube der Beispielfamilie, damit Jahr und Urlaubskonto etwas zeigen.
  ['urlaub', async ({ p, setting, t, l }) => { await vac(p, l); await setting(t.urlaub); }],
  ['jahr', async ({ p, tab, view, t, l }) => { await vac(p, l); await tab(t.cal); await view(t.year); }],
  // Farben: Farbthema der Familie (Personenfarben), Seite /design per In-App Navigation.
  ['farben', async ({ p }) => { await p.evaluate(() => { history.pushState({}, '', '/design'); dispatchEvent(new PopStateEvent('popstate')); }); await p.waitForTimeout(1800); }],
  ['kalender', async ({ setting, t }) => { await setting(t.gcal); }],
  ['widget', async ({ setting }) => { await setting('Widgets'); }],
  ['teilen', async ({ setting, t }) => { await setting(t.teilen); }],
  // Mail: Einstellungen mit der Familienadresse oben; der Bereich „Zum Testen“ gehört nicht auf die Seite.
  ['mail', async ({ p, t }) => { await p.getByLabel(t.settings).first().click(); await p.waitForTimeout(1500); await p.evaluate(() => {
    const h = [...document.querySelectorAll('div')].find((d) => /^(Zum Testen|For testing)$/.test(d.textContent.trim()) && d.children.length <= 1);
    if (!h) return; const y = h.getBoundingClientRect().top - 4;
    for (const d of document.querySelectorAll('div')) { const r = d.getBoundingClientRect(); if (r.top >= y && r.height < 400 && !/Sprich|Just say/.test(d.textContent)) d.style.visibility = 'hidden'; }
  }); }],
  ['brief', async ({ p, l }) => { await p.goto(URL + '/foto-verstanden' + (l === 'en' ? '#en' : '')); await p.reload(); }],
  ['brieflesen', async ({ p, l }) => { await p.goto(URL + '/foto-lesen' + (l === 'en' ? '#en' : '')); await p.reload(); }],
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
  let OUTV = OUT;
  const save = async (name) => {
    await p.waitForTimeout(1800);
    const png = path.join(tmp, name + '.png');
    await p.screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(path.join(OUTV, name + '.webp'))}, 'WEBP', quality=78)`]);
  };
  const failed = [];
  for (const v of VARIANTS) {
    const [l, mode] = v.split('-');
    const t = TX[l];
    OUTV = path.join(OUT, v); fs.mkdirSync(OUTV, { recursive: true });
    // Neu laden verliert die Beispielfamilie, darum jedes Mal frisch über "Ich wurde eingeladen". Sprache per #en, Modus per gespeicherter Wahl.
    const fresh = async () => {
      await p.goto(URL); await p.evaluate((d) => { localStorage.clear(); if (d) localStorage.setItem('famcal.theme', 'dunkel'); }, mode === 'dark');
      await p.goto(URL + (l === 'en' ? '/#en' : '/')); await p.reload(); await p.waitForTimeout(2500);
      await p.getByText(t.invited).first().click({ timeout: 8000 }); await p.waitForTimeout(2200);
      if (l === 'en') { await english(p); await p.waitForTimeout(300); }
    };
    const h = {
      p, t, l,
      can: () => p.evaluate((c) => { globalThis.__canned = c; }, CANNED),
      say: async (x) => { await p.getByPlaceholder(/Sprich oder schreib|Just say or type/).fill(x); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(3000); },
      tab: async (n) => { await p.getByLabel(n, { exact: true }).first().click(); await p.waitForTimeout(1800); },
      view: async (n) => { await p.getByText(n, { exact: true }).first().click(); await p.waitForTimeout(1500); },
      setting: async (n) => { await p.getByLabel(t.settings).first().click(); await p.waitForTimeout(1500); await p.getByText(n, { exact: true }).first().click(); },
    };
    for (const [name, go] of SCREENS.filter(([n]) => !ONLY || ONLY.includes(n))) {
      try { await fresh(); await go(h); await save(name); console.log('ok', v, name); }
      catch (e) { failed.push(`${v}/${name}`); console.log('FEHLT', v, name, e.message.split('\n')[0]); }
    }
  }
  await b.close(); server.close();
  if (failed.length) { console.log('Nicht aktualisiert:', failed.join(', ')); process.exitCode = 2; }
})();
