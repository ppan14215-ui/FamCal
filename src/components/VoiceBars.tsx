/**
 * Balken im Knopf (Julian 28.10., Variante B statt der Kugel): four white bars
 * inside the black mic circle that follow the voice. `level` (0 to 1) comes
 * from the phone's volume events; each bar also sways a little on its own so
 * the bars never move in lockstep. Silence leaves short resting bars.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation, type SharedValue } from 'react-native-reanimated';

const SHAPE = [0.55, 1, 0.8, 0.5];
const SWAY_MS = [420, 360, 480, 390];
const REST = 4;
const TALL = 22;

function Bar({ level, i, color }: { level: SharedValue<number>; i: number; color: string }) {
  const sway = useSharedValue(0);
  useEffect(() => {
    sway.value = withRepeat(withTiming(1, { duration: SWAY_MS[i], easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(sway);
  }, []);
  const st = useAnimatedStyle(() => ({
    height: REST + level.value * (TALL - REST) * SHAPE[i] * (0.65 + 0.35 * sway.value),
  }));
  return <Animated.View style={[{ width: 3.5, borderRadius: 2, backgroundColor: color }, st]} />;
}

export default function VoiceBars({ level, color = '#FFFFFF' }: { level: SharedValue<number>; color?: string }) {
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 3.5, height: TALL }}>
      {SHAPE.map((_, i) => <Bar key={i} level={level} i={i} color={color} />)}
    </View>
  );
}
