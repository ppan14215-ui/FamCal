/**
 * Clay icons and their tinted tile (the only coloured surface in a row).
 * When `celebrate` turns true (something was checked off) the icon tells its
 * own little story from its parts (design/icon-motion, Julian 25./26.10.):
 * the coin jumps, the lid lifts, the page turns, the racket hits the ball.
 * One-piece icons move like their thing (clayWhole: cars drive, phones ring);
 * only the rest hop with squash. Never scale-only, never a loop, and every
 * motion ends exactly where it started (31.10.: the calendar page stayed turned).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { clayIcons, ClayName } from '../../lib/clayIcons';
import { clayMotion, ClayMotionSpec } from '../../lib/clayMotion';
import { clayWhole, originOf } from '../../lib/clayWhole';
import { tint } from '../../theme';

const DUR = 1250;
/** Measured: objects span 53 to 66 % of the 1024 canvas, 64 % on average. */
const FILL = 1.35;

export function ClayIcon({ name, size = 40, style, celebrate }: { name: ClayName; size?: number; style?: StyleProp<any>; celebrate?: boolean }) {
  const [n, setN] = useState(0);
  const prev = useRef(celebrate);
  useEffect(() => {
    if (celebrate && !prev.current) setN((x) => x + 1);
    prev.current = celebrate;
  }, [celebrate]);
  // The renders leave about a third of their canvas empty, so the object is
  // drawn larger than its box and fills it (Julian 26.10.: "Icons überall zu
  // klein, sieht man kaum aufm Pixel 10").
  const big = Math.round(size * FILL);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {n ? <ClayMotion key={n} name={name} size={big} /> : <Image source={clayIcons[name]} style={{ width: big, height: big }} resizeMode="contain" accessibilityIgnoresInvertColors />}
    </View>
  );
}

export function Tile({ name, size = 52, radius, ratio = 0.9, bg, style, celebrate }: { name: ClayName; size?: number; radius?: number; ratio?: number; bg?: string; style?: StyleProp<ViewStyle>; celebrate?: boolean }) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.31), backgroundColor: bg ?? tint(name), alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <ClayIcon name={name} size={Math.round(size * ratio)} celebrate={celebrate} />
    </View>
  );
}

// ─── Motion ────────────────────────────────────────────────────────────────
const clamp = (x: number) => { 'worklet'; return Math.max(0, Math.min(1, x)); };
const seg = (t: number, a: number, b: number) => { 'worklet'; return clamp((t - a) / (b - a)); };
const out = (x: number) => { 'worklet'; return 1 - Math.pow(1 - x, 3); };
const inOut = (x: number) => { 'worklet'; return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const bump = (x: number) => { 'worklet'; return Math.sin(Math.PI * clamp(x)); };
const wob = (x: number, n = 1.5) => { 'worklet'; const c = clamp(x); return Math.sin(Math.PI * 2 * n * c) * (1 - c); };
// A throw that lands at 62 % and bounces twice, smaller each time.
const hop = (p: number) => {
  'worklet';
  if (p < 0.62) { const q = p / 0.62; return -4 * q * (1 - q); }
  if (p < 0.84) { const q = (p - 0.62) / 0.22; return -0.22 * 4 * q * (1 - q); }
  const q = (p - 0.84) / 0.16; return -0.06 * 4 * q * (1 - q);
};
const ANT = 0.14; // anticipation share
const END = 0.82; // motion ends, settle follows

function ClayMotion({ name, size, style }: { name: ClayName; size: number; style?: StyleProp<any> }) {
  const spec = clayMotion[name] as ClayMotionSpec | undefined;
  const t = useSharedValue(0);
  const reduced = useReducedMotion();
  const wk = spec ? undefined : clayWhole[name];
  useEffect(() => { if (!reduced) t.value = withTiming(1, { duration: spec || wk ? DUR : 900, easing: Easing.linear }); }, []);
  const u = size / 1024;
  const kind = spec?.kind;

  // Whole icon: dip into the knees, release, settle with a small wobble.
  const whole = useAnimatedStyle((): any => {
    const x = t.value;
    let sx = 1, sy = 1, ty = 0;
    if (x < ANT) { const e = out(x / ANT); sx = 1 + 0.07 * e; sy = 1 - 0.1 * e; }
    else if (x < END) {
      const r = seg(x, ANT, ANT + 0.12); sx = 1.07 - 0.07 * out(r) - 0.04 * bump(r); sy = 0.9 + 0.1 * out(r) + 0.06 * bump(r);
      if (!kind) { const k = seg(x, ANT, END); ty = hop(k) * 150 * u; const land = bump(seg(k, 0.58, 0.7)); sx += 0.08 * land; sy -= 0.12 * land; }
    } else { const w = wob(seg(x, END, 1)); sx = 1 + 0.05 * w; sy = 1 - 0.06 * w; }
    return { transform: [{ translateY: ty }, { scaleX: sx }, { scaleY: sy }] };
  });

  // One-piece icons that move like their thing; each ends exactly at rest.
  const own = useAnimatedStyle((): any => {
    if (!wk) return {};
    const x = t.value, s = size;
    switch (wk) {
      case 'swing': {
        // Wind back, snap through, follow through, come home.
        const r = x < 0.25 ? 20 * out(x / 0.25) : x < 0.36 ? 20 - 52 * inOut(seg(x, 0.25, 0.36)) : -32 * (1 - out(seg(x, 0.36, 0.9))) + 5 * wob(seg(x, 0.5, 1), 1);
        return { transform: [{ rotate: `${r}deg` }] };
      }
      case 'drive': {
        // Rock back, race off to the right, come back in from the left and brake.
        let tx = 0, rot = 0, op = 1;
        if (x < 0.14) { const e = out(x / 0.14); tx = -0.06 * s * e; rot = 4 * e; }
        else if (x < 0.42) { const e = Math.pow(seg(x, 0.14, 0.42), 2); tx = -0.06 * s + 1.1 * s * e; rot = 4 - 8 * bump(seg(x, 0.14, 0.3)); op = 1 - seg(x, 0.32, 0.42); }
        else if (x < 0.5) { op = 0; tx = -1 * s; }
        else { const e = out(seg(x, 0.5, 0.86)); tx = -0.9 * s * (1 - e); op = seg(x, 0.5, 0.6); rot = -5 * bump(seg(x, 0.78, 0.96)); }
        return { opacity: op, transform: [{ translateX: tx }, { rotate: `${rot}deg` }] };
      }
      case 'fly': {
        // Take off up and away, glide back in from below left and level out.
        let tx = 0, ty = 0, rot = 0, op = 1;
        if (x < 0.42) { const e = Math.pow(seg(x, 0.08, 0.42), 1.8); tx = 0.9 * s * e; ty = -0.55 * s * e; rot = -16 * out(seg(x, 0, 0.2)); op = 1 - seg(x, 0.32, 0.42); }
        else if (x < 0.5) op = 0;
        else { const e = out(seg(x, 0.5, 0.9)); tx = -0.8 * s * (1 - e); ty = 0.3 * s * (1 - e); rot = -10 * (1 - e) + 4 * wob(seg(x, 0.8, 1), 1); op = seg(x, 0.5, 0.6); }
        return { opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }] };
      }
      case 'roll': {
        // Kicked up with a spin, lands, bounces twice.
        const k = seg(x, 0.1, 0.9);
        const land = bump(seg(k, 0.58, 0.7));
        return { transform: [{ translateY: hop(k) * 0.32 * s }, { rotate: `${360 * inOut(seg(k, 0, 0.62))}deg` }, { scaleX: 1 + 0.1 * land }, { scaleY: 1 - 0.14 * land }] };
      }
      case 'rock': {
        const w = wob(seg(x, 0.05, 1), 1.5);
        return { transform: [{ rotate: `${12 * w}deg` }, { translateX: 0.04 * s * w }, { translateY: -0.03 * s * Math.abs(w) }] };
      }
      case 'ring': {
        const k = seg(x, 0.08, 0.85);
        const r = 16 * Math.sin(Math.PI * 2 * 5 * k) * bump(k);
        return { transform: [{ translateY: -0.05 * s * bump(k) }, { rotate: `${r}deg` }] };
      }
      case 'beat': {
        // Two beats, the second a little smaller, like a pulse.
        const a = bump(seg(x, 0.08, 0.28)), b = bump(seg(x, 0.36, 0.54));
        const g = 0.16 * a + 0.1 * b;
        return { transform: [{ scaleX: 1 + g }, { scaleY: 1 + g * 0.85 }, { rotate: `${3 * wob(seg(x, 0.54, 1), 1)}deg` }] };
      }
      case 'shine': {
        const k = seg(x, 0.08, 0.9);
        return { transform: [{ rotate: `${90 * inOut(k)}deg` }, { scale: 1 + 0.12 * bump(k) }] };
      }
      case 'buzz': {
        const k = seg(x, 0.1, 0.8);
        return { transform: [{ translateX: 0.025 * s * Math.sin(Math.PI * 2 * 9 * k) * bump(k) }, { rotate: `${2 * Math.sin(Math.PI * 2 * 7 * k) * bump(k)}deg` }] };
      }
      case 'pour': {
        // Tilt to pour, hold, set it back down with a little wobble.
        const r = x < 0.3 ? -32 * inOut(x / 0.3) : x < 0.58 ? -32 + 4 * Math.sin(Math.PI * 4 * seg(x, 0.3, 0.58)) : -32 * (1 - out(seg(x, 0.58, 0.85))) + 4 * wob(seg(x, 0.8, 1), 1);
        return { transform: [{ rotate: `${r}deg` }] };
      }
      case 'sway': {
        const k = seg(x, 0.05, 1);
        const w = Math.sin(Math.PI * 2 * 2 * k) * (1 - k);
        return { transform: [{ rotate: `${11 * w}deg` }, { translateY: -0.04 * s * Math.abs(Math.sin(Math.PI * 4 * k)) * (1 - k) }] };
      }
      case 'drum': {
        // Four quick hits, each one squashes the drum.
        const k = seg(x, 0.06, 0.8);
        const hit = Math.max(0, Math.sin(Math.PI * 2 * 4 * k)) * (1 - 0.5 * k) * (k < 1 ? 1 : 0);
        return { transform: [{ scaleX: 1 + 0.06 * hit }, { scaleY: 1 - 0.09 * hit }, { rotate: `${2 * wob(seg(x, 0.8, 1), 1)}deg` }] };
      }
      case 'scrub': {
        // Three strokes back and forth, leaning into each one.
        const k = seg(x, 0.08, 0.86);
        const w = Math.sin(Math.PI * 2 * 3 * k) * bump(k);
        return { transform: [{ translateX: 0.1 * s * w }, { rotate: `${-7 * w}deg` }] };
      }
      case 'drift': {
        // Floats off to one side, bobs, and drifts back.
        const k = seg(x, 0.05, 1);
        return { transform: [{ translateX: 0.12 * s * Math.sin(Math.PI * 2 * k) * (1 - 0.3 * k) }, { translateY: -0.05 * s * Math.sin(Math.PI * 4 * k) * (1 - k) }] };
      }
      case 'drop': {
        // Lifts out of its spot and drops back in like a pin, with a squash.
        const k = seg(x, 0.06, 0.9);
        const y = k < 0.4 ? -0.4 * s * out(k / 0.4) : k < 0.62 ? -0.4 * s * (1 - Math.pow(seg(k, 0.4, 0.62), 2)) : -0.07 * s * bump(seg(k, 0.72, 0.9));
        const land = bump(seg(k, 0.6, 0.74));
        return { transform: [{ translateY: y }, { scaleX: 1 + 0.12 * land }, { scaleY: 1 - 0.16 * land }] };
      }
      case 'turn': {
        // A quarter turn and back, like turning a key.
        const r = x < 0.45 ? 90 * inOut(seg(x, 0.08, 0.45)) : 90 * (1 - out(seg(x, 0.55, 0.9))) + 6 * wob(seg(x, 0.85, 1), 1);
        return { transform: [{ rotate: `${r}deg` }] };
      }
      case 'pump': {
        // Two lifts: crouch, push up, down again.
        const k = seg(x, 0.05, 0.9);
        const up = Math.max(0, Math.sin(Math.PI * 2 * 2 * k));
        const down = Math.max(0, -Math.sin(Math.PI * 2 * 2 * k));
        return { transform: [{ translateY: -0.14 * s * up }, { scaleX: 1 + 0.08 * down - 0.03 * up }, { scaleY: 1 - 0.1 * down + 0.05 * up }] };
      }
    }
    return {};
  });

  const part = useAnimatedStyle((): any => {
    if (!kind) return {};
    const k = seg(t.value, ANT, END);
    switch (kind) {
      case 'coin': {
        const spin = 720 * inOut(seg(k, 0, 0.62));
        return { transform: [{ perspective: 600 }, { translateY: hop(k) * 300 * u }, { rotateY: `${spin}deg` }] };
      }
      case 'orbit': return { transform: [{ rotate: `${360 * inOut(k)}deg` }] };
      case 'lid': return { transform: [{ translateY: -60 * u * bump(k) }, { rotate: `${-26 * bump(k)}deg` }] };
      case 'flip': {
        // The front page lifts at its top edge, turns over and is gone; the page below shows.
        // Then the page settles back in from above, so the icon ends as it began.
        if (k < 0.5) {
          const f = seg(k, 0, 0.5);
          return { opacity: 1 - seg(k, 0.38, 0.5), transform: [{ perspective: 500 }, { rotateX: `${-95 * inOut(f)}deg` }, { translateY: -14 * u * bump(f) }] };
        }
        const b = out(seg(k, 0.62, 1));
        return { opacity: seg(k, 0.62, 0.8), transform: [{ perspective: 500 }, { rotateX: `${-40 * (1 - b)}deg` }] };
      }
      case 'hit': {
        // The ball or puck flies off at the hit, a new one drops back into its place.
        const fly = seg(k, 0.36, 0.62);
        if (k < 0.36) return {};
        if (k < 0.62) return { opacity: 1 - seg(fly, 0.6, 1), transform: [{ translateX: 420 * u * out(fly) }, { translateY: -380 * u * Math.sin(Math.PI * 0.6 * fly) }, { rotate: `${300 * fly}deg` }] };
        const d = seg(k, 0.64, 1), q = seg(d, 0, 0.5);
        const y = d < 0.5 ? -240 * u * (1 - q * q) : -44 * u * bump(seg(d, 0.5, 0.76)) - 12 * u * bump(seg(d, 0.76, 0.92));
        return { opacity: seg(d, 0, 0.12), transform: [{ translateY: y }] };
      }
      case 'swing': return { transform: [{ rotate: `${24 * wob(k, 1.5)}deg` }] };
      case 'stamp': {
        const up = k < 0.45 ? out(k / 0.45) : 1 - Math.pow(seg(k, 0.45, 0.6), 2);
        return { transform: [{ translateY: -170 * u * clamp(up) }] };
      }
      case 'slide': return { opacity: seg(k, 0, 0.25), transform: [{ translateY: -240 * u * (1 - out(k)) }] };
      case 'spin': return { transform: [{ rotate: `${360 * inOut(k)}deg` }] };
      default: {
        // pop: grows from nothing with one overshoot
        const s = k <= 0 ? 0 : 1 - Math.exp(-6 * k) * Math.cos(2 * Math.PI * 1.2 * k);
        return { opacity: clamp(k * 4), transform: [{ scale: s }] };
      }
    }
  });
  // The base takes the landing of a coin or stamp.
  const base = useAnimatedStyle((): any => {
    if (kind === 'hit') {
      // Wind back, snap through the ball, swing out and come home.
      const k = seg(t.value, ANT, END);
      const back = out(seg(k, 0, 0.3)), snap = inOut(seg(k, 0.3, 0.42)), home = out(seg(k, 0.42, 1));
      const r = k < 0.3 ? 18 * back : k < 0.42 ? 18 - 46 * snap : -28 * (1 - home) + 4 * wob(seg(k, 0.42, 1), 1);
      return { transform: [{ rotate: `${r}deg` }] };
    }
    if (kind !== 'coin' && kind !== 'stamp') return {};
    const k = seg(t.value, ANT, END);
    const land = kind === 'coin' ? bump(seg(k, 0.58, 0.72)) : bump(seg(k, 0.55, 0.7));
    return { transform: [{ scaleX: 1 + 0.04 * land }, { scaleY: 1 - 0.08 * land }] };
  });

  const box = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  if (wk) {
    return (
      <Animated.View style={[{ width: size, height: size, transformOrigin: originOf(name, wk) } as any, style, own]}>
        <Image source={clayIcons[name]} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    );
  }
  if (!spec) {
    return (
      <Animated.View style={[{ width: size, height: size, transformOrigin: '50% 90%' } as any, style, whole]}>
        <Image source={clayIcons[name]} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    );
  }
  const o = `${(spec.o[0] / 10.24).toFixed(2)}% ${(spec.o[1] / 10.24).toFixed(2)}%`;
  const orbitO = '50% 50%';
  const baseEl = <Animated.Image key="b" source={clayIcons[`${name}__base` as ClayName]} style={[box, { transformOrigin: kind === 'hit' ? o : '50% 85%' } as any, base]} resizeMode="contain" />;
  const partEl = <Animated.Image key="p" source={clayIcons[`${name}__${spec.part}` as ClayName]} style={[box, { transformOrigin: kind === 'orbit' ? orbitO : o } as any, part]} resizeMode="contain" />;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: '50% 90%' } as any, style, whole]}>
      {spec.under ? [partEl, baseEl] : [baseEl, partEl]}
    </Animated.View>
  );
}
