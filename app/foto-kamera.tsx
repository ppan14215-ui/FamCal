/**
 * Foto · Aufnehmen. No real camera in the prototype: a letter lies in the
 * frame, the page is "recognised", the shutter goes on. Objekt bleibt Objekt:
 * the same sheet of paper appears again while reading.
 */
import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, withSequence } from 'react-native-reanimated';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { haptics } from '../src/lib/haptics';
import Letter from '../src/components/Letter';
import { easing } from '../src/theme';

export default function FotoKamera() {
  const insets = useSafeAreaInsets();
  const found = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => { found.value = withDelay(700, withTiming(1, { duration: 220, easing: easing.out })); }, []);
  const frame = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * found.value, transform: [{ scale: 1.03 - 0.03 * found.value }] }));
  const pill = useAnimatedStyle(() => ({ opacity: found.value }));
  const flashS = useAnimatedStyle(() => ({ opacity: flash.value }));

  const shoot = () => {
    haptics.commit();
    flash.value = withSequence(withTiming(0.8, { duration: 60 }), withTiming(0, { duration: 200 }));
    setTimeout(() => router.replace('/foto-lesen'), 260);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1E2427' }}>
      <View style={{ position: 'absolute', left: 34, right: 34, top: 150, bottom: 224, transform: [{ rotate: '-2deg' }] }}>
        <Letter />
      </View>
      <Animated.View style={[{ position: 'absolute', left: 24, right: 24, top: 130, bottom: 204, borderRadius: 22, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }, frame]} />
      <View style={{ position: 'absolute', top: insets.top + 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22 }}>
        <Pressable accessibilityLabel="Schließen" onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="x" size={20} color="#FFFFFF" />
        </Pressable>
        <Animated.View style={[{ height: 42, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', gap: 6 }, pill]}>
          <LineIcon name="flash" size={16} color="#FFFFFF" />
          <Txt size={14} weight={600} color="#FFFFFF">Seite erkannt</Txt>
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + 34, left: 0, right: 0, alignItems: 'center', gap: 14 }}>
        <Txt size={14} color="rgba(255,255,255,0.8)">Alles im Rahmen, gleich geht’s weiter</Txt>
        <Pressable accessibilityLabel="Aufnehmen" onPress={shoot} style={({ pressed }) => ({ width: 76, height: 76, borderRadius: 999, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <View style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
        </Pressable>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' }, flashS]} />
    </View>
  );
}
