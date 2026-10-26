/** 4 · Eure Kalender */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, CardRow, Toggle, Hint, TextLink } from '../../src/components/ui/kit';

export default function Kalender() {
  const [on, setOn] = useState({ icloud: true, google: true, outlook: false });
  const next = () => router.push('/onboarding/partner');
  return (
    <Screen footer={<><Btn label="Weiter" onPress={next} /><TextLink label="Später" weight={400} onPress={next} /></>}>
      <BackBar center={<StepDots i={3} />} />
      <H1>Eure Kalender</H1>
      <Lead>Damit nichts doppelt ist. Ihr seht eure Termine hier, der Rest bleibt privat.</Lead>
      <View style={{ gap: 8 }}>
        <CardRow icon="kalender" title="iCloud-Kalender" sub="Julia · Familie, Arbeit" right={<Toggle value={on.icloud} onChange={(v) => setOn({ ...on, icloud: v })} />} />
        <CardRow icon="sync" title="Google Kalender" sub="Tom · tom.huber@gmail.com" right={<Toggle value={on.google} onChange={(v) => setOn({ ...on, google: v })} />} />
        <CardRow icon="telefon" title="Outlook" sub={on.outlook ? 'verbunden' : 'nicht verbunden'} right={<Toggle value={on.outlook} onChange={(v) => setOn({ ...on, outlook: v })} />} />
      </View>
      <Hint icon="lock">Arbeitstermine erscheinen nur als gestreifter Block „Arbeit“.</Hint>
    </Screen>
  );
}
