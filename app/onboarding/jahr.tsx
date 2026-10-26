/** 6 · Bens erstes Jahr: alles schon eingetragen */
import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Btn, Meta, Toggle, Chevron } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import Timeline from '../../src/components/Timeline';
import { tokens } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';

export default function Jahr() {
  const all = useStore((s) => s.milestones);
  const [push, setPush] = useState(true);
  const items = useMemo(() => [...all].sort((a, b) => a.date.localeCompare(b.date)).filter((m) => m.id !== 'm-kg').slice(0, 4), [all]);
  const total = 23;
  return (
    <Screen footer={<Btn label="Aufgaben verteilen" onPress={() => router.push('/onboarding/karten')} />}>
      <BackBar center={<StepDots i={5} />} />
      <H1>Bens erstes Jahr</H1>
      <Txt size={16} line={24} color={tokens.sub} style={{ marginTop: -8 }}>
        Ihr müsst nichts eintragen. Aus Geburtsdatum und Bundesland haben wir <Txt size={16} line={24} weight={700}>{total} Termine und Fristen</Txt> schon in euren Kalender gelegt.
      </Txt>
      <View style={{ gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: tokens.row }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LineIcon name="sparkle" size={14} color={tokens.done} />
          <Txt size={13.5} weight={600} color={tokens.done}>Automatisch eingetragen</Txt>
        </View>
        <Timeline items={items} onToggle={actions.toggleMilestone} />
        <Pressable
          onPress={() => { actions.setCalView('jahr'); router.push('/kalender'); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: 1, borderTopColor: tokens.hair, paddingTop: 12, paddingBottom: 2 }}
        >
          <Txt size={15} weight={600}>{`Alle ${total} anzeigen`}</Txt>
          <Chevron />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: tokens.row }}>
        <ClayIcon name="glocke" size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={15} weight={600}>Wir erinnern euch rechtzeitig</Txt>
          <Meta>Push an euch beide, bei Fristen 2 Wochen vorher</Meta>
        </View>
        <Toggle value={push} onChange={setPush} />
      </View>
    </Screen>
  );
}
