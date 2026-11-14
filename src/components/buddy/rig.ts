/**
 * Memo's rig (Julian 13.11.2026, klar look). One clock, one pose. Everything Memo does is a pure function of the
 * time and of when things happened, so every state flows into the next and nothing snaps:
 *
 *   state    idle, type, listen, think, sleep, happy. A change blends from wherever he is right now (420 ms,
 *            the eyes lead, the body follows 80 ms later). ^^ eyes never fade: they close, swap, open (70 + 90 ms).
 *   events   blink, glance, nod, attention, squint, joy, wink, sad. Small overlays on top of the state.
 *   morphs   on a real result he melts into a small object and back (see morphs.ts).
 *
 * No hops, no salto (Julian: "trotzdem bleiben wir 2d"). The body stays almost still and exactly round; the eyes
 * carry the feeling. Looking to the side slides both eyes over and narrows the outer one, which reads as a turn.
 * All functions here are worklets and run on the UI thread; the same ones run once in JS for the first picture.
 */
import { morph, type Morph } from './morphs';

export function cl(x: number) { 'worklet'; return x < 0 ? 0 : x > 1 ? 1 : x; }
export function seg(t: number, a: number, b: number) { 'worklet'; return cl((t - a) / (b - a)); }
/** Quart out. */
export function out(x: number) { 'worklet'; return 1 - Math.pow(1 - x, 4); }
/** Quart in and out. */
export function io(x: number) { 'worklet'; return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }
export function lerp(a: number, b: number, p: number) { 'worklet'; return a + (b - a) * p; }
/** Up over d, down over d. */
export function pulse(t: number, a: number, d: number) { 'worklet'; return out(seg(t, a, a + d)) - out(seg(t, a + d, a + 2 * d)); }
/** In over 260 ms from a, out over 260 ms from a + hold. */
export function env(t: number, a: number, hold: number) { 'worklet'; return io(seg(t, a, a + 260)) * (1 - io(seg(t, a + hold, a + hold + 260))); }
/** One blink: shut in 60 ms, open in 120 ms. */
function bk(x: number) { 'worklet'; return x < 0 ? 1 : x < 60 ? 1 - out(x / 60) * 0.92 : x < 180 ? 0.08 + out((x - 60) / 120) * 0.92 : 1; }
/** Blink swap into ^^ at a and back at b: 0 = pills, 0.5 = shut, 1 = ^^. */
function swap(x: number, a: number, b: number) {
  'worklet';
  if (x >= b) return x < b + 70 ? 1 - 0.5 * out((x - b) / 70) : 0.5 - 0.5 * out(cl((x - b - 70) / 90));
  return x < a ? 0 : x < a + 70 ? 0.5 * out((x - a) / 70) : 0.5 + 0.5 * out(cl((x - a - 70) / 90));
}

export const ST = { idle: 0, type: 1, listen: 2, think: 3, sleep: 4, happy: 5 } as const;
export const POSE = { none: 0, peek: 1, wave: 2 } as const;
const NEVER = -1e9;

/** What a state alone says about him. Units: turn and gaze -1..1, sizes as factors, rot in degrees, ty/tx in u. */
export type Base = {
  turn: number; gx: number; gy: number; sx: number; sy: number; rot: number; tx: number; ty: number;
  blink: number; dash: number; wide: number; happy: number; peek: number;
  /** Thinking dots: how visible, how far from a line to a circle, the circle's angle, a shift towards where he looks. */
  tho: number; thm: number; tha: number; thx: number;
};
export type Frame = Base & {
  /** Lids of the left and right eye (a wink shuts one). */
  wl: number; wr: number;
  /** The state part alone, kept so the next state can start from it. */
  b: Base;
  m: Morph | null;
};

/** What the screen tells him (written from JS). The N fields are counters: a new number means "now". */
export type In = {
  st: number; pose: number; breathe: number;
  restX: number; restY: number; typeX: number; typeY: number;
  blinkN: number; blink2: number;
  glN: number; glX: number; glY: number; glHold: number;
  nodN: number; pokeN: number; tapN: number; winkN: number; sadN: number;
  joyN: number; joyKind: number; joyLong: number;
};
/** What he remembers (kept on the UI thread): the state he is in and when each thing happened, on his own clock. */
export type Rt = {
  st: number; stAt: number; snap: Base;
  blinkN: number; blinkAt: number; blink2: number;
  glN: number; glAt: number; glX: number; glY: number; glHold: number; glFX: number; glFY: number;
  nodN: number; nodAt: number; pokeN: number; pokeAt: number; tapN: number; tapAt: number;
  winkN: number; winkAt: number; sadN: number; sadAt: number;
  joyN: number; joyAt: number; joyKind: number; joyLong: number;
};

export function zero(): Base {
  'worklet';
  return { turn: 0, gx: 0, gy: 0, sx: 1, sy: 1, rot: 0, tx: 0, ty: 0, blink: 1, dash: 0, wide: 1, happy: 0, peek: 0, tho: 0, thm: 0, tha: 0, thx: 0 };
}
export function firstIn(p: Partial<In>): In {
  return { st: 0, pose: 0, breathe: 0, restX: 0, restY: 0, typeX: -0.55, typeY: 0.75, blinkN: 0, blink2: 0, glN: 0, glX: 0, glY: 0, glHold: 1000, nodN: 0, pokeN: 0, tapN: 0, winkN: 0, sadN: 0, joyN: 0, joyKind: 0, joyLong: 900, ...p };
}
export function firstRt(i: In): Rt {
  return {
    // He starts settled in his state, as if he had been in it for a long while.
    st: i.st, stAt: NEVER, snap: zero(),
    blinkN: i.blinkN, blinkAt: NEVER, blink2: 0, glN: i.glN, glAt: NEVER, glX: 0, glY: 0, glHold: 1000, glFX: 0, glFY: 0,
    nodN: i.nodN, nodAt: NEVER, pokeN: i.pokeN, pokeAt: NEVER, tapN: i.tapN, tapAt: NEVER,
    winkN: i.winkN, winkAt: NEVER, sadN: i.sadN, sadAt: NEVER, joyN: i.joyN, joyAt: NEVER, joyKind: 0, joyLong: 900,
  };
}

/** Notes what is new since the last frame. Returns the same object when nothing happened. */
export function sync(i: In, r: Rt, t: number, last: Base): Rt {
  'worklet';
  if (i.st === r.st && i.blinkN === r.blinkN && i.glN === r.glN && i.nodN === r.nodN && i.pokeN === r.pokeN && i.tapN === r.tapN
    && i.winkN === r.winkN && i.sadN === r.sadN && i.joyN === r.joyN) return r;
  const n = { ...r };
  if (i.st !== r.st) { n.st = i.st; n.stAt = t; n.snap = last; }
  if (i.blinkN !== r.blinkN) { n.blinkN = i.blinkN; n.blinkAt = t; n.blink2 = i.blink2; }
  if (i.glN !== r.glN) {
    // A new glance starts from where the eyes are right now, not from the middle.
    const x = t - r.glAt, a = io(seg(x, 0, 280)), z = 1 - io(seg(x, r.glHold, r.glHold + 300));
    n.glFX = lerp(r.glFX, r.glX, a) * z; n.glFY = lerp(r.glFY, r.glY, a) * z;
    n.glN = i.glN; n.glAt = t; n.glX = i.glX; n.glY = i.glY; n.glHold = i.glHold;
  }
  if (i.nodN !== r.nodN) { n.nodN = i.nodN; n.nodAt = t; }
  if (i.pokeN !== r.pokeN) { n.pokeN = i.pokeN; n.pokeAt = t; }
  if (i.tapN !== r.tapN) { n.tapN = i.tapN; n.tapAt = t; }
  if (i.winkN !== r.winkN) { n.winkN = i.winkN; n.winkAt = t; }
  if (i.sadN !== r.sadN) { n.sadN = i.sadN; n.sadAt = t; }
  if (i.joyN !== r.joyN) { n.joyN = i.joyN; n.joyAt = t; n.joyKind = i.joyKind; n.joyLong = i.joyLong; }
  return n;
}

/** A state on its own, ts ms after it began. v = the voice (0..1), g = where the eyes rest. */
function state(st: number, ts: number, v: number, gx: number, gy: number): Base {
  'worklet';
  const b = zero();
  if (st === 2) {
    // Listening: eyes a little wider and up, he grows a touch and the voice moves him evenly.
    b.wide = 1.12; b.gy = -0.3; b.sx = 1.05 + 0.05 * v; b.sy = b.sx;
    return b;
  }
  if (st === 3) {
    // Thinking, slowly: look up to one side, hold, the other side, then the eyes become three dots that orbit.
    const t1 = io(seg(ts, 0, 700)), t2 = io(seg(ts, 1900, 2600));
    const tn = lerp(lerp(0, 0.66, t1), -0.55, t2);
    b.turn = tn; b.gx = tn * 0.15; b.gy = -0.6 * t1; b.sx = 1 - 0.015 * t1;
    b.tho = out(seg(ts, 2500, 2900)); b.thm = io(seg(ts, 2900, 3400)); b.tha = (ts / 1000) * 2.2; b.thx = -4 * t2;
    return b;
  }
  if (st === 4) {
    // Night, slowly: heavy lids, two sleepy blinks, the eyes close to lines, later one eye peeks once.
    const down = io(seg(ts, 0, 700)), b1 = pulse(ts, 600, 280), b2 = pulse(ts, 1300, 400);
    const lid = lerp(1, 0.6, down) * (1 - 0.45 * b1) * (1 - 0.55 * b2);
    const shut = io(seg(ts, 1800, 2700));
    b.blink = lerp(lid, 1, shut); b.dash = shut; b.turn = -0.3 * down * (1 - shut); b.gy = 0.5 * down; b.rot = -6 * shut;
    b.peek = ts < 4300 ? pulse(ts, 3500, 260) : 0;
    return b;
  }
  if (st === 5) { b.happy = 1; return b; }
  b.turn = gx * 0.6; b.gx = gx * 0.2; b.gy = gy * 0.8;
  return b;
}

/** From where he was (A) into the new state (B), ts ms after the change. */
function flow(A: Base, B: Base, ts: number): Base {
  'worklet';
  if (ts >= 500) return B;
  const e = io(seg(ts, 0, 420)), d = io(seg(ts, 80, 500));
  const hk = ts < 70 ? 0.5 * out(ts / 70) : 0.5 + 0.5 * out(cl((ts - 70) / 90));
  const o = zero();
  o.turn = lerp(A.turn, B.turn, e); o.gx = lerp(A.gx, B.gx, e); o.gy = lerp(A.gy, B.gy, e);
  o.blink = lerp(A.blink, B.blink, e); o.dash = lerp(A.dash, B.dash, e); o.wide = lerp(A.wide, B.wide, e); o.peek = lerp(A.peek, B.peek, e);
  o.happy = A.happy + (B.happy - A.happy) * hk;
  o.sx = lerp(A.sx, B.sx, d); o.sy = lerp(A.sy, B.sy, d); o.rot = lerp(A.rot, B.rot, d); o.tx = lerp(A.tx, B.tx, d); o.ty = lerp(A.ty, B.ty, d);
  if (A.tho > B.tho) {
    // The dots first come back into a line, then fade, while the eyes open again.
    o.thm = A.thm * (1 - io(cl(e * 1.7))); o.tho = A.tho * (1 - cl((e - 0.45) * 2.2)) + B.tho; o.tha = A.tha + (ts / 1000) * 2.2; o.thx = A.thx;
  } else { o.tho = lerp(A.tho, B.tho, e); o.thm = B.thm; o.tha = B.tha; o.thx = B.thx; }
  return o;
}

/** The whole picture at time t. */
export function frame(t: number, i: In, r: Rt, v: number, gx: number, gy: number): Frame {
  'worklet';
  const ts = t - r.stAt;
  const b = flow(r.snap, state(r.st, ts, v, gx, gy), ts);
  const p: Frame = { ...b, wl: 1, wr: 1, b, m: null };
  let x = 0;

  if (i.breathe) { const br = 1 + Math.sin((t / 1000) * (r.st === 4 ? 0.9 : 1.4)) * 0.01; p.sx *= br; p.sy *= br; }
  if (i.pose === 1) { p.gy -= 0.7; p.turn += 0.25 * Math.sin(t / 1400); }
  if (i.pose === 2) {
    // Hello, without arms: he tips his head twice with ^^, waits, and does it again.
    x = t % 3200;
    const w = seg(x, 150, 1250);
    p.rot += 8 * Math.sin(w * Math.PI * 2) * (1 - w * 0.4); p.happy = Math.max(p.happy, swap(x, 150, 1250));
  }

  x = t - r.blinkAt;
  if (x < 700) p.blink *= Math.min(bk(x), r.blink2 ? bk(x - 240) : 1);

  x = t - r.glAt;
  if (x < r.glHold + 400) {
    const a = io(seg(x, 0, 280)), z = 1 - io(seg(x, r.glHold, r.glHold + 300));
    const cx = lerp(r.glFX, r.glX, a) * z, cy = lerp(r.glFY, r.glY, a) * z;
    p.turn += cx * 0.9; p.gx += cx * 0.25; p.gy += cy; p.rot += cx * 3;
  }

  x = t - r.nodAt;
  if (x < 400) p.gy += 0.25 * pulse(x, 0, 110);

  // Something asks for his attention: a blink, then the eyes a touch wider.
  x = t - r.pokeAt;
  if (x < 700) { p.blink *= bk(x); p.wide *= 1 + 0.12 * pulse(x, 150, 160); }

  // Tapped: he squints for a moment.
  x = t - r.tapAt;
  if (x < 700) {
    const k = seg(x, 0, 60) - seg(x, 380, 520), pk = pulse(x, 0, 90);
    p.dash += k; p.sx *= 1 + 0.06 * pk; p.sy *= 1 - 0.07 * pk; p.rot -= 3 * pulse(x, 0, 160);
  }

  let winkAt = r.winkAt;
  x = t - r.joyAt;
  if (x < 4000) {
    const sq = pulse(x, 0, 110);
    p.sx *= 1 + 0.05 * sq; p.sy *= 1 - 0.06 * sq;
    const k = r.joyKind;
    if (!k) {
      // Glad: the smallest squash, a slight tilt, ^^.
      const L = r.joyLong;
      p.rot += 5 * io(seg(x, 60, 360)) * (1 - io(seg(x, L, L + 300)));
      p.happy = Math.max(p.happy, swap(x, 0, L));
    } else {
      // A real result: he melts into the thing, holds, and comes back (about a second).
      const mt = x - 120, c = env(mt, 0, 1000);
      if (c > 0.001) p.m = morph(k, c, mt);
      let hp = 0;
      if (k === 1) { p.sy *= 1 + 0.04 * c; p.gy += 0.35 * c; winkAt = Math.max(winkAt, r.joyAt + 770); }
      else if (k === 2) { const w = seg(mt, 200, 1150); p.rot += 9 * Math.sin(w * Math.PI * 4) * (1 - w) * c; p.gy += 0.3 * c; }
      else if (k === 3) { const dip = pulse(mt, 420, 120); p.sx *= 1 + 0.05 * c + 0.04 * dip; p.sy *= 1 - 0.03 * c - 0.05 * dip; p.gy += 0.45 * c; hp = swap(mt, 300, 1000); }
      else if (k === 4) { p.sx *= 1 - 0.2 * c; p.sy *= 1 - 0.2 * c; hp = swap(mt, 300, 1000); }
      else if (k === 5) { p.sy *= 1 - 0.2 * c; p.sx *= 1 + 0.06 * c; p.ty += 3 * c; p.gy += 0.3 * c; hp = swap(mt, 350, 1050); }
      else if (k === 6) { p.sy *= 1 - 0.06 * c; p.ty -= 2 * c; p.wide *= 1 + 0.14 * (pulse(mt, 450, 160) + pulse(mt, 800, 160)); p.gy -= 0.5 * c; }
      else if (k === 8) { p.turn += 0.45 * c * Math.sin(mt / 380); p.gx -= 0.3 * c; p.gy -= 0.3 * c; }
      else if (k === 10) winkAt = Math.max(winkAt, r.joyAt + 620);
      else if (k === 14) p.gy += 0.3 * c;
      else if (k === 15) p.gy += 0.4 * c;
      else if (k === 16) p.turn += 0.45 * c;
      else if (k === 17) { p.turn += 0.55 * c; hp = swap(mt, 600, 1050); }
      else if (k === 18) hp = swap(mt, 100, 1050);
      else if (k === 19) { p.turn -= 0.4 * c; p.gy += 0.2 * c; }
      else if (k === 20) { p.turn += 0.5 * c; p.gy -= 0.4 * c; p.gx += 0.2 * c; }
      else if (k === 21) p.blink *= 1 - 0.92 * pulse(mt, 300, 80);
      p.happy = Math.max(p.happy, hp);
    }
  }

  x = t - winkAt;
  if (x > -100 && x < 800) {
    const w = seg(x, 0, 70) - seg(x, 260, 360);
    p.wr *= 1 - 0.92 * w; p.rot -= 3 * io(seg(x, -80, 120)) * (1 - io(seg(x, 400, 650))); p.gx += 0.3 * w;
  }

  // "Klappt nicht": he looks down, sinks a little, one slow blink, and comes back.
  x = t - r.sadAt;
  if (x < 2200) {
    const sd = io(seg(x, 0, 300)) * (1 - io(seg(x, 1500, 1900)));
    p.gy += 0.55 * sd; p.sy *= 1 - 0.035 * sd; p.sx *= 1 + 0.02 * sd; p.wide *= 1 - 0.1 * sd; p.rot -= 3 * sd; p.blink *= 1 - 0.6 * pulse(x, 950, 220);
  }

  if (p.turn > 0.8) p.turn = 0.8; else if (p.turn < -0.8) p.turn = -0.8;
  return p;
}

/** How long the clock has to run after something happened, so the frames stop when he is at rest again. */
export const RUN = { state: 700, sleep: 5200, blink: 560, poke: 760, tap: 760, nod: 460, wink: 900, sad: 2300, gaze: 520, morph: 1700 } as const;
