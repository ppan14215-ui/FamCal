/** 1 · Willkommen */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import Animated from 'react-native-reanimated';
import Intro from '../../src/components/Intro';
import { tokens, rise } from '../../src/theme';
import { actions } from '../../src/state/store';

export default function Willkommen() {
  return (
    <Screen
      gap={28}
      footer={
        <>
          <Btn label="Los geht’s" onPress={() => { actions.reset(); router.push('/onboarding/eltern'); }} />
          <TextLink label="Ich wurde eingeladen" weight={400} onPress={() => { actions.loadDemo(); router.replace('/heute'); }} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 24, paddingTop: 8 }}>
        <Intro />
        <Animated.View entering={rise(3)} style={{ gap: 10 }}>
          <Txt size={38} line={44} weight={700} tracking={-1.2}>Euer Familienkalender, der mitdenkt<Dot /></Txt>
          <Txt size={17} line={25} color={tokens.sub}>Termine, Fristen und Post an einem ruhigen Ort. Für euch beide.</Txt>
        </Animated.View>
      </View>
    </Screen>
  );
}
