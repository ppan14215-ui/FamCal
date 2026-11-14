/**
 * A clay icon as a sticker that pops out (Julian 05.11.2026: "this level of animation quality",
 * reference Airbnb's travel map onboarding; "use our icons and the best animated ones popping out").
 *
 * Read frame by frame from the reference (12 fps):
 * - The sticker comes out of the hero object, not from nowhere: it starts a third of the way
 *   towards the centre and travels out while it grows.
 * - Scale 0 to about 1.15 and back to 1 on one underdamped spring (one visible overshoot, no wobble
 *   after), with a small turn into its resting tilt.
 * - White rim, soft low shadow, slightly different sizes, overlapping the hero's edge.
 * - Staggered 0.15 to 0.25 s, never all at once. Text follows the stickers, the button comes last.
 * After it has landed the icon plays its own story once (ClayIcon celebrate), then stays still.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring, withTiming, useReducedMotion, Easing } from 'react-native-reanimated';
import { ClayIcon } from '../ui/Clay';
import type { ClayName } from '../../lib/clayIcons';
import { tint, tokens } from '../../theme';
import { haptics } from '../../lib/haptics';

/** One overshoot of about 15 %, settled in roughly half a second. */
const POP = { stiffness: 340, damping: 14, mass: 0.9 };

export function Sticker({ name, size, x, y, from = { x: 0, y: 0 }, delay = 0, rot = 0, tap = false }: {
  name: ClayName;
  size: number;
  /** Centre of the sticker. */
  x: number;
  y: number;
  /** Where it comes out of (centre of the hero). */
  from?: { x: number; y: number };
  delay?: number;
  rot?: number;
  /** A light tick when it lands. */
  tap?: boolean;
}) {
  const reduced = useReducedMotion();
  const s = useSharedValue(reduced ? 1 : 0);
  const o = useSharedValue(reduced ? 1 : 0);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!reduced) {
      o.value = withDelay(delay, withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }));
      s.value = withDelay(delay, withSpring(1, POP));
    }
    const a = setTimeout(() => { if (tap) haptics.tap(); }, reduced ? 0 : delay + 140);
    const b = setTimeout(() => setPlay(true), reduced ? 200 : delay + 420);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const dx = (from.x - x) * 0.35;
  const dy = (from.y - y) * 0.35;
  const st = useAnimatedStyle((): any => {
    const v = s.value;
    const p = Math.min(1, v);
    return {
      opacity: o.value,
      transform: [{ translateX: dx * (1 - p) }, { translateY: dy * (1 - p) }, { scale: v }, { rotate: `${rot + (1 - v) * -24}deg` }],
    };
  });
  const r = size / 2;
  const rim = Math.max(2.5, Math.round(size * 0.06));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left: x - r, top: y - r, width: size, height: size, borderRadius: r,
        backgroundColor: tokens.row, padding: rim,
        boxShadow: `0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.28)}px rgba(28,42,40,0.16), 0 1px 2px rgba(28,42,40,0.08)`,
      } as any, st]}
    >
      <View style={{ flex: 1, borderRadius: r, backgroundColor: tint(name), alignItems: 'center', justifyContent: 'center' }}>
        <ClayIcon name={name} size={Math.round(size * 0.72)} celebrate={play} />
      </View>
    </Animated.View>
  );
}

/** A ring of stickers around a hero centre, popping one after another. */
export function StickerRing({ cx, cy, items, start = 0, gap = 190 }: {
  cx: number;
  cy: number;
  items: { name: ClayName; dx: number; dy: number; size: number; rot?: number }[];
  start?: number;
  gap?: number;
}) {
  return (
    <>
      {items.map((it, i) => (
        <Sticker key={it.name} name={it.name} size={it.size} x={cx + it.dx} y={cy + it.dy} from={{ x: cx, y: cy }} delay={start + i * gap} rot={it.rot ?? 0} tap />
      ))}
    </>
  );
}
