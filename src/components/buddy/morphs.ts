/**
 * Memo's morphs (Julian 13.11.2026: "mehr davon", "für jede Eventualität eine passende Animation"). On a real
 * result he melts into a small object and back: flat, in his own colour, with his own eyes where they fit.
 * About a second, at most one per action, never while you read or type. Frequent things (ticking an item) only
 * get a glance and ^^.
 *
 * Each morph bends the body (corner radii, a small shift or squash) and adds a few flat parts around or on it.
 * Everything is measured in u (the body is 34 u wide, its centre is 0,0, y grows downwards). c is how far he has
 * melted (0..1), t the ms since the morph began. Only transforms and opacity move; sizes are fixed per morph.
 */
export const MORPH = {
  termin: 1, glocke: 2, korb: 3, sonne: 4, kuchen: 5, idee: 6, lupe: 8, pfeil: 9, flieger: 10, umschlag: 11, haken: 12,
  uhr: 13, koffer: 14, schloss: 15, kette: 16, familie: 17, herz: 18, konflikt: 19, offline: 20, eimer: 21,
} as const;
export type MorphKind = keyof typeof MORPH;
export const MORPH_KINDS = Object.keys(MORPH) as MorphKind[];
/** The most parts any morph uses. */
export const PARTS = 8;

export type Part = {
  /** Centre, size and corner radius in u. */
  x: number; y: number; w: number; h: number; rad: number;
  rot: number; sx: number; sy: number; o: number;
  /** 0 = Memo's colour, 1 = the ground behind him (a cut line), 2 = his eye colour. */
  col: number;
  /** 0 = filled, 1 = ring, 2 = arch open at the bottom, 3 = triangle pointing right. */
  kind: number;
  /** Line width of a ring or arch. */
  bw: number;
  /** A thin line in the ground colour around the part, so it reads against his body. */
  line: number;
};
export type Morph = {
  /** Corner radii as a share of the body width (0.5 = round). */
  tl: number; tr: number; br: number; bl: number;
  bx: number; by: number; bsx: number; bsy: number;
  /** How far the eyes have given way to the thing (a check, a clock, an envelope), 0..1. */
  hide: number;
  parts: Part[];
};

function cl(x: number) { 'worklet'; return x < 0 ? 0 : x > 1 ? 1 : x; }
function seg(t: number, a: number, b: number) { 'worklet'; return cl((t - a) / (b - a)); }
function out(x: number) { 'worklet'; return 1 - Math.pow(1 - x, 4); }
function io(x: number) { 'worklet'; return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }
function lerp(a: number, b: number, p: number) { 'worklet'; return a + (b - a) * p; }
function pulse(t: number, a: number, d: number) { 'worklet'; return out(seg(t, a, a + d)) - out(seg(t, a + d, a + 2 * d)); }

function pt(x: number, y: number, w: number, h: number, rad: number, o: number, col: number): Part {
  'worklet';
  return { x, y, w, h, rad, rot: 0, sx: 1, sy: 1, o, col, kind: 0, bw: 0, line: 0 };
}
/** A bar that grows from one end (px, py) along deg; s is how much of it is drawn. */
function bar(px: number, py: number, len: number, th: number, deg: number, s: number, o: number, col: number): Part {
  'worklet';
  const a = (deg * Math.PI) / 180;
  const p = pt(px + (Math.cos(a) * len * s) / 2, py + (Math.sin(a) * len * s) / 2, len, th, th / 2, o, col);
  p.rot = deg; p.sx = s;
  return p;
}
/** The two little rings on top of a calendar sheet. */
function rings(c: number, parts: Part[]) {
  'worklet';
  const o = cl(c * 1.4 - 0.4);
  for (let i = 0; i < 2; i++) { const p = pt(i ? 7 : -7, -17 + 3 * (1 - c), 3, 6, 1.5, o, 0); p.line = 1.5; parts.push(p); }
}

function all(m: Morph, r: number, c: number) { 'worklet'; m.tl = m.tr = m.br = m.bl = lerp(0.5, r, c); }

export function morph(kind: number, c: number, t: number): Morph {
  'worklet';
  const m: Morph = { tl: 0.5, tr: 0.5, br: 0.5, bl: 0.5, bx: 0, by: 0, bsx: 1, bsy: 1, hide: 0, parts: [] };
  const P = m.parts;
  const soft = cl(c * 1.4 - 0.4);

  if (kind === 1) {
    // Termin: a calendar sheet.
    all(m, 0.22, c); rings(c, P);
  } else if (kind === 2) {
    // Erinnerung: a bell that swings out.
    m.bl = m.br = lerp(0.5, 0.18, c);
    const w = seg(t, 200, 1150), sw = -Math.sin(w * Math.PI * 4) * (1 - w) * c * 2.2;
    P.push(pt(0, lerp(-14, -18.5, c), 4, 4, 2, soft, 0));
    P.push(pt(sw * 1.2, lerp(14, 19.5, c), 6, 6, 3, soft, 0));
  } else if (kind === 3) {
    // Einkauf: a basket with a handle.
    m.tl = m.tr = lerp(0.5, 0.14, c); m.bl = m.br = lerp(0.5, 0.48, c);
    const p = pt(0, lerp(-14, -20, c), 20, 12, 10, soft, 0); p.kind = 2; p.bw = 2.6; p.sx = p.sy = lerp(0.8, 1, c);
    P.push(p);
  } else if (kind === 4) {
    // Ganzer Tag, guten Morgen: a sun, the rays turn slowly.
    const r = lerp(14, 24, c), o = cl(c * 1.3 - 0.3), s = lerp(0.4, 1, c);
    for (let i = 0; i < 8; i++) { const a = i * 0.7854 + (t / 1000) * 0.9; const p = pt(Math.cos(a) * r, Math.sin(a) * r, 4, 4, 2, o, 0); p.sx = p.sy = s; P.push(p); }
  } else if (kind === 5) {
    // Geburtstag: a cake with one candle, the flame flickers.
    m.tl = m.tr = lerp(0.5, 0.2, c); m.bl = m.br = lerp(0.5, 0.12, c);
    const tt = t / 1000, fl = 1 + 0.18 * Math.sin(tt * 9) * Math.sin(tt * 4.1), s = lerp(0.5, 1, c);
    P.push(pt(0, lerp(-14, -21, c), 3.2, 8, 1.4, soft, 0));
    const f = pt(0, lerp(-18, -29, c), 4.4, 6, 2.2, soft, 0); f.sx = fl * s; f.sy = (2 - fl) * s; P.push(f);
  } else if (kind === 6) {
    // Merkt sich etwas, eine Idee: a bulb, the rays blink twice.
    const glow = pulse(t, 450, 160) + pulse(t, 800, 160), rr = lerp(18, 25, c);
    P.push(pt(0, lerp(14, 19, c), 12, 3.4, 1.7, soft, 0));
    P.push(pt(0, lerp(14, 23.6, c), 9, 3.4, 1.7, soft, 0));
    for (let i = -1; i < 2; i++) { const a = -Math.PI / 2 + i * 0.75; const p = pt(Math.cos(a) * rr, Math.sin(a) * rr, 3, 3, 1.5, soft, 0); p.sx = p.sy = 0.6 + 0.4 * glow; P.push(p); }
  } else if (kind === 8) {
    // Suche: a magnifier, he looks through it.
    const k = 1 - 0.18 * c;
    m.bsx = m.bsy = k; m.bx = -3 * c * k; m.by = -3 * c * k;
    P.push(bar(12, 12, 12, 4, 45, c, 1, 0));
  } else if (kind === 9) {
    // Verschoben: the sheet, and an arrow slides along underneath.
    all(m, 0.22, c); rings(c, P);
    const sl = io(seg(t, 250, 750)) * 9 - 4.5;
    P.push(pt(sl, 23, 10, 2.6, 1.3, c, 0));
    const h = pt(sl + 6.4, 23, 4.6, 7, 0, c, 0); h.kind = 3; P.push(h);
  } else if (kind === 10) {
    // Partner benachrichtigt: a paper plane leaves him.
    const f = io(seg(t, 150, 900)), x = lerp(10, 34, f), y = lerp(-8, -30, f);
    const p = pt(x, y, 11, 8, 0, c * (1 - seg(t, 750, 950)), 0); p.kind = 3; p.rot = -40; p.sx = p.sy = lerp(0.7, 1, out(seg(t, 150, 350))); P.push(p);
    for (let i = 1; i < 3; i++) P.push(pt(x - i * 6, y + i * 5, 2.2, 2.2, 1.1, c * f * (1 - seg(t, 700, 950)) * (1 - i * 0.3), 0));
  } else if (kind === 11) {
    // Wochenbriefing: an envelope, the flap draws itself.
    all(m, 0.16, c); m.bsx = 1 + 0.1 * c; m.bsy = 1 - 0.16 * c; m.hide = cl(c * 2);
    const op = io(seg(t, 300, 650)) * c;
    P.push(bar(-15, -11.5, 18.6, 2, 36, op, 1, 1));
    P.push(bar(15, -11.5, 18.6, 2, 144, op, 1, 1));
  } else if (kind === 12) {
    // Liste ganz erledigt: the eyes become one check that draws itself.
    m.hide = cl(c * 2);
    P.push(bar(-8, 0, 7, 3.4, 45, out(seg(t, 250, 420)), c, 2));
    P.push(bar(-4.2, 4.4, 13, 3.4, -48, out(seg(t, 400, 650)), c, 2));
  } else if (kind === 13) {
    // Zeit loszugehen: a clock, the hands turn once.
    m.hide = cl(c * 2);
    const r = io(seg(t, 200, 1000)) * Math.PI * 2, r2 = 2.1 + r / 12;
    const a = pt(Math.sin(r) * 5 * c, -Math.cos(r) * 5 * c, 3, 10, 1.5, 1, 2); a.rot = (r * 180) / Math.PI; a.sy = c; P.push(a);
    const b = pt(Math.sin(r2) * 3.5 * c, -Math.cos(r2) * 3.5 * c, 3, 7, 1.5, 1, 2); b.rot = (r2 * 180) / Math.PI; b.sy = c; P.push(b);
    P.push(pt(0, 0, 4.4, 4.4, 2.2, c, 2));
  } else if (kind === 14) {
    // Urlaub: a suitcase with a handle and two straps.
    all(m, 0.18, c); m.bsx = 1 + 0.12 * c; m.bsy = 1 - 0.12 * c;
    const h = pt(0, lerp(-13, -19.5, c), 12, 7, 3, c, 0); h.kind = 2; h.bw = 2.6; P.push(h);
    for (let i = 0; i < 2; i++) { const s = pt(i ? 10.5 : -10.5, 0, 1.8, 30, 0, 1, 1); s.sy = c; P.push(s); }
  } else if (kind === 15) {
    // Ohne KI: a lock, the shackle drops shut.
    all(m, 0.24, c); m.by = 4 * c; m.bsx = 1 + 0.04 * c; m.bsy = 1 - 0.2 * c;
    const s = pt(0, lerp(-14, -20, c) + lerp(-5, 0, io(seg(t, 450, 700))), 18, 15, 9, c, 0); s.kind = 2; s.bw = 3; P.push(s);
  } else if (kind === 16) {
    // Verbunden (Partner, Kalender): a second link hooks into him.
    m.bx = -8 * c;
    const p = pt(lerp(36, 23, io(seg(t, 150, 600))), 0, 24, 24, 12, c, 0); p.kind = 1; p.bw = 4; p.line = 1.6; P.push(p);
  } else if (kind === 17) {
    // Neu in der Familie: a small Memo rolls in next to him.
    m.bx = -5 * c;
    const f = io(seg(t, 150, 650)), hx = lerp(36, 22, f);
    const p = pt(hx, 8, 16, 16, 8, c, 0); p.line = 1.6; P.push(p);
    for (let i = 0; i < 2; i++) P.push(pt(hx + (i ? 2.4 : -2.4), 7.5, 2, 3.6, 1, c * f, 2));
  } else if (kind === 18) {
    // Danke: a small heart pops up above him.
    const f = out(seg(t, 200, 450)), y = lerp(-17, -23, f), s = lerp(0.6, 1, f);
    const d = pt(0, y + 2, 9, 9, 0, c * f, 0); d.rot = 45; d.sx = d.sy = s; P.push(d);
    for (let i = 0; i < 2; i++) { const p = pt((i ? 3.2 : -3.2) * s, y - 1.5, 9, 9, 4.5, c * f, 0); p.sx = p.sy = s; P.push(p); }
  } else if (kind === 19) {
    // Überschneidung: a second sheet pokes out behind.
    all(m, 0.22, c);
    const f = io(seg(t, 200, 550));
    P.push(pt(5 * f, -17 - 5 * f, 30, 3, 1.5, c, 0));
    P.push(pt(17 + 5 * f, -5 * f, 3, 30, 1.5, c, 0));
  } else if (kind === 20) {
    // Kein Netz: three signal bars, only the first one lit, he looks up at them.
    for (let i = 0; i < 3; i++) {
      const h = 5 + i * 4, s = lerp(0.4, 1, out(seg(t, 150 + i * 60, 400 + i * 60)));
      const p = pt(20 + i * 5.2, -12 - (h * s) / 2, 3.4, h, 1.7, c * (i ? 0.25 : 1), 0); p.sy = s; P.push(p);
    }
  } else if (kind === 21) {
    // Gelöscht: a little bin, the lid lifts and shuts.
    m.tl = m.tr = lerp(0.5, 0.14, c); m.bl = m.br = lerp(0.5, 0.3, c); m.by = 3 * c; m.bsx = 1 - 0.14 * c; m.bsy = 1 - 0.06 * c;
    const deg = -18 * pulse(t, 300, 220), a = (deg * Math.PI) / 180, y = lerp(-14, -21, c);
    const lx = -17 + 17 * Math.cos(a), ly = y + 17 * Math.sin(a);
    const lid = pt(lx, ly, 34, 3.2, 1.6, c, 0); lid.rot = deg; P.push(lid);
    const h = pt(lx + 3.6 * Math.sin(a), ly - 3.6 * Math.cos(a), 10, 4, 2, c, 0); h.kind = 2; h.bw = 2.4; h.rot = deg; P.push(h);
  }
  return m;
}
