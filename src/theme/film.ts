/**
 * Helpers for clock-driven films (docs: /onboarding/motion-skill.md, section 8). Every frame is a pure
 * function of one time value in seconds, so a film is scrubbable, reproducible and has no timers.
 * All functions are worklets: call them inside useAnimatedStyle / useAnimatedProps.
 */

export function clamp01(x: number) {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 before a, 1 after b, linear in between. */
export function seg(t: number, a: number, b: number) {
  'worklet';
  return clamp01((t - a) / (b - a));
}

export function mix(a: number, b: number, p: number) {
  'worklet';
  return a + (b - a) * p;
}

/** Piecewise linear keyframes: xs ascending, ys the values. */
export function kf(x: number, xs: number[], ys: number[]) {
  'worklet';
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * ((x - xs[i - 1]) / (xs[i] - xs[i - 1]));
  }
  return ys[ys.length - 1];
}

function cb(a1: number, a2: number, t: number) {
  'worklet';
  const u = 1 - t;
  return 3 * a1 * t * u * u + 3 * a2 * t * t * u + t * t * t;
}

/** Cubic bezier easing, evaluated by bisection (robust, no state). */
export function bezier(x: number, x1: number, y1: number, x2: number, y2: number) {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let m = x;
  for (let i = 0; i < 22; i++) {
    m = (lo + hi) / 2;
    if (cb(x1, x2, m) < x) lo = m; else hi = m;
  }
  return cb(y1, y2, m);
}

/** Enter, settle, flung motion (theme `easing.out`). */
export function eOut(x: number) {
  'worklet';
  return bezier(x, 0.23, 1, 0.32, 1);
}
/** Across the stage, morphs: soft cushions at both ends. */
export function eMove(x: number) {
  'worklet';
  return bezier(x, 0.7, 0, 0.3, 1);
}
/** Camera: long tail, most of the distance early, a very slow finish. */
export function eTail(x: number) {
  'worklet';
  return bezier(x, 0.12, 0.9, 0.2, 1);
}
/** Exits: accelerate away. */
export function eIn(x: number) {
  'worklet';
  return x * x * x;
}

/** Critically damped step after a kick at a = 0 (seconds). Never overshoots. */
export function crit(a: number, w: number) {
  'worklet';
  if (a <= 0) return 0;
  return 1 - (1 + w * a) * Math.exp(-w * a);
}

/** Follow-through of a body that hit something: A at contact, one damped rebound. */
export function recoil(a: number, A: number, k = 10, w = 22) {
  'worklet';
  if (a < 0) return 0;
  return A * Math.exp(-k * a) * Math.cos(w * a);
}

/** A point on a quadratic bezier from p0 over control c to p1. */
export function quad(p0: number, c: number, p1: number, t: number) {
  'worklet';
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

function n2(v: number) {
  'worklet';
  return Math.round(v * 100) / 100;
}

/**
 * A rounded rect as an SVG path, centred at (cx, cy) and rotated by rot degrees. Always the same
 * commands in the same order, so any two of them interpolate without knots.
 */
export function rrect(cx: number, cy: number, w: number, h: number, r: number, rot = 0) {
  'worklet';
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  const P = (x: number, y: number) => `${n2(cx + x * c - y * s)} ${n2(cy + x * s + y * c)}`;
  const a = `A${n2(rr)} ${n2(rr)} 0 0 1 `;
  const hw = w / 2;
  const hh = h / 2;
  return (
    `M${P(-hw + rr, -hh)}L${P(hw - rr, -hh)}${a}${P(hw, -hh + rr)}` +
    `L${P(hw, hh - rr)}${a}${P(hw - rr, hh)}` +
    `L${P(-hw + rr, hh)}${a}${P(-hw, hh - rr)}` +
    `L${P(-hw, -hh + rr)}${a}${P(-hw + rr, -hh)}Z`
  );
}

/** A rounded rect from its four edges (for shapes whose edges ride different springs). */
export function rrectEdges(l: number, t: number, r: number, b: number, rad: number) {
  'worklet';
  return rrect((l + r) / 2, (t + b) / 2, r - l, b - t, rad, 0);
}
