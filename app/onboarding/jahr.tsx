/** 6 · Euer erstes Jahr: planned from the date in "Eure Kinder". */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Btn, Meta, Toggle, Chevron } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import Timeline from '../../src/components/Timeline';
import { tokens, rise } from '../../src/theme';
import Animated from 'react-native-reanimated';
import { haptics } from '../../src/lib/haptics';
import { useStore, actions } from '../../src/state/store';
import PressScale from '../../src/components/ui/PressScale';
import { tx } from '../../src/i18n/lang';

export default function Jahr() {
  const all = useStore((s) => s.milestones);
  const kid = useStore((s) => s.kid);
  const [push, setPush] = useState(true);
  const [more, setMore] = useState(false);
  const sorted = useMemo(() => [...all].sort((a, b) => a.date.localeCompare(b.date)), [all]);
  // "Alle anzeigen" opens the list right here (Julian 26.10.), no other screen.
  const items = more ? sorted : sorted.slice(0, 4);
  const total = sorted.length;
  const title = kid?.name ? tx(`${kid.name}${/[sxzß]$/i.test(kid.name) ? '’' : 's'} erstes Jahr`, `${kid.name}’s first year`) : tx('Euer erstes Jahr', 'Your first year');
  return (
    <Screen footer={<Btn label={tx('Aufgaben verteilen', 'Share the tasks')} onPress={() => router.push('/onboarding/karten')} />}>
      <BackBar center={<StepDots i={6} />} />
      <H1>{title}</H1>
      <Txt size={16} line={24} color={tokens.sub} style={{ marginTop: -8 }}>
        Ihr müsst nichts eintragen. Aus {kid?.due ? tx('dem errechneten Termin', 'the due date') : tx('dem Geburtsdatum', 'the birth date')} haben wir <Txt size={16} line={24} weight={700}>{total} Termine und Fristen</Txt> schon in euren Kalender gelegt.
      </Txt>
      <View style={{ gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: tokens.row }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LineIcon name="sparkle" size={14} color={tokens.done} />
          <Txt size={13.5} weight={600} color={tokens.done}>{tx('Automatisch eingetragen', 'Added automatically')}</Txt>
        </View>
        <Timeline items={items} onToggle={actions.toggleMilestone} />
        {total > 4 ? (
          <PressScale
            onPress={() => { haptics.select(); setMore(!more); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: tokens.hair, paddingTop: 12, paddingBottom: 2 }}
          >
            <Txt size={15} weight={600}>{more ? tx('Weniger zeigen', 'Show less') : tx(`Alle ${total} anzeigen`, `Show all ${total}`)}</Txt>
            <View style={{ transform: [{ rotate: more ? '-90deg' : '90deg' }] }}><Chevron /></View>
          </PressScale>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: tokens.row }}>
        <ClayIcon name="glocke" size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={15} weight={600}>{tx('Wir erinnern euch rechtzeitig', 'We remind you in time')}</Txt>
          <Meta>{tx('Push an euch beide, bei Fristen 2 Wochen vorher', 'A push to both of you, 2 weeks before deadlines')}</Meta>
        </View>
        <Toggle value={push} onChange={setPush} />
      </View>
    </Screen>
  );
}
