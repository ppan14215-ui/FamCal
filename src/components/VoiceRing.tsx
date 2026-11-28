/**
 * Atmender Ring (Julian 28.10., Variante C): a soft teal halo and a thin ring
 * around the black mic button grow with the voice, so the stop square inside
 * stays clear. Sits behind the 48 px button; stays within the bar's edge.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { tokens } from '../theme';

export default function VoiceRing({ level, size = 48 }: { level: SharedValue<number>; size?: number }) {
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + level.value * 0.2 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: 0.2 + level.value * 0.75, transform: [{ scale: 1.06 + level.value * 0.16 }] }));
  const round = { position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2 } as const;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}>
      <Animated.View style={[round, { backgroundColor: tokens.doneSoft }, halo]} />
      <Animated.View style={[round, { borderWidth: 2, borderColor: tokens.done }, ring]} />
    </View>
  );
}
