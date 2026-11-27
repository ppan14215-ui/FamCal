/**
 * Blinks its content once when `k` changes, never on the first render
 * (Allo motion map, Julian 25.11.: when a Termin moves, only the part that
 * changed blinks once). Opacity only.
 */
import React, { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, useReducedMotion } from 'react-native-reanimated';
import { easing } from '../theme/motion';

export default function Blink({ k, children, style }: { k: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const last = useRef(k);
  const still = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (last.current === k) return;
    last.current = k;
    if (still) return;
    o.value = withSequence(withTiming(0.2, { duration: 120, easing: easing.out }), withTiming(1, { duration: 240, easing: easing.out }));
  }, [k]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
