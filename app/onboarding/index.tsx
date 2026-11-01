/**
 * Hallo (storyboard 01.11.2026, step 1): the first thing anyone sees. Memo
 * falls in, lands, blinks; then one sentence says what FamCal is for.
 * The real app signs in next; the test link goes straight to the family step.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import Memo from '../../src/components/onboarding/Memo';
import { actions } from '../../src/state/store';
import { LIVE } from '../../src/lib/live';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const after = (ms: number) => FadeInDown.duration(420).delay(ms);

export default function Hallo() {
  const start = () => {
    if (LIVE) return router.push('/anmelden');
    actions.reset();
    router.push('/onboarding/eltern');
  };
  const invited = () => {
    if (LIVE) return router.push('/anmelden');
    actions.loadDemo();
    router.replace('/chat');
  };
  return (
    <Screen
      scroll={false}
      footer={
        <Animated.View entering={after(1100)} style={{ gap: 8 }}>
          <Btn label={tx('Los geht’s', 'Let’s go')} onPress={start} />
          <TextLink label={tx('Ich habe eine Einladung', 'I was invited')} weight={400} onPress={invited} />
        </Animated.View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28, paddingBottom: 24 }}>
        <Memo act="land" size={148} delay={250} />
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 8 }}>
          <Animated.View entering={after(800)}>
            <Txt size={36} line={42} weight={700} tracking={-1.2} center>{tx('Hallo, ich bin Memo', 'Hi, I’m Memo')}<Dot /></Txt>
          </Animated.View>
          <Animated.View entering={after(920)}>
            <Txt size={18} line={26} color={tokens.sub} center>{tx('Ich merke mir alles für eure Familie. Ihr sagt es nur einmal, und ihr wisst es beide.', 'I keep track of everything for your family. Say it once, and you both know.')}</Txt>
          </Animated.View>
        </View>
      </View>
    </Screen>
  );
}
