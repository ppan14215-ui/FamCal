/**
 * Builds src/lib/clayMotion.ts from design/icon-motion/meta.min.json: for every
 * clay icon with a moving part, which part moves, how (by the part's name) and
 * around which point. Run: node scripts/gen-motion.js
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const meta = JSON.parse(fs.readFileSync(path.join(root, 'design/icon-motion/meta.min.json'), 'utf8'));
const files = new Set(fs.readdirSync(path.join(root, 'assets/icons')));

// Part name → kind of motion. Everything not listed pops.
const KIND = {
  muenze: 'coin', 'eine-muenze': 'coin', perle: 'orbit',
  deckel: 'lid', klappe: 'lid', lasche: 'lid', buegel: 'lid', verschluss: 'lid', ecke: 'lid',
  blatt: 'flip', seite: 'flip',
  zeiger: 'swing', kloeppel: 'swing', hammer: 'swing', stempel: 'stamp', stift: 'swing', bruststueck: 'swing',
  'oberer-brief': 'slide', 'oberste-karte': 'slide', 'mittlere-pille': 'slide', notiz: 'slide', karte: 'slide', 'oberstes-tuch': 'slide', 'oberer-block': 'slide', 'zweite-blase': 'slide',
  raeder: 'spin', pfeile: 'spin',
  haken: 'pop', siegel: 'pop', pflaster: 'pop', marker: 'pop', stern: 'pop', flamme: 'pop', funkeln: 'pop', dampf: 'pop', sand: 'pop', spruehnebel: 'pop', ring: 'pop',
};
const out = {};
for (const [name, m] of Object.entries(meta)) {
  const parts = Object.keys(m.L || {}).filter((k) => k !== 'whole' && k !== 'base' && !k.startsWith('state'));
  const part = parts.find((p) => files.has(`icon-${name}__${p}.webp`));
  if (!part || !files.has(`icon-${name}__base.webp`)) continue;
  const [x0, y0, x1, y1] = m.L[part];
  const kind = KIND[part] ?? 'pop';
  // Lids hinge at their bottom-left, swings and turning pages at their top, the rest at the centre.
  const o = kind === 'lid' ? [x0, y1] : kind === 'swing' || kind === 'flip' ? [(x0 + x1) / 2, y0] : [(x0 + x1) / 2, (y0 + y1) / 2];
  out[name] = { part, kind, o: o.map((v) => Math.round(v)), under: m.o === 'parts-first', what: m.a };
}
// Pieces cut out later with scripts/split-part.py (Julian 31.10.: "beim Padel wird kurz der Ball geschlagen").
// For a hit, o is the grip the racket or stick swings around.
const EXTRA = {
  padel: { part: 'ball', kind: 'hit', o: [280, 820], under: false, what: 'Schläger holt aus, schlägt den Ball weg, ein neuer fällt herein' },
  tennis: { part: 'ball', kind: 'hit', o: [210, 870], under: false, what: 'Schläger holt aus, schlägt den Ball weg, ein neuer fällt herein' },
  squash: { part: 'ball', kind: 'hit', o: [230, 890], under: false, what: 'Schläger holt aus, schlägt den Ball weg, ein neuer fällt herein' },
  eishockey: { part: 'puck', kind: 'hitslide', o: [790, 190], under: false, what: 'Schläger holt aus, der Puck rutscht flach übers Eis davon und kommt zurück' },
  mond: { part: 'stern', kind: 'twinkle', o: [685, 400], under: false, what: 'Mond wiegt sich, der Stern funkelt' },
  sonne: { part: 'strahlen', kind: 'rays', o: [512, 506], under: false, what: 'Strahlen drehen sich und leuchten nach außen' },
  // Second pictures of the same icon: the part is the other state, laid over the icon itself.
  flaeschchen: { part: 'state-halb-voll', kind: 'state', variant: 'drink', o: [512, 830], under: false, state: true, what: 'Fläschchen kippt, die Milch wird weniger und wieder voll' },
  'kamera-scan': { part: 'state-blitz', kind: 'state', variant: 'flash', o: [512, 512], under: false, state: true, what: 'Auslöser drückt, der Blitz leuchtet auf' },
  reisepass: { part: 'state-offen', kind: 'state', variant: 'open', o: [512, 512], under: false, state: true, what: 'Pass klappt auf und wieder zu' },
  thermometer: { part: 'state-blush', kind: 'state', variant: 'blush', o: [512, 512], under: false, state: true, what: 'Anzeige wird warm, dann wird es heruntergeschüttelt' },
  urkunde: { part: 'state-offen', kind: 'state', variant: 'unroll', o: [512, 512], under: false, state: true, what: 'Urkunde rollt sich auf und wieder zu' },
  zuhause: { part: 'state-dunkel', kind: 'state', variant: 'lights', o: [512, 512], under: false, state: true, what: 'Licht geht kurz aus und warm wieder an' },
};
for (const [name, spec] of Object.entries(EXTRA)) {
  const base = spec.state ? `icon-${name}.webp` : `icon-${name}__base.webp`;
  if (files.has(`icon-${name}__${spec.part}.webp`) && files.has(base)) out[name] = spec;
}
// Motion designer pass 31.10.: better kinds and pivots for the layered icons.
const box = (name, part) => meta[name]?.L?.[part];
const OVERRIDE = {
  chat: (b) => ({ kind: 'popin', o: [b[0] + 30, b[3] - 20], what: 'Zweite Blase ploppt aus ihrem Zipfel auf' }),
  erledigt: () => ({ kind: 'draw', what: 'Haken zeichnet sich von links nach rechts' }),
  hebamme: (b) => ({ kind: 'click', o: [(b[0] + b[2]) / 2, b[1]], what: 'Verschluss klickt auf und zu, die Tasche bleibt ganz' }),
  babyschale: (b) => ({ kind: 'handle', o: [(b[0] + b[2]) / 2, b[3]], what: 'Tragebügel klappt nach hinten und wieder hoch' }),
  glocke: () => { const b = box('glocke', 'base'); return { kind: 'clapper', o: [(b[0] + b[2]) / 2, b[1] + 40], what: 'Glocke schwingt, der Klöppel schlägt hinterher an' }; },
  amt: (b) => ({ kind: 'spin', o: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], what: 'Uhrzeiger laufen einmal rund' }),
  'brief-gelesen': () => ({ kind: 'write', what: 'Marker streicht über den Brief' }),
  'papier-stift': () => ({ kind: 'write', what: 'Stift schreibt eine Zeile' }),
  geburtstag: (b) => ({ kind: 'flicker', o: [(b[0] + b[2]) / 2, b[3]], what: 'Flamme flackert auf' }),
  einladung: () => ({ kind: 'twinkle', what: 'Stern funkelt' }),
  zahn: () => ({ kind: 'twinkle', what: 'Glanz funkelt' }),
  impfung: () => ({ kind: 'apply', what: 'Pflaster wird aufgeklebt' }),
  vertrag: () => ({ kind: 'seal', what: 'Siegel wird aufgedrückt' }),
  kita: () => ({ kind: 'stack', what: 'Oberer Baustein fällt auf den Turm' }),
  waesche: () => ({ kind: 'stack', what: 'Handtuch landet auf dem Stapel' }),
  'noch-offen': () => ({ kind: 'spin', what: 'Gestrichelter Ring dreht sich' }),
  putzen: (b) => ({ kind: 'spray', o: [b[0], (b[1] + b[3]) / 2], what: 'Sprühstoß aus der Düse' }),
  'u-heft': (b) => ({ kind: 'pageY', o: [b[0], (b[1] + b[3]) / 2], what: 'Seite blättert am Rücken um' }),
  schloss: () => ({ kind: 'shackle', what: 'Bügel springt auf und rastet wieder ein' }),
  geschenk: () => ({ kind: 'lidpop', what: 'Deckel hüpft hoch und fällt zurück' }),
  auto: () => ({ ride: true, what: 'Auto fährt los, Räder drehen sich, kommt zurück' }),
  kinderwagen: () => ({ ride: true, what: 'Kinderwagen rollt los, Räder drehen sich, kommt zurück' }),
};
for (const [name, f] of Object.entries(OVERRIDE)) {
  if (!out[name]) continue;
  Object.assign(out[name], f(box(name, out[name].part) || [0, 0, 1024, 1024]));
  out[name].o = out[name].o.map((v) => Math.round(v));
}
const body = `/** Generated by scripts/gen-motion.js from design/icon-motion/meta.min.json. Do not edit. */
import type { ClayName } from './clayIcons';

export type ClayMotionSpec = { part: string; kind: string; o: [number, number]; under: boolean; what: string; variant?: string; state?: boolean; ride?: boolean };

export const clayMotion: Partial<Record<ClayName, ClayMotionSpec>> = ${JSON.stringify(out, null, 1)} as any;
`;
fs.writeFileSync(path.join(root, 'src/lib/clayMotion.ts'), body);
console.log(Object.keys(out).length, 'icons with part motion');
