/** 1 · Willkommen */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Intro from '../../src/components/Intro';
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
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: 8 }}>
        <Intro />
      </View>
    </Screen>
  );
}
