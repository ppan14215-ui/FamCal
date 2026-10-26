/** 1 · Über euch: names and city. The city is what the assistant builds on. */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Field } from '../../src/components/Field';
import { Avatar } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import { actions } from '../../src/state/store';
import { CITIES } from '../../src/data/cities';
import { tokens } from '../../src/theme';
import { haptics } from '../../src/lib/haptics';

export default function Eltern() {
  const [j, setJ] = useState('');
  const [t, setT] = useState('');
  const [city, setCity] = useState('');
  const next = () => {
    actions.setNames({ J: j.trim(), T: t.trim() });
    actions.setCity(city.trim());
    router.push('/onboarding/stadt');
  };
  return (
    <Screen footer={<Btn label="Weiter" disabled={!j.trim() || !city.trim()} onPress={next} />}>
      <BackBar center={<StepDots i={1} />} />
      <H1>Über euch</H1>
      <Lead>Wie ihr heißt und wo ihr wohnt. Daraus sucht der Assistent zusammen, was in eurer Stadt gilt.</Lead>
      <View style={{ gap: 8 }}>
        <Field label="Dein Name" value={j} onChangeText={setJ} placeholder="Zum Beispiel Julia" right={<Avatar p="J" letter={j.trim()[0]?.toUpperCase() || 'J'} size={30} />} />
        <Field label="Name deines Partners" value={t} onChangeText={setT} placeholder="Zum Beispiel Tom" right={<Avatar p="T" letter={t.trim()[0]?.toUpperCase() || 'T'} size={30} />} />
        <Field label="Wo wohnt ihr?" value={city} onChangeText={setCity} placeholder="Stadt oder Gemeinde" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }} style={{ marginTop: -6, marginHorizontal: -18 }}>
        <View style={{ width: 12 }} />
        {CITIES.map((c) => (
          <PressScale
            key={c.name}
            scale={0.94}
            onPress={() => { haptics.select(); setCity(c.name); }}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: city === c.name ? tokens.row : '#EFEFEC', borderWidth: city === c.name ? 1.5 : 0, borderColor: tokens.ink }}
          >
            <Txt size={13.5} weight={600}>{c.name}</Txt>
          </PressScale>
        ))}
        <View style={{ width: 12 }} />
      </ScrollView>
      <Hint>{`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`}</Hint>
    </Screen>
  );
}
