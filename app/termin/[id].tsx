/** Termin: clay stage on top, who goes, what to bring, where it came from. */
import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { BackBar, Card, Chip, Meta, Check, Hint } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { ClayIcon } from '../../src/components/ui/Clay';
import { Owner } from '../../src/components/ui/Person';
import AddInline from '../../src/components/AddInline';
import { tokens, tint } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { WD_SHORT, weekday, dayNum, MONTHS, monthIdx, hm } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import type { Who } from '../../src/state/types';

const NEXT: Record<string, Who> = { T: 'J', J: 'both', both: null, null: 'T' };

function whoLine(who: Who, title: string): { t: string; s: string } {
  const withBen = /U\d|Impf|Pass|Arzt|Dr\./.test(title);
  if (who === 'T') return { t: withBen ? 'Tom bringt Ben' : 'Tom geht hin', s: 'hat er selbst übernommen' };
  if (who === 'J') return { t: withBen ? 'Julia bringt Ben' : 'Julia geht hin', s: 'hat sie selbst übernommen' };
  if (who === 'both') return { t: 'Ihr geht beide', s: 'zusammen' };
  return { t: 'Noch niemand', s: 'Wer geht hin?' };
}

export default function Termin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const insets = useSafeAreaInsets();
  if (!e) return null;
  const w = whoLine(e.who, e.title);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 34 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: tint(e.icon), paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 18 }}><BackBar /></View>
        <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon name={e.icon} size={160} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Meta>{`${WD_SHORT[weekday(e.date)]} ${dayNum(e.date)}. ${MONTHS[monthIdx(e.date)]} · ${hm(e.start)}${e.end ? '–' + hm(e.end) : ''}${e.repeat ? ' · ' + e.repeat : ''}`}</Meta>
          <Txt size={30} line={36} weight={700} tracking={-0.8}>{e.title}<Dot /></Txt>
          {e.place || e.sub ? <Meta>{e.place ?? e.sub}</Meta> : null}
        </View>
        <Card pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Owner who={e.who} size={32} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight={600}>{w.t}</Txt>
              <Meta>{w.s}</Meta>
            </View>
            <Chip onPress={() => { haptics.select(); actions.setEventWho(e.id, NEXT[String(e.who)]); }}>Ändern</Chip>
          </View>
        </Card>
        <Card pad={14} gap={10}>
          <Txt size={13} weight={600} color={tokens.sub}>Mitnehmen</Txt>
          {(e.bring ?? []).map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Check done={b.done} onPress={() => actions.toggleBring(e.id, b.id)} />
              <Txt size={15} strike={b.done} color={b.done ? tokens.mute : tokens.ink}>{b.t}</Txt>
            </View>
          ))}
          <View style={{ marginHorizontal: -14, marginBottom: -14 }}>
            <AddInline placeholder="Hinzufügen" onAdd={(t) => actions.addBring(e.id, t)} />
          </View>
        </Card>
        {e.source ? <Hint icon="sparkle">{e.source}</Hint> : null}
      </View>
    </ScrollView>
  );
}
