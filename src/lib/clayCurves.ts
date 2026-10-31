/**
 * The motion of every clay icon as plain curves (Julian 31.10.: "mit dem Blick
 * eines Motion Designers"). One place for the app (Reanimated worklets) and the
 * review page (scripts/icon-review), so both always show the same thing.
 *
 * Rules the curves keep:
 * - Real physics where there is a real thing: balls fall on a parabola and
 *   squash where they land, pendulums swing around where they hang, a key
 *   turns, a page turns at its edge.
 * - Separate things never move as one. A racket swings, the ball flies on its
 *   own. Icons whose pieces are baked into one picture get the quiet "press"
 *   until their parts are rendered (docs/design-notes/Icon-Teile-Prompts.md).
 * - Anticipation before, follow-through after, and every curve ends exactly
 *   at rest (x = 1 gives the icon as it was).
 *
 * x runs from 0 to 1 over the whole motion; s is the drawn icon size in px.
 */

export type F = {
  tx?: number; ty?: number; r?: number; sx?: number; sy?: number;
  rx?: number; ry?: number; o?: number;
  /** 0 to 1: warm light behind the icon (bulb). */
  glow?: number;
  /** 0 to 1: how much of the part is drawn, left to right (a check mark drawing itself). */
  reveal?: number;
};

export const DUR = 1250;
const ANT = 0.14;
const END = 0.82;

const clamp = (x: number) => { 'worklet'; return Math.max(0, Math.min(1, x)); };
const seg = (t: number, a: number, b: number) => { 'worklet'; return clamp((t - a) / (b - a)); };
const out = (x: number) => { 'worklet'; return 1 - Math.pow(1 - x, 3); };
const inOut = (x: number) => { 'worklet'; return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const bump = (x: number) => { 'worklet'; return Math.sin(Math.PI * clamp(x)); };
const wob = (x: number, n = 1.5) => { 'worklet'; const c = clamp(x); return Math.sin(Math.PI * 2 * n * c) * (1 - c); };
/** One parabola between a and b, peak h (negative is up). Real gravity. */
const arc = (x: number, a: number, b: number, h: number) => { 'worklet'; const q = seg(x, a, b); return x <= a || x >= b ? 0 : h * 4 * q * (1 - q); };
/** Squash at a contact moment around c. */
const hit = (x: number, c: number, w = 0.06) => { 'worklet'; return bump(seg(x, c - w / 2, c + w / 2)); };
// A throw that lands at 62 % and bounces twice, smaller each time.
const hop = (p: number) => {
  'worklet';
  if (p < 0.62) { const q = p / 0.62; return -4 * q * (1 - q); }
  if (p < 0.84) { const q = (p - 0.62) / 0.22; return -0.22 * 4 * q * (1 - q); }
  const q = (p - 0.84) / 0.16; return -0.06 * 4 * q * (1 - q);
};

/** How long a kind takes; quiet ones are shorter. */
export const durOf = (kind?: string) => (kind === 'press' ? 700 : kind === 'blink' ? 1000 : kind ? DUR : 900);

/** One-piece icons: the whole picture is the thing that moves. */
export function wholeF(kind: string, x: number, s: number): F {
  'worklet';
  switch (kind) {
    case 'press': {
      // The quiet answer to a tap: dip into the knees, spring up a touch, settle. No travel.
      const d = out(seg(x, 0, 0.22)), u = seg(x, 0.22, 0.5), w = wob(seg(x, 0.45, 1), 1);
      const sy = x < 0.22 ? 1 - 0.08 * d : 0.92 + 0.12 * out(u) - 0.04 * u + 0.03 * w;
      const sx = x < 0.22 ? 1 + 0.05 * d : 1.05 - 0.07 * out(u) + 0.02 * u - 0.02 * w;
      return { sx, sy, ty: -0.025 * s * bump(seg(x, 0.22, 0.6)) };
    }
    case 'bounce': {
      // Kicked up from rest: falls on a real parabola, squashes on the floor, two smaller bounces, spin slows down.
      const ty = arc(x, 0.1, 0.5, -0.42 * s) + arc(x, 0.5, 0.72, -0.14 * s) + arc(x, 0.72, 0.86, -0.04 * s);
      const sq = 0.16 * hit(x, 0.5) + 0.08 * hit(x, 0.72, 0.05) + 0.03 * hit(x, 0.86, 0.04) + 0.1 * bump(seg(x, 0.02, 0.12));
      const st = 0.05 * bump(seg(x, 0.1, 0.18)) + 0.05 * bump(seg(x, 0.42, 0.49));
      return { ty, r: 220 * out(seg(x, 0.1, 0.9)), sx: 1 + sq - st, sy: 1 - sq + st };
    }
    case 'blink': {
      // Two blinks, the second quicker, like a real eye.
      const a = bump(seg(x, 0.12, 0.38)), b = bump(seg(x, 0.55, 0.72));
      return { sy: 1 - 0.9 * Math.max(Math.pow(a, 0.6), Math.pow(b, 0.6)), ty: -0.01 * s * a };
    }
    case 'sweep': {
      // Swings from the grip, bristles lead, three strokes that fade out.
      const k = seg(x, 0.06, 0.92);
      const w = Math.sin(Math.PI * 2 * 2.5 * k) * Math.pow(1 - k, 1.2);
      return { r: 16 * w, tx: 0.035 * s * w };
    }
    case 'squeeze': {
      // Squeezed in the middle, holds, lets go with a little overshoot.
      const a = out(seg(x, 0.08, 0.26)), r = seg(x, 0.42, 0.56), w = wob(seg(x, 0.56, 1), 1.2);
      const k = x < 0.42 ? a : 1 - out(r);
      return { sx: 1 - 0.12 * k + 0.05 * w, sy: 1 + 0.07 * k - 0.04 * w };
    }
    case 'iron': {
      const f = inOut(seg(x, 0.08, 0.42)), b = inOut(seg(x, 0.42, 0.7)), h = inOut(seg(x, 0.7, 0.92));
      const tx = x < 0.42 ? 0.13 * s * f : x < 0.7 ? 0.13 * s - 0.2 * s * b : -0.07 * s * (1 - h);
      return { tx, r: 3 * Math.sin(Math.PI * 2 * seg(x, 0.08, 0.92)), sy: 1 - 0.03 * bump(seg(x, 0.08, 0.92)) };
    }
    case 'adjust': {
      // Glasses pushed up, they drop back, settle.
      const up = out(seg(x, 0.1, 0.32)), dn = seg(x, 0.32, 0.46);
      const ty = x < 0.32 ? -0.1 * s * up : -0.1 * s * (1 - dn * dn);
      const land = hit(x, 0.47, 0.08);
      return { ty, r: -6 * bump(seg(x, 0.1, 0.46)) + 3 * wob(seg(x, 0.46, 1), 1), sx: 1 + 0.06 * land, sy: 1 - 0.08 * land };
    }
    case 'glow': {
      // The bulb flickers on, glows, and dims again.
      const g = x < 0.12 ? 0 : x < 0.16 ? 0.7 : x < 0.2 ? 0.15 : x < 0.34 ? out(seg(x, 0.2, 0.34)) : 1 - 0.7 * inOut(seg(x, 0.55, 1));
      return { glow: x >= 0.98 ? 0 : g, sx: 1 + 0.05 * bump(seg(x, 0.18, 0.5)), sy: 1 + 0.05 * bump(seg(x, 0.18, 0.5)) };
    }
    case 'step': {
      // Heel lifts over the toe, sets down, a smaller second step.
      const r = -16 * bump(seg(x, 0.08, 0.46)) - 7 * bump(seg(x, 0.56, 0.82));
      const land = hit(x, 0.47, 0.07) + 0.5 * hit(x, 0.83, 0.06);
      return { r, ty: -0.03 * s * bump(seg(x, 0.08, 0.46)), sx: 1 + 0.05 * land, sy: 1 - 0.07 * land };
    }
    case 'ollie': {
      // Tail down, pop, nose up, level out at the top, land and roll on.
      const r = x < 0.2 ? 10 * out(seg(x, 0.06, 0.2)) : x < 0.44 ? 10 - 22 * out(seg(x, 0.2, 0.32)) + 12 * inOut(seg(x, 0.32, 0.44)) : 0;
      const ty = arc(x, 0.2, 0.6, -0.36 * s);
      const land = hit(x, 0.61, 0.08);
      return { r, ty, sx: 1 + 0.06 * land, sy: 1 - 0.1 * land, tx: 0.04 * s * wob(seg(x, 0.6, 1), 1) };
    }
    case 'glide': {
      // A push, a long glide forward leaning in, back to rest.
      const f = out(seg(x, 0.06, 0.4)), b = inOut(seg(x, 0.45, 0.92));
      const tx = x < 0.45 ? 0.14 * s * f : 0.14 * s * (1 - b);
      return { tx, r: -7 * bump(seg(x, 0.04, 0.45)) + 4 * bump(seg(x, 0.45, 0.95)), ty: -0.02 * s * bump(seg(x, 0.06, 0.4)) };
    }
    case 'float': {
      // Plops onto the water, bobs and rocks until still.
      const plop = x < 0.18 ? -0.18 * s * (1 - Math.pow(seg(x, 0, 0.18), 2)) : 0;
      const k = seg(x, 0.18, 1);
      const bob = 0.05 * s * Math.sin(Math.PI * 2 * 1.5 * k) * (1 - k);
      const land = hit(x, 0.19, 0.08);
      return { ty: plop + bob, r: 6 * Math.sin(Math.PI * 2 * 1.5 * k + 1) * (1 - k), sx: 1 + 0.08 * land, sy: 1 - 0.1 * land };
    }
    case 'toss': {
      // Thrown up spinning, caught by the floor.
      const ty = arc(x, 0.12, 0.66, -0.5 * s);
      const land = hit(x, 0.67, 0.08), crouch = bump(seg(x, 0.02, 0.14));
      return { ty, r: 360 * inOut(seg(x, 0.12, 0.66)), sx: 1 + 0.08 * land + 0.06 * crouch, sy: 1 - 0.12 * land - 0.08 * crouch };
    }
    case 'carry': {
      // Lifted by the handle, swings like a pendulum, set down.
      const up = out(seg(x, 0.08, 0.28)), dn = inOut(seg(x, 0.7, 0.86));
      const ty = x < 0.7 ? -0.12 * s * up : -0.12 * s * (1 - dn);
      const land = hit(x, 0.87, 0.07);
      return { ty, r: 10 * Math.sin(Math.PI * 2 * 1.5 * seg(x, 0.2, 0.86)) * (1 - seg(x, 0.2, 0.86)), sx: 1 + 0.05 * land, sy: 1 - 0.07 * land };
    }
    case 'look': {
      const r = x < 0.4 ? -11 * inOut(seg(x, 0.08, 0.28)) : x < 0.7 ? -11 + 22 * inOut(seg(x, 0.4, 0.58)) : 11 * (1 - out(seg(x, 0.72, 0.9)));
      return { r, ty: -0.03 * s * bump(seg(x, 0.06, 0.92)) };
    }
    case 'lull': {
      const k = seg(x, 0.04, 1);
      return { r: 4 * Math.sin(Math.PI * 2 * 1.5 * k) * (1 - k) };
    }
    case 'shake': {
      // Shaken hard, the way you shake a Polaroid, a rattle or a bottle.
      const k = seg(x, 0.08, 0.78), e = bump(k);
      return { r: 13 * Math.sin(Math.PI * 2 * 4 * k) * e, tx: 0.04 * s * Math.sin(Math.PI * 2 * 4 * k) * e, ty: -0.03 * s * e };
    }
    case 'dangle': {
      // A push, then it swings from where it hangs until still.
      const k = seg(x, 0.04, 1);
      return { r: 16 * Math.sin(Math.PI * 2 * 1.4 * k) * Math.pow(1 - k, 1.4) };
    }
    case 'breathe': {
      const a = inOut(bump(seg(x, 0.04, 0.55))), b = inOut(bump(seg(x, 0.55, 1)));
      return { sx: 1 + 0.04 * a + 0.02 * b, sy: 1 + 0.06 * a + 0.03 * b };
    }
    case 'cardflip': {
      const f = inOut(seg(x, 0.08, 0.72));
      return { ry: 360 * f, ty: -0.06 * s * bump(seg(x, 0.08, 0.72)), sx: 1 + 0.04 * wob(seg(x, 0.72, 1), 1) };
    }
    case 'squish': {
      // A hug: squeezed wide, springs back tall, wobbles.
      const a = out(seg(x, 0.08, 0.26)), r = seg(x, 0.26, 0.42), w = wob(seg(x, 0.42, 1), 1.5);
      const k = x < 0.26 ? a : 1 - out(r) * 1.4;
      return { sx: 1 + 0.1 * k + 0.04 * w, sy: 1 - 0.1 * k - 0.05 * w, r: 4 * wob(seg(x, 0.3, 1), 1) };
    }
    case 'gallop': {
      const k = seg(x, 0.06, 0.86);
      const ty = -0.06 * s * Math.abs(Math.sin(Math.PI * 3 * k)) * (1 - 0.4 * k);
      return { ty, r: 5 * Math.sin(Math.PI * 3 * k) * (1 - k) };
    }
    case 'scan': {
      const k = inOut(seg(x, 0.06, 0.9));
      return { tx: 0.08 * s * Math.sin(Math.PI * 2 * k), ty: -0.06 * s * (1 - Math.cos(Math.PI * 2 * k)) / 2, r: 8 * Math.sin(Math.PI * 2 * k) };
    }
    case 'nudge': {
      const tx = 0.08 * s * bump(seg(x, 0.08, 0.36)) + 0.04 * s * bump(seg(x, 0.42, 0.62));
      return { tx };
    }
    case 'no': {
      // A firm head shake: no.
      const k = seg(x, 0.06, 0.7);
      return { tx: 0.07 * s * Math.sin(Math.PI * 2 * 3 * k) * (1 - k) };
    }
    case 'umbrella': {
      // Folds in a little, pops open, twirls once.
      const c = out(seg(x, 0.06, 0.18)), o = seg(x, 0.18, 0.36), w = wob(seg(x, 0.36, 1), 1.2);
      const sx = x < 0.18 ? 1 - 0.22 * c : 0.78 + 0.3 * out(o) - 0.08 * o + 0.05 * w;
      return { sx, sy: x < 0.18 ? 1 + 0.05 * c : 1.05 - 0.05 * o - 0.03 * w, r: 6 * wob(seg(x, 0.3, 1), 1) };
    }
    case 'mow': {
      const f = inOut(seg(x, 0.08, 0.4)), b = inOut(seg(x, 0.4, 0.68)), h = inOut(seg(x, 0.68, 0.9));
      const tx = x < 0.4 ? 0.12 * s * f : x < 0.68 ? 0.12 * s - 0.18 * s * b : -0.06 * s * (1 - h);
      const v = x < 0.92 ? 0.006 * s * Math.sin(Math.PI * 2 * 22 * x) : 0;
      return { tx, ty: v };
    }
    case 'present': {
      const up = out(seg(x, 0.08, 0.3)), dn = seg(x, 0.6, 0.76);
      const ty = x < 0.6 ? -0.1 * s * up : -0.1 * s * (1 - dn * dn);
      const land = hit(x, 0.77, 0.07);
      return { ty, r: -8 * bump(seg(x, 0.08, 0.3)) + 6 * Math.sin(Math.PI * 4 * seg(x, 0.3, 0.6)) * bump(seg(x, 0.3, 0.6)), sx: 1 + 0.06 * land, sy: 1 - 0.08 * land };
    }
    case 'pressin': {
      // Lifted a touch, pushed in firmly, springs back. A pin, a stamp, a footprint.
      const up = out(seg(x, 0.06, 0.28)), dn = seg(x, 0.28, 0.38);
      const ty = x < 0.28 ? -0.1 * s * up : x < 0.38 ? -0.1 * s + 0.13 * s * dn * dn : 0.03 * s * (1 - out(seg(x, 0.38, 0.6)));
      const sq = bump(seg(x, 0.36, 0.56));
      return { ty, sx: 1 + 0.07 * sq, sy: 1 - 0.1 * sq + 0.02 * wob(seg(x, 0.56, 1), 1) };
    }
    case 'drop': {
      // Lifted out of its place, drops back in with gravity, squashes, settles.
      const up = out(seg(x, 0.06, 0.26)), fall = seg(x, 0.26, 0.42);
      const ty = x < 0.26 ? -0.28 * s * up : x < 0.42 ? -0.28 * s * (1 - fall * fall) : arc(x, 0.48, 0.64, -0.05 * s);
      const land = hit(x, 0.45, 0.08);
      return { ty, sx: 1 + 0.1 * land, sy: 1 - 0.14 * land };
    }
    case 'swirl': {
      const k = seg(x, 0.06, 1);
      return { r: 10 * Math.sin(Math.PI * 2 * 2 * k) * (1 - k), tx: 0.02 * s * Math.sin(Math.PI * 2 * 2 * k + 1) * (1 - k) };
    }
    case 'turn': {
      // A key turns a quarter in the lock and back.
      const r = x < 0.45 ? 90 * inOut(seg(x, 0.08, 0.45)) : 90 * (1 - out(seg(x, 0.55, 0.9))) + 6 * wob(seg(x, 0.85, 1), 1);
      return { r };
    }
    case 'gear': {
      // A gear turns once with weight and a small overshoot.
      return { r: x >= 0.999 ? 0 : 360 * inOut(seg(x, 0.06, 0.78)) + 8 * wob(seg(x, 0.78, 1), 1) };
    }
    case 'cycle': {
      // Recycling arrows go round once.
      return { r: x >= 0.999 ? 0 : 360 * inOut(seg(x, 0.06, 0.82)) + 5 * wob(seg(x, 0.82, 1), 1) };
    }
    case 'drive': {
      // Rock back, race off to the right, come back in from the left and brake.
      let tx = 0, r = 0, o = 1;
      if (x < 0.14) { const e = out(x / 0.14); tx = -0.06 * s * e; r = 4 * e; }
      else if (x < 0.42) { const e = Math.pow(seg(x, 0.14, 0.42), 2); tx = -0.06 * s + 1.1 * s * e; r = 4 - 8 * bump(seg(x, 0.14, 0.3)); o = 1 - seg(x, 0.32, 0.42); }
      else if (x < 0.5) { o = 0; tx = -s; }
      else { const e = out(seg(x, 0.5, 0.86)); tx = -0.9 * s * (1 - e); o = seg(x, 0.5, 0.6); r = -5 * bump(seg(x, 0.78, 0.96)); }
      return { tx, r, o };
    }
    case 'fly': {
      // Takes off up and away, glides back in banking and levels out.
      let tx = 0, ty = 0, r = 0, o = 1;
      if (x < 0.42) { const e = Math.pow(seg(x, 0.08, 0.42), 1.8); tx = 0.9 * s * e; ty = -0.55 * s * e; r = -16 * out(seg(x, 0, 0.2)); o = 1 - seg(x, 0.32, 0.42); }
      else if (x < 0.5) o = 0;
      else { const e = out(seg(x, 0.5, 0.9)); tx = -0.8 * s * (1 - e); ty = 0.3 * s * (1 - e); r = -10 * (1 - e) + 4 * wob(seg(x, 0.8, 1), 1); o = seg(x, 0.5, 0.6); }
      return { tx, ty, r, o };
    }
    case 'rock': {
      const w = wob(seg(x, 0.05, 1), 1.5);
      return { r: 10 * w, tx: 0.035 * s * w, ty: -0.025 * s * Math.abs(w) };
    }
    case 'ring': {
      const k = seg(x, 0.08, 0.85);
      return { ty: -0.05 * s * bump(k), r: 16 * Math.sin(Math.PI * 2 * 5 * k) * bump(k) };
    }
    case 'beat': {
      const a = bump(seg(x, 0.08, 0.26)), b = bump(seg(x, 0.34, 0.5));
      const g = 0.15 * a + 0.09 * b;
      return { sx: 1 + g, sy: 1 + g * 0.85, r: 2 * wob(seg(x, 0.5, 1), 1) };
    }
    case 'buzz': {
      const k = seg(x, 0.08, 0.8), e = bump(k);
      return { tx: 0.02 * s * Math.sin(Math.PI * 2 * 11 * k) * e, r: 1.5 * Math.sin(Math.PI * 2 * 8 * k) * e };
    }
    case 'pour': {
      const r = x < 0.3 ? -32 * inOut(x / 0.3) : x < 0.58 ? -32 + 4 * Math.sin(Math.PI * 4 * seg(x, 0.3, 0.58)) : -32 * (1 - out(seg(x, 0.58, 0.85))) + 4 * wob(seg(x, 0.8, 1), 1);
      return { r };
    }
    case 'drift': {
      const k = seg(x, 0.05, 1);
      return { tx: 0.1 * s * Math.sin(Math.PI * 2 * k) * (1 - 0.3 * k), ty: -0.04 * s * Math.sin(Math.PI * 4 * k) * (1 - k) };
    }
    case 'curl': {
      // A dumbbell curl: lifted in an arc, held, lowered.
      const up = inOut(seg(x, 0.08, 0.36)), dn = inOut(seg(x, 0.52, 0.8));
      const k = x < 0.52 ? up : 1 - dn;
      return { ty: -0.16 * s * k, r: -14 * k, sx: 1 + 0.03 * hit(x, 0.81, 0.07), sy: 1 - 0.05 * hit(x, 0.81, 0.07) };
    }
  }
  return {};
}

/**
 * Icons with their own parts. `wrapF` moves everything a little (anticipation,
 * settle), `baseF` the body, `partF` the moving part. t runs 0 to 1.
 */
export function wrapF(kind: string, t: number, u: number): F {
  'worklet';
  if (kind === 'state') return {};
  let sx = 1, sy = 1;
  if (t < ANT) { const e = out(t / ANT); sx = 1 + 0.05 * e; sy = 1 - 0.07 * e; }
  else if (t < END) { const r = seg(t, ANT, ANT + 0.12); sx = 1.05 - 0.05 * out(r) - 0.03 * bump(r); sy = 0.93 + 0.07 * out(r) + 0.04 * bump(r); }
  else { const w = wob(seg(t, END, 1)); sx = 1 + 0.04 * w; sy = 1 - 0.05 * w; }
  return { sx, sy };
}

export function partF(kind: string, t: number, u: number, variant?: string): F {
  'worklet';
  const k = seg(t, ANT, END);
  switch (kind) {
    case 'coin': return { ty: hop(k) * 300 * u, ry: 720 * inOut(seg(k, 0, 0.62)) };
    case 'orbit': return { r: 360 * inOut(k) };
    case 'lid': return { ty: -60 * u * bump(k), r: -26 * bump(k) };
    case 'lidpop': {
      // A lid pops straight up, tilts, drops back with a bounce.
      const ty = arc(k, 0, 0.55, -260 * u) + arc(k, 0.55, 0.75, -40 * u);
      return { ty, r: -10 * bump(seg(k, 0, 0.55)) };
    }
    case 'flip': {
      // The front page lifts at its top edge, turns over and is gone; then it settles back in.
      if (k < 0.5) { const f = seg(k, 0, 0.5); return { o: 1 - seg(k, 0.38, 0.5), rx: -95 * inOut(f), ty: -14 * u * bump(f) }; }
      const b = out(seg(k, 0.62, 1));
      return { o: seg(k, 0.62, 0.8), rx: -40 * (1 - b) };
    }
    case 'pageY': {
      // A booklet page turns at the spine.
      if (k < 0.5) { const f = seg(k, 0, 0.5); return { o: 1 - seg(k, 0.4, 0.5), ry: -100 * inOut(f) }; }
      return { o: seg(k, 0.6, 0.8), ry: -50 * (1 - out(seg(k, 0.6, 1))) };
    }
    case 'swing': return { r: 24 * wob(k, 1.5) };
    case 'clapper': {
      // Lags behind the bell and hits its wall.
      return { r: -20 * Math.sin(Math.PI * 2 * 1.5 * seg(k, 0.06, 1) - 0.8) * (1 - seg(k, 0.06, 1)) * (k > 0.04 ? 1 : 0) };
    }
    case 'stamp': { const up = k < 0.45 ? out(k / 0.45) : 1 - Math.pow(seg(k, 0.45, 0.6), 2); return { ty: -170 * u * clamp(up) }; }
    case 'slide': return { o: seg(k, 0, 0.25), ty: -240 * u * (1 - out(k)) };
    case 'stack': {
      // Falls onto the stack with gravity, small bounce.
      const f = seg(k, 0, 0.42);
      const ty = k < 0.42 ? -300 * u * (1 - f * f) : arc(k, 0.42, 0.62, -40 * u);
      return { o: seg(k, 0, 0.1), ty };
    }
    case 'spin': return { r: 360 * inOut(k) };
    case 'popin': {
      // Grows out of its tail with one overshoot, never from nothing.
      const s = 0.55 + 0.45 * (1 - Math.exp(-6 * k) * Math.cos(2 * Math.PI * 1.1 * k));
      return { o: seg(k, 0, 0.18), sx: s, sy: s };
    }
    case 'draw': {
      // The check draws itself left to right, then gives a small pop.
      const p = 1 + 0.08 * bump(seg(k, 0.55, 0.85));
      return { reveal: out(seg(k, 0.05, 0.55)), sx: p, sy: p };
    }
    case 'twinkle': {
      const s = 1 + 0.35 * bump(seg(k, 0.1, 0.5)) - 0.1 * bump(seg(k, 0.5, 0.75));
      return { r: 72 * inOut(seg(k, 0.1, 0.7)), sx: s, sy: s };
    }
    case 'flicker': {
      // A flame catches: stretches, flickers, calms.
      const f = Math.sin(Math.PI * 2 * 5 * k) * (1 - k);
      return { sy: 1 + 0.22 * f + 0.15 * bump(seg(k, 0, 0.3)), sx: 1 - 0.08 * f, r: 6 * Math.sin(Math.PI * 2 * 3 * k) * (1 - k) };
    }
    case 'rays': {
      // The rays turn a little and push outward.
      const s = 1 + 0.14 * bump(seg(k, 0.05, 0.7));
      return { r: 45 * inOut(k), sx: s, sy: s };
    }
    case 'apply': {
      // A plaster drops on at an angle and is pressed flat.
      const f = seg(k, 0, 0.4);
      return { o: seg(k, 0, 0.12), ty: -200 * u * (1 - f * f), r: 18 * (1 - out(seg(k, 0, 0.5))), sx: 1 + 0.08 * hit(k, 0.44, 0.1), sy: 1 - 0.1 * hit(k, 0.44, 0.1) };
    }
    case 'seal': {
      const f = seg(k, 0, 0.36);
      return { o: seg(k, 0, 0.1), ty: -220 * u * (1 - f * f), sx: 1 + 0.14 * hit(k, 0.4, 0.1), sy: 1 - 0.18 * hit(k, 0.4, 0.1) };
    }
    case 'click': return { r: -22 * bump(seg(k, 0.05, 0.4)) + 5 * wob(seg(k, 0.4, 1), 1.5) };
    case 'handle': {
      // The carry handle folds back over the seat and returns.
      return { rx: 55 * inOut(bump(seg(k, 0.05, 0.8))) };
    }
    case 'write': {
      // A pen writes a short wavy line, lifts and goes back.
      const w = seg(k, 0.08, 0.68), back = out(seg(k, 0.68, 1));
      const tx = k < 0.68 ? 70 * u * w : 70 * u * (1 - back);
      const wave = Math.sin(Math.PI * 8 * w) * bump(w);
      return { tx, ty: 10 * u * wave - 24 * u * bump(seg(k, 0.68, 1)), r: 6 * wave };
    }
    case 'spray': {
      // A burst from the nozzle that drifts away.
      const s = 0.5 + 0.6 * out(seg(k, 0, 0.4));
      return { o: k < 0.05 ? 0 : 1 - seg(k, 0.5, 0.9) + (k >= 0.95 ? seg(k, 0.95, 1) : 0), sx: s, sy: s };
    }
    case 'shackle': {
      const ty = -80 * u * out(seg(k, 0.05, 0.3)) * (1 - seg(k, 0.5, 0.62)) + arc(k, 0.62, 0.78, -14 * u);
      return { ty };
    }
    case 'hit': {
      // The ball flies off at the hit, a new one drops back into its place.
      const fly = seg(k, 0.36, 0.62);
      if (k < 0.36) return {};
      if (k < 0.62) return { o: 1 - seg(fly, 0.6, 1), tx: 420 * u * out(fly), ty: -380 * u * Math.sin(Math.PI * 0.6 * fly) };
      const d = seg(k, 0.64, 1), q = seg(d, 0, 0.5);
      const ty = d < 0.5 ? -240 * u * (1 - q * q) : -44 * u * bump(seg(d, 0.5, 0.76)) - 12 * u * bump(seg(d, 0.76, 0.92));
      return { o: seg(d, 0, 0.12), ty };
    }
    case 'hitslide': {
      // A puck on ice: shot away flat, slides back in and stops.
      if (k < 0.38) return {};
      if (k < 0.6) { const f = out(seg(k, 0.38, 0.6)); return { tx: 520 * u * f, o: 1 - seg(k, 0.5, 0.6) }; }
      const b = out(seg(k, 0.66, 1));
      return { tx: -360 * u * (1 - b), o: seg(k, 0.66, 0.74), r: 0 };
    }
    case 'state': {
      // The second picture shows up and goes again (milk drunk, flash, pass open).
      const on = variant === 'flash' ? bump(seg(t, 0.2, 0.42)) : variant === 'lights' ? (t < 0.12 ? 0 : t < 0.2 ? 1 : t < 0.26 ? 1 - seg(t, 0.2, 0.26) : 0) : inOut(bump(seg(t, 0.12, 0.9)));
      return { o: on };
    }
    default: {
      // pop: grows from 0.5 with one overshoot (never from nothing).
      const s = k <= 0 ? 0.5 : 0.5 + 0.5 * (1 - Math.exp(-6 * k) * Math.cos(2 * Math.PI * 1.2 * k));
      return { o: clamp(k * 4), sx: s, sy: s };
    }
  }
}

export function baseF(kind: string, t: number, u: number, variant?: string): F {
  'worklet';
  const k = seg(t, ANT, END);
  switch (kind) {
    case 'hit': {
      // Wind back, snap through the ball, swing out and come home.
      const back = out(seg(k, 0, 0.3)), snap = inOut(seg(k, 0.3, 0.42)), home = out(seg(k, 0.42, 1));
      return { r: k < 0.3 ? -18 * back : k < 0.42 ? -18 + 46 * snap : 28 * (1 - home) - 4 * wob(seg(k, 0.42, 1), 1) };
    }
    case 'hitslide': {
      const back = out(seg(k, 0, 0.32)), snap = inOut(seg(k, 0.32, 0.42)), home = out(seg(k, 0.42, 1));
      return { r: k < 0.32 ? 22 * back : k < 0.42 ? 22 - 36 * snap : -14 * (1 - home) };
    }
    case 'coin': { const land = bump(seg(k, 0.58, 0.72)); return { sx: 1 + 0.04 * land, sy: 1 - 0.08 * land }; }
    case 'stamp': case 'seal': case 'stack': case 'apply': { const land = bump(seg(k, 0.36, 0.56)); return { sx: 1 + 0.04 * land, sy: 1 - 0.07 * land }; }
    case 'clapper': return { r: 14 * Math.sin(Math.PI * 2 * 1.5 * k) * (1 - k) };
    case 'twinkle': return { r: 6 * wob(k, 1) };
    case 'click': { const p = bump(seg(k, 0.3, 0.45)); return { sx: 1 + 0.03 * p, sy: 1 - 0.04 * p }; }
    case 'handle': return { r: 3 * wob(seg(k, 0.4, 1), 1.5) };
    case 'rays': { const p = bump(seg(k, 0.05, 0.6)); return { sx: 1 + 0.06 * p, sy: 1 + 0.06 * p }; }
    case 'spray': { const p = bump(seg(k, 0, 0.2)); return { sx: 1 - 0.04 * p, sy: 1 + 0.02 * p }; }
    case 'state': {
      // The whole thing moves with its state.
      if (variant === 'drink') return { r: -18 * inOut(bump(seg(t, 0.06, 0.9))) };
      if (variant === 'flash') { const p = bump(seg(t, 0.12, 0.3)); return { sx: 1 + 0.05 * p, sy: 1 - 0.07 * p }; }
      if (variant === 'open') return { sx: 1 - 0.12 * bump(seg(t, 0.08, 0.2)) - 0.12 * bump(seg(t, 0.8, 0.92)), ty: -40 * u * bump(seg(t, 0.1, 0.9)) };
      if (variant === 'blush') { const kk = seg(t, 0.5, 0.85), e = bump(kk); return { r: 10 * Math.sin(Math.PI * 2 * 3 * kk) * e }; }
      if (variant === 'unroll') return { sx: 1 + 0.06 * bump(seg(t, 0.1, 0.9)) };
      if (variant === 'lights') { const p = bump(seg(t, 0.26, 0.5)); return { sx: 1 + 0.04 * p, sy: 1 + 0.04 * p }; }
      return {};
    }
  }
  return {};
}

/** Reanimated transform list for one frame. */
export function toRN(f: F): any {
  'worklet';
  const tr: any[] = [];
  if (f.rx !== undefined || f.ry !== undefined) tr.push({ perspective: 500 });
  if (f.tx) tr.push({ translateX: f.tx });
  if (f.ty) tr.push({ translateY: f.ty });
  if (f.r) tr.push({ rotate: `${f.r}deg` });
  if (f.rx !== undefined) tr.push({ rotateX: `${f.rx}deg` });
  if (f.ry !== undefined) tr.push({ rotateY: `${f.ry}deg` });
  if (f.sx !== undefined) tr.push({ scaleX: f.sx });
  if (f.sy !== undefined) tr.push({ scaleY: f.sy });
  return { transform: tr, opacity: f.o === undefined ? 1 : f.o };
}

/** The same frame as CSS, for the review page. */
export function toCSS(f: F): string {
  let s = '';
  if (f.rx !== undefined || f.ry !== undefined) s += 'perspective(500px) ';
  if (f.tx) s += `translateX(${f.tx}px) `;
  if (f.ty) s += `translateY(${f.ty}px) `;
  if (f.r) s += `rotate(${f.r}deg) `;
  if (f.rx !== undefined) s += `rotateX(${f.rx}deg) `;
  if (f.ry !== undefined) s += `rotateY(${f.ry}deg) `;
  if (f.sx !== undefined) s += `scaleX(${f.sx}) `;
  if (f.sy !== undefined) s += `scaleY(${f.sy}) `;
  return s;
}
