/** 2 · Über euch */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { Field } from '../../src/components/Field';
import { Avatar } from '../../src/components/ui/Person';
import { actions } from '../../src/state/store';

export default function Eltern() {
  const [j, setJ] = useState('Julia');
  const [t, setT] = useState('Tom');
  const go = (path: '/onboarding/kinder' | '/onboarding/kalender') => { actions.setNames({ J: j, T: t }); router.push(path); };
  return (
    <Screen
      footer={
        <>
          <Txt size={20} line={26} weight={700} tracking={-0.4} center style={{ marginBottom: 8 }}>Habt ihr Kinder, oder ist eins unterwegs<Dot char="?" /></Txt>
          <Btn label="Ja" onPress={() => go('/onboarding/kinder')} />
          <Btn label="Noch nicht" primary={false} onPress={() => go('/onboarding/kalender')} />
        </>
      }
    >
      <BackBar center={<StepDots i={1} />} />
      <H1>Über euch</H1>
      <Lead>Alles geht von euch beiden aus. Jeder bekommt eine Farbe, daran erkennt ihr später, wer was übernimmt.</Lead>
      <View style={{ gap: 8 }}>
        <Field label="Dein Name" value={j} onChangeText={setJ} right={<Avatar p="J" size={30} />} />
        <Field label="Name deines Partners" value={t} onChangeText={setT} right={<Avatar p="T" size={30} />} />
      </View>
      <Hint>{`${t || 'Deinen Partner'} lädst du gleich ein. Den Namen kann er selbst ändern.`}</Hint>
    </Screen>
  );
}
