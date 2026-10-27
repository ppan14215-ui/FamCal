/**
 * A place a spoken change can land on. It registers under its id and, when
 * the change arrives there, drops in with a small bounce, glows and keeps a
 * teal mark on its left edge until the receipt is closed (Julian 27.10.:
 * adding is the core of the app, nobody may wonder what the machine did).
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, withSpring, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '../theme';
import { useLanding, useLit } from '../lib/landing';

export default function Fresh({ id, children, style, radius = 0 }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const ref = useLanding(id);
  const on = useLit(id);
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  const mark = useSharedValue(0);
  const y = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!on) { mark.value = withTiming(0, { duration: 260 }); glow.value = withTiming(0, { duration: 260 }); return; }
    // Arrives from above, lands with a bounce, glows, and stays marked.
    if (!still) {
      y.value = -14;
      y.value = withSpring(0, { damping: 11, stiffness: 260 });
      pop.value = withSequence(withTiming(1.035, { duration: 150 }), withSpring(1, { damping: 12, stiffness: 220 }));
    }
    glow.value = withSequence(withTiming(1, { duration: 160 }), withDelay(1600, withTiming(0.35, { duration: 900 })));
    mark.value = withTiming(1, { duration: 220 });
  }, [on]);
  const shade = useAnimatedStyle(() => ({ opacity: glow.value * 0.5 }));
  const bar = useAnimatedStyle(() => ({ opacity: mark.value, transform: [{ scaleY: 0.4 + 0.6 * mark.value }] }));
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: pop.value }] as const }));
  return (
    <Animated.View ref={ref as any} collapsable={false} style={[style, move]}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, backgroundColor: tokens.doneSoft }, shade]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 3, top: '22%', bottom: '22%', width: 4, borderRadius: 999, backgroundColor: tokens.done }, bar]} />
    </Animated.View>
  );
}
