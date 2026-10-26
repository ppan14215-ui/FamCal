/**
 * Foto · Wird gelesen. Warten am Ort: no spinner; the steps appear where the
 * result is made and tick off one by one. Reading a letter is rare, so the
 * clay object may move.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { Screen } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import { tokens, tint, springs } from '../src/theme';
import { haptics } from '../src/lib/haptics';

const STEPS = ['Brief der Elterngeldstelle', 'Frist gefunden: 12. Dezember', 'Was zu tun ist', 'Wo es hingehört'];

export default function FotoLesen() {
  const [done, setDone] = useState(0);
  const bob = useSharedValue(0);
  const pop = useSharedValue(0.9);

  useEffect(() => {
    pop.value = withSpring(1, springs.reveal);
    bob.value = withRepeat(withSequence(withTiming(-6, { duration: 600 }), withTiming(0, { duration: 600 })), -1);
    const timers = STEPS.map((_, i) => setTimeout(() => { setDone(i + 1); haptics.select(); }, 700 + i * 650));
    const go = setTimeout(() => router.replace('/foto-verstanden'), 700 + STEPS.length * 650 + 450);
    return () => { timers.forEach(clearTimeout); clearTimeout(go); };
  }, []);

  const icon = useAnimatedStyle((): any => ({ transform: [{ translateY: bob.value }, { scale: pop.value }] }));

  return (
    <Screen bg="#F7F5F0" scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable hitSlop={10} onPress={() => router.back()}><Txt size={15} color={tokens.sub}>Abbrechen</Txt></Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <Pressable accessibilityLabel="Weiter" onPress={() => router.replace('/foto-verstanden')} style={{ width: 220, height: 220, borderRadius: 56, backgroundColor: tint('umschlag-euro'), alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={icon}><ClayIcon name="brief-gelesen" size={170} /></Animated.View>
        </Pressable>
        <View style={{ gap: 14, width: 260 }}>
          {STEPS.map((s, i) => {
            const state = i < done ? 'ok' : i === done ? 'run' : 'wait';
            return (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                  {state === 'ok' ? (
                    <Animated.View entering={FadeIn.duration(160)}><LineIcon name="check" size={18} color={tokens.done} stroke={2.4} /></Animated.View>
                  ) : state === 'run' ? <Pulse /> : null}
                </View>
                <Txt size={16} weight={500} color={state === 'ok' ? tokens.ink : state === 'run' ? tokens.sub : '#B8BEC0'}>{s}</Txt>
              </View>
            );
          })}
        </View>
      </View>
      <Txt size={13.5} color={tokens.mute} center>Das Foto bleibt nur bei euch.</Txt>
    </Screen>
  );
}

function Pulse() {
  const o = useSharedValue(0.35);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.35, { duration: 700 })), -1); }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 999, backgroundColor: tokens.sub }, st]} />;
}
