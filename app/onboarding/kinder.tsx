/** 3 · Eure Kinder */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Btn, Seg, Meta, Chevron } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Field } from '../../src/components/Field';
import { tokens } from '../../src/theme';
import { weeksOld, BEN_BORN, dayMonth, year } from '../../src/lib/dates';

const LAENDER = ['Bayern', 'Baden-Württemberg', 'Berlin', 'Hamburg', 'Hessen', 'Nordrhein-Westfalen', 'Sachsen'];

export default function Kinder() {
  const [mode, setMode] = useState<'da' | 'unterwegs'>('da');
  const [name, setName] = useState('Ben');
  const [land, setLand] = useState(0);
  const [kids, setKids] = useState(1);
  const [name2, setName2] = useState('');
  return (
    <Screen footer={<Btn label="Weiter" onPress={() => router.push('/onboarding/kalender')} />}>
      <BackBar center={<StepDots i={2} />} />
      <H1>Eure Kinder</H1>
      <Seg height={38} items={[{ key: 'da', label: 'Schon da' }, { key: 'unterwegs', label: 'Noch unterwegs' }]} value={mode} onChange={(k) => setMode(k as 'da' | 'unterwegs')} />
      <Field label="Name" value={name} onChangeText={setName} />
      <Box label={mode === 'da' ? 'Geboren am' : 'Errechneter Termin'} value={mode === 'da' ? `${dayMonth(BEN_BORN)} ${year(BEN_BORN)}` : '12. März 2027'} right={<Meta>{mode === 'da' ? `${weeksOld()} Wochen` : 'SSW 21'}</Meta>} />
      <Box label="Bundesland" value={LAENDER[land]} right={<Chevron />} onPress={() => setLand((land + 1) % LAENDER.length)} />
      {kids > 1 ? <Field label="Name des zweiten Kindes" value={name2} onChangeText={setName2} /> : null}
      <Pressable
        onPress={() => setKids(2)}
        style={{ height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: tokens.dotOff, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <LineIcon name="plus" size={18} />
        <Txt size={15} weight={600}>Weiteres Kind hinzufügen</Txt>
      </Pressable>
    </Screen>
  );
}

function Box({ label, value, right, onPress }: { label: string; value: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={13} color={tokens.sub}>{label}</Txt>
        <Txt size={18} weight={600}>{value}</Txt>
      </View>
      {right}
    </Pressable>
  );
}
