/**
 * Hallo (storyboard 01.11.2026, step 1): the first thing anyone sees. It opens with Memo's story in
 * one continuous film (src/components/onboarding/Intro.tsx): fridge notes become cards in a phone,
 * both partners speak to Memo, then the claim "Ein digitaler Assistent, mit dem ihr beide sprechen
 * könnt" (Julian 01.11.2026).
 * Tap anywhere or "Weiter" moves on. The real app signs in next; the test link goes to the family step.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import Intro, { INTRO_BEATS, introCopy } from '../../src/components/onboarding/Intro';
import { actions, toast } from '../../src/state/store';
import { LIVE } from '../../src/lib/live';
import { isPreview } from '../../src/lib/vorschau';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const after = (ms: number) => FadeInDown.duration(420).delay(ms);

export default function Hallo() {
  const [beat, setBeat] = useState(0);
  const last = beat === INTRO_BEATS - 1;
  const next = () => setBeat((b) => Math.min(INTRO_BEATS - 1, b + 1));
  const start = () => {
    if (isPreview()) return router.push('/onboarding/eltern');
    if (LIVE) return router.push('/anmelden');
    actions.reset();
    router.push('/onboarding/eltern');
  };
  const invited = () => {
    if (isPreview()) return toast(tx('Vorschau: hier ginge es zur Anmeldung', 'Preview: this would go to sign in'));
    if (LIVE) return router.push('/anmelden');
    actions.loadDemo();
    router.replace('/chat');
  };
  const copy = introCopy(beat);
  return (
    <Screen
      scroll={false}
      footer={last ? (
        <Animated.View entering={after(700)} style={{ gap: 8 }}>
          <Txt size={13} color={tokens.mute} center>{tx('Dauert etwa 2 Minuten', 'Takes about 2 minutes')}</Txt>
          <Btn label={tx('Los geht’s', 'Let’s go')} onPress={start} />
          <TextLink label={tx('Ich habe eine Einladung', 'I was invited')} weight={400} onPress={invited} />
        </Animated.View>
      ) : (
        <Animated.View entering={after(600)} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }}>
            {Array.from({ length: INTRO_BEATS }).map((_, k) => <View key={k} style={{ width: k === beat ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === beat ? tokens.ink : tokens.dotOff }} />)}
          </View>
          <Btn label={tx('Weiter', 'Next')} onPress={next} />
          <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => setBeat(INTRO_BEATS - 1)} />
        </Animated.View>
      )}
    >
      <Pressable onPress={last ? undefined : next} style={{ flex: 1, justifyContent: 'center', gap: 22, paddingBottom: 8 }} accessible={false}>
        <Intro beat={beat} onBeat={setBeat} />
        <Animated.View key={beat} entering={FadeInUp.duration(420).delay(beat === 0 ? 700 : 200)} style={{ alignItems: 'center', gap: 10, paddingHorizontal: 8, minHeight: 120 }}>
          <Txt size={last ? 30 : 28} line={last ? 36 : 34} weight={700} tracking={-1} center>{copy.title}<Dot /></Txt>
          <Txt size={17} line={24} color={tokens.sub} center>{copy.lead}</Txt>
        </Animated.View>
      </Pressable>
    </Screen>
  );
}
