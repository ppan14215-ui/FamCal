/**
 * Top right of every tab: the "+" for a new entry at any moment (Julian 30.10.,
 * after the mymind screens) and the family pair that opens the settings. The
 * plus turns a quarter with a spring before the sheet comes up.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import PressScale from './PressScale';
import LineIcon from './LineIcon';
import { Pair } from './Person';
import { tokens, springs } from '../../theme';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';

export function PlusButton({ size = 34 }: { size?: number }) {
  const turn = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 90}deg` }] }));
  const open = () => {
    haptics.tap();
    turn.value = withSequence(withSpring(1, springs.snapBack), withTiming(0, { duration: 0 }));
    setTimeout(() => router.push('/neu'), 120);
  };
  return (
    <PressScale onPress={open} scale={0.9} accessibilityLabel={tx('Neuer Eintrag', 'New entry')} style={{ width: size, height: size, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={st}><LineIcon name="plus" size={Math.round(size * 0.47)} color={tokens.onInk} stroke={2.2} /></Animated.View>
    </PressScale>
  );
}

export default function HeaderRight({ before }: { before?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {before}
      <PlusButton />
      <PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>
    </View>
  );
}
