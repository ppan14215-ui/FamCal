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
import { wholeF, wrapF, partF, baseF, toRN, durOf } from '../../lib/clayCurves';
import { clayIcons, ClayName } from '../../lib/clayIcons';
import { clayMotion, ClayMotionSpec } from '../../lib/clayMotion';
import { clayWhole, PRESS } from '../../lib/clayWhole';
import { tint } from '../../theme';

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
// All curves live in lib/clayCurves.ts (shared with the review page).

function ClayMotion({ name, size, style }: { name: ClayName; size: number; style?: StyleProp<any> }) {
  const spec = clayMotion[name] as ClayMotionSpec | undefined;
  const whole = spec ? undefined : (clayWhole[name] ?? PRESS);
  const t = useSharedValue(0);
  const reduced = useReducedMotion();
  const kind = spec ? spec.kind : whole!.kind;
  const variant = spec?.variant;
  const ride = !!spec?.ride;
  useEffect(() => { if (!reduced) t.value = withTiming(1, { duration: durOf(kind), easing: Easing.linear }); }, []);
  const u = size / 1024;

  const outer = useAnimatedStyle((): any => {
    if (!spec) return toRN(wholeF(kind, t.value, size));
    if (ride) return toRN(wholeF('drive', t.value, size));
    // A second picture rides with the whole icon, so the icon itself moves.
    if (kind === 'state') return toRN(baseF(kind, t.value, u, variant));
    return toRN(wrapF(kind, t.value, u));
  });
  const part = useAnimatedStyle((): any => (spec ? toRN(partF(kind, t.value, u, variant)) : {}));
  const base = useAnimatedStyle((): any => (spec && kind !== 'state' ? toRN(baseF(kind, t.value, u, variant)) : {}));
  // A check mark draws itself: the part sits in a box that grows from the left.
  const reveal = useAnimatedStyle((): any => (kind === 'draw' ? { width: size * (partF(kind, t.value, u).reveal ?? 1) } : {}));
  const glow = useAnimatedStyle((): any => (kind === 'glow' ? { opacity: wholeF(kind, t.value, size).glow ?? 0 } : { opacity: 0 }));

  const box = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  if (!spec) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        {kind === 'glow' ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: size * 0.14, top: size * 0.06, width: size * 0.72, height: size * 0.72, borderRadius: size, backgroundColor: '#FFE6A3', boxShadow: `0 0 ${Math.round(size * 0.25)}px ${Math.round(size * 0.12)}px #FFE6A3` } as any, glow]} /> : null}
        <Animated.View style={[{ width: size, height: size, transformOrigin: whole!.origin ?? '50% 90%' } as any, outer]}>
          <Image source={clayIcons[name]} style={{ width: size, height: size }} resizeMode="contain" />
        </Animated.View>
      </View>
    );
  }
  const o = `${(spec.o[0] / 10.24).toFixed(2)}% ${(spec.o[1] / 10.24).toFixed(2)}%`;
  const baseSrc = spec.state ? clayIcons[name] : clayIcons[`${name}__base` as ClayName];
  const baseO = kind === 'hit' || kind === 'hitslide' || kind === 'clapper' || kind === 'state' ? o : kind === 'twinkle' ? '50% 90%' : kind === 'rays' ? o : '50% 85%';
  const baseEl = <Animated.Image key="b" source={baseSrc} style={[box, { transformOrigin: baseO } as any, base]} resizeMode="contain" />;
  const partImg = <Animated.Image key="p" source={clayIcons[`${name}__${spec.part}` as ClayName]} style={[box, { transformOrigin: kind === 'orbit' ? '50% 50%' : o } as any, part]} resizeMode="contain" />;
  const partEl = kind === 'draw'
    ? <Animated.View key="p" style={[{ position: 'absolute', left: 0, top: 0, height: size, overflow: 'hidden' }, reveal]}>{partImg}</Animated.View>
    : partImg;
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: kind === 'state' ? o : '50% 90%' } as any, style, outer]}>
      {spec.under ? [partEl, baseEl] : [baseEl, partEl]}
    </Animated.View>
  );
}
