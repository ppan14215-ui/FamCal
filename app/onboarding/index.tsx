/** 1 · Willkommen */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { ClayIcon } from '../../src/components/ui/Clay';
import { tint, tokens } from '../../src/theme';
import type { ClayName } from '../../src/lib/clayIcons';

const HERO: ClayName[] = ['kalender', 'stethoskop', 'umschlag-euro', 'kochtopf'];

export default function Willkommen() {
  return (
    <Screen
      gap={28}
      footer={
        <>
          <Btn label="Los geht’s" onPress={() => router.push('/onboarding/eltern')} />
          <TextLink label="Ich wurde eingeladen" weight={400} onPress={() => router.replace('/heute')} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 28, paddingTop: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {HERO.map((n) => (
            <View key={n} style={{ width: '48%', flexGrow: 1, height: 132, borderRadius: 28, backgroundColor: tint(n), alignItems: 'center', justifyContent: 'center' }}>
              <ClayIcon name={n} size={96} />
            </View>
          ))}
        </View>
        <View style={{ gap: 10 }}>
          <Txt size={38} line={44} weight={700} tracking={-1.2}>Euer Familienkalender, der mitdenkt<Dot /></Txt>
          <Txt size={17} line={25} color={tokens.sub}>Termine, Fristen und Post an einem ruhigen Ort. Für euch beide.</Txt>
        </View>
      </View>
    </Screen>
  );
}
