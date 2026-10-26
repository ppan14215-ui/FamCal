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
  const [j, setJ] = useState('');
  const [t, setT] = useState('');
  const go = (path: '/onboarding/kinder' | '/onboarding/kalender') => { actions.setNames({ J: j.trim(), T: t.trim() }); router.push(path); };
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
        <Field label="Dein Name" value={j} onChangeText={setJ} placeholder="Zum Beispiel Julia" right={<Avatar p="J" size={30} />} />
        <Field label="Name deines Partners" value={t} onChangeText={setT} placeholder="Zum Beispiel Tom" right={<Avatar p="T" size={30} />} />
      </View>
      <Hint>{`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`}</Hint>
    </Screen>
  );
}
