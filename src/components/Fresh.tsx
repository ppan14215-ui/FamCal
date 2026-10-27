/**
 * A place a spoken change can land on. It registers under its id and, when
 * the drop arrives there, glows soft green for a moment and fades.
 */
import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence } from 'react-native-reanimated';
import { tokens } from '../theme';
import { useLanding, useLit } from '../lib/landing';

export default function Fresh({ id, children, style, radius = 0 }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const ref = useLanding(id);
  const on = useLit(id);
  const o = useSharedValue(0);
  useEffect(() => {
    if (on) o.value = withSequence(withTiming(1, { duration: 160 }), withDelay(1400, withTiming(0, { duration: 900 })));
  }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: o.value * 0.6 }));
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, backgroundColor: tokens.doneSoft }, st]} />
    </View>
  );
}
