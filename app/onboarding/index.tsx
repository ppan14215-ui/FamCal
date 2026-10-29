/** 1 · Willkommen */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Intro from '../../src/components/Intro';
import { actions } from '../../src/state/store';
import { tx } from '../../src/i18n/lang';

export default function Willkommen() {
  return (
    <Screen
      gap={28}
      footer={
        <>
          <Btn label={tx('Los geht’s', 'Let’s go')} onPress={() => { actions.reset(); router.push('/onboarding/eltern'); }} />
          <TextLink label={tx('Ich wurde eingeladen', 'I was invited')} weight={400} onPress={() => { actions.loadDemo(); router.replace('/chat'); }} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: 8 }}>
        <Intro />
      </View>
    </Screen>
  );
}
