/** Dokumente · Infozettel: the letter as four facts, the original stays attached. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, Btn, Group, LineRow, Meta, Toggle, Hint } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { ClayIcon } from '../src/components/ui/Clay';
import Letter from '../src/components/Letter';
import { tokens } from '../src/theme';

const FACTS = [
  { k: 'Offen', v: 'Arbeitgeberbescheinigung' },
  { k: 'Frist', v: '12. Dezember 2026', c: tokens.frist },
  { k: 'Stelle', v: 'ZBFS Bayern' },
  { k: 'Aktenzeichen', v: 'EG-2026-118734' },
];

export default function Infozettel() {
  const [drive, setDrive] = useState(true);
  return (
    <Screen footer={<Btn label="Fertig" onPress={() => router.dismissTo('/kalender')} />}>
      <BackBar center={<Meta>Dokumente</Meta>} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingTop: 8, paddingHorizontal: 2 }}>
        <ClayIcon name="umschlag-euro" size={56} />
        <View style={{ gap: 1, flex: 1 }}>
          <Txt size={13.5} color={tokens.sub}>Infozettel</Txt>
          <Txt size={28} line={32} weight={700} tracking={-0.8}>Elterngeld Tom</Txt>
        </View>
      </View>
      <Group>
        {FACTS.map((f) => (
          <LineRow key={f.k} lead={<Txt size={14} color={tokens.sub} style={{ width: 104 }}>{f.k}</Txt>} value={f.v} color={f.c ?? tokens.ink} />
        ))}
      </Group>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <View style={{ width: 40, height: 52, transform: [{ rotate: '-4deg' }] }}><Letter scale={0.16} /></View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={15} weight={600}>Original</Txt>
          <Meta>{drive ? 'Google Drive · Familie / Elterngeld' : 'nur auf diesem Gerät'}</Meta>
        </View>
        <Toggle value={drive} onChange={setDrive} />
      </View>
      <Hint icon="lock">Steuer-ID, Kontonummer und Ausweisnummer bleiben verschlüsselt auf dem Gerät, nie in Drive.</Hint>
    </Screen>
  );
}
