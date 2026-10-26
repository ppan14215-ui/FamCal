/**
 * Clay icons and their tinted tile (the only coloured surface in a row).
 * When `celebrate` turns true (something was checked off) the icon tells its
 * own little story from its parts (design/icon-motion, Julian 25./26.10.):
 * the coin jumps, the lid lifts, the page flips, the pendulum swings. Icons
 * without parts hop with squash. Never scale-only, never a loop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { clayIcons, ClayName } from '../../lib/clayIcons';
import { clayMotion, ClayMotionSpec } from '../../lib/clayMotion';
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
  useEffect(() => { if (!reduced) t.value = withTiming(1, { duration: spec ? DUR : 900, easing: Easing.linear }); }, []);
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
        const f = seg(k, 0, 0.7);
        return { opacity: k < 0.6 ? 1 : k < 0.72 ? 1 - seg(k, 0.6, 0.72) : seg(k, 0.82, 1), transform: [{ perspective: 600 }, { rotateX: `${-180 * inOut(f)}deg` }] };
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
    if (kind !== 'coin' && kind !== 'stamp') return {};
    const k = seg(t.value, ANT, END);
    const land = kind === 'coin' ? bump(seg(k, 0.58, 0.72)) : bump(seg(k, 0.55, 0.7));
    return { transform: [{ scaleX: 1 + 0.04 * land }, { scaleY: 1 - 0.08 * land }] };
  });

  const box = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  if (!spec) {
    return (
      <Animated.View style={[{ width: size, height: size, transformOrigin: '50% 90%' } as any, style, whole]}>
        <Image source={clayIcons[name]} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    );
  }
  const o = `${(spec.o[0] / 10.24).toFixed(2)}% ${(spec.o[1] / 10.24).toFixed(2)}%`;
  const orbitO = '50% 50%';
  const baseEl = <Animated.Image key="b" source={clayIcons[`${name}__base` as ClayName]} style={[box, { transformOrigin: '50% 85%' } as any, base]} resizeMode="contain" />;
  const partEl = <Animated.Image key="p" source={clayIcons[`${name}__${spec.part}` as ClayName]} style={[box, { transformOrigin: kind === 'orbit' ? orbitO : o } as any, part]} resizeMode="contain" />;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: '50% 90%' } as any, style, whole]}>
      {spec.under ? [partEl, baseEl] : [baseEl, partEl]}
    </Animated.View>
  );
}
