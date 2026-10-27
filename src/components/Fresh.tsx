/**
 * A place a spoken change can land on. It registers under its id and, when
 * the drop arrives there, glows soft green for a moment and fades.
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, withSpring } from 'react-native-reanimated';
import { tokens } from '../theme';
import { useLanding, useLit } from '../lib/landing';

export default function Fresh({ id, children, style, radius = 0 }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const ref = useLanding(id);
  const on = useLit(id);
  const o = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!on) return;
    // New or changed rows glow and give a small nudge, so the eye finds them (Julian 27.10.).
    o.value = withSequence(withTiming(1, { duration: 160 }), withDelay(2200, withTiming(0, { duration: 1100 })));
    pop.value = withSequence(withTiming(1.03, { duration: 140 }), withSpring(1, { damping: 12, stiffness: 220 }));
  }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: o.value * 0.45 }));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View ref={ref as any} collapsable={false} style={[style, grow]}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, backgroundColor: tokens.doneSoft }, st]} />
    </Animated.View>
  );
}
