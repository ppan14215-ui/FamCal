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
import { useLanding, useLit } from '../lib/landing';

export default function Fresh({ id, children, style, radius = 0 }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const ref = useLanding(id);
  const on = useLit(id);
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  const mark = useSharedValue(0);
  useEffect(() => {
    if (!on) { mark.value = withTiming(0, { duration: 260 }); glow.value = withTiming(0, { duration: 260 }); return; }
    // No floating or bouncing (Julian 28.10.): the row stays put, the mark draws in and the glow settles.
    glow.value = withSequence(withTiming(1, { duration: 120 }), withDelay(900, withTiming(0.35, { duration: 700 })));
    mark.value = withTiming(1, { duration: still ? 0 : 180, easing: Easing.out(Easing.cubic) });
  }, [on]);
  const shade = useAnimatedStyle(() => ({ opacity: glow.value * 0.5 }));
  const bar = useAnimatedStyle(() => ({ opacity: mark.value, transform: [{ scaleY: mark.value }] }));
  return (
    <Animated.View ref={ref as any} collapsable={false} style={style}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, backgroundColor: tokens.doneSoft }, shade]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 3, top: '22%', bottom: '22%', width: 4, borderRadius: 999, backgroundColor: tokens.done }, bar]} />
    </Animated.View>
  );
}
