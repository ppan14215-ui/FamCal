/**
 * A place a spoken change can land on. It registers under its id and, when
 * the change arrives there, glows and keeps a
 * teal mark on its left edge until the receipt is closed (Julian 27.10.:
 * adding is the core of the app, nobody may wonder what the machine did).
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, useReducedMotion, Easing } from 'react-native-reanimated';
import { tokens } from '../theme';
import { useLanding, useLit, onPunch } from '../lib/landing';
import { easing } from '../theme/motion';

/** `bleed`: for rows without their own padding the glow reaches past the row and the mark sits left of the text, never on it. */
export default function Fresh({ id, children, style, radius = 0, bleed = 0, markAt }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number; bleed?: number; /** A card with a bar of its own: the mark draws over that bar instead of standing beside it. */ markAt?: { left: number; inset: number } }) {
  const ref = useLanding(id);
  const on = useLit(id);
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  const mark = useSharedValue(0);
  const size = useSharedValue(1);
  // Contact punch: one frame at 1.05, then back with a long tail. Only the card scales, the row keeps its place.
  const hit = () => { if (still) return; size.value = withSequence(withTiming(1.05, { duration: 16 }), withTiming(1, { duration: 400, easing: easing.out })); };
  useEffect(() => (id ? onPunch((p) => { if (p === id) hit(); }) : undefined), [id, still]);
  useEffect(() => {
    if (!on) { mark.value = withTiming(0, { duration: 260 }); glow.value = withTiming(0, { duration: 260 }); return; }
    // No floating (Julian 28.10.): the row stays put, lands with the approved contact punch (Allo, 24.11.), the mark draws in and the glow settles.
    hit();
    glow.value = withSequence(withTiming(1, { duration: 120 }), withDelay(900, withTiming(0.35, { duration: 700 })));
    mark.value = withTiming(1, { duration: still ? 0 : 180, easing: Easing.out(Easing.cubic) });
  }, [on]);
  const shade = useAnimatedStyle(() => ({ opacity: glow.value * 0.5 }));
  const land = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));
  const bar = useAnimatedStyle(() => ({ opacity: mark.value, transform: [{ scaleY: mark.value }] }));
  return (
    <Animated.View ref={ref as any} collapsable={false} style={[style, land]}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -bleed, right: -bleed, top: 0, bottom: 0, borderRadius: radius, backgroundColor: tokens.doneSoft }, shade]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: markAt ? markAt.left : 3 - bleed, top: markAt ? markAt.inset : '22%', bottom: markAt ? markAt.inset : '22%', width: 4, borderRadius: 999, backgroundColor: tokens.done }, bar]} />
    </Animated.View>
  );
}
