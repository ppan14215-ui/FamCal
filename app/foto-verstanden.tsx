/** Foto · Verstanden: the result as one sentence, and what will be taken over. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, Btn, TextLink, Group, LineRow, Meta, Check } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { Tile, ClayIcon } from '../src/components/ui/Clay';
import { tokens } from '../src/theme';
import { set, toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';

const PARTS: { key: string; icon: ClayName; label: string; meta?: string }[] = [
  { key: 'frist', icon: 'glocke', label: 'Frist im Kalender', meta: '12. Dez' },
  { key: 'task', icon: 'erledigt', label: 'Aufgabe: Bescheinigung anfragen' },
  { key: 'doc', icon: 'vertrag', label: 'Infozettel in Dokumente' },
];

export default function FotoVerstanden() {
  const [on, setOn] = useState<Record<string, boolean>>({ frist: true, task: true, doc: true });
  const take = () => {
    // The sample family already has this letter filed; taking it over again
    // just refreshes the inbox entry so the flow is repeatable.
    set((s) => ({
      inbox: [{ id: `in-foto-${Date.now()}`, icon: 'umschlag-euro', src: 'Foto von dir · gerade eben', title: 'Elterngeld: Bescheinigung fehlt', made: 'Frist 12. Dez · Aufgabe Tom', state: 'ok' }, ...s.inbox.filter((i) => !i.id.startsWith('in-foto'))],
    }));
    toast('Übernommen');
    router.replace('/infozettel');
  };
  return (
    <Screen
      gap={12}
      footer={
        <>
          <TextLink label="Nichts davon" onPress={() => router.back()} />
          <Btn label="Übernehmen" disabled={!Object.values(on).some(Boolean)} onPress={take} />
        </>
      }
    >
      <BackBar />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4, paddingHorizontal: 2 }}>
        <Tile name="brief-gelesen" size={56} radius={18} />
        <View style={{ gap: 1, flex: 1 }}>
          <Txt size={15} weight={600}>Elterngeldstelle Bayern</Txt>
          <Meta>Brief vom 24. Oktober · Toms Elterngeld</Meta>
        </View>
      </View>
      <Txt size={28} line={34} weight={700} tracking={-0.8} style={{ marginTop: 6 }}>Bis 12. Dezember fehlt noch die Arbeitgeber­bescheinigung.</Txt>
      <Meta color={tokens.mute}>Aktenzeichen EG-2026-118734</Meta>
      <View style={{ height: 6 }} />
      <Group>
        {PARTS.map((p) => (
          <LineRow
            key={p.key}
            lead={<ClayIcon name={p.icon} size={28} />}
            value={p.label}
            weight={500}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {p.meta ? <Meta>{p.meta}</Meta> : null}
                <Check done={on[p.key]} onPress={() => setOn({ ...on, [p.key]: !on[p.key] })} />
              </View>
            }
          />
        ))}
      </Group>
    </Screen>
  );
}
