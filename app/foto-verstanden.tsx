/** Foto · Verstanden: the result as one sentence, and what will be taken over. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, BackBar, Btn, TextLink, Group, LineRow, Meta, Check } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { Tile, ClayIcon } from '../src/components/ui/Clay';
import { tokens } from '../src/theme';
import { set, toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';
import { tx } from '../src/i18n/lang';

const parts = (): { key: string; icon: ClayName; label: string; meta?: string }[] => [
  { key: 'frist', icon: 'glocke', label: tx('Frist im Kalender', 'Deadline in the calendar'), meta: tx('12. Dez', 'Dec 12') },
  { key: 'task', icon: 'erledigt', label: tx('Aufgabe: Bescheinigung anfragen', 'To do: request the confirmation') },
  { key: 'doc', icon: 'vertrag', label: tx('Infozettel in Dokumente', 'Info sheet to documents') },
];

export default function FotoVerstanden() {
  const PARTS = parts();
  const [on, setOn] = useState<Record<string, boolean>>({ frist: true, task: true, doc: true });
  const take = () => {
    // The sample family already has this letter filed; taking it over again
    // just refreshes the inbox entry so the flow is repeatable.
    set((s) => ({
      inbox: [{ id: `in-foto-${Date.now()}`, icon: 'umschlag-euro', src: tx('Foto von dir · gerade eben', 'Your photo · just now'), title: tx('Elterngeld: Bescheinigung fehlt', 'Parental allowance: confirmation missing'), made: tx('Frist 12. Dez · Aufgabe Tom', 'Deadline Dec 12 · to do Tom'), state: 'ok' }, ...s.inbox.filter((i) => !i.id.startsWith('in-foto'))],
    }));
    toast(tx('Übernommen', 'Added'));
    router.replace('/infozettel');
  };
  return (
    <Screen
      gap={12}
      footer={
        <>
          <TextLink label={tx('Nichts davon', 'None of it')} onPress={() => goBack()} />
          <Btn label={tx('Übernehmen', 'Add')} disabled={!Object.values(on).some(Boolean)} onPress={take} />
        </>
      }
    >
      <BackBar />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4, paddingHorizontal: 2 }}>
        <Tile name="brief-gelesen" size={56} radius={18} />
        <View style={{ gap: 1, flex: 1 }}>
          <Txt size={15} weight={600}>{tx('Elterngeldstelle Bayern', 'Parental Allowance Office')}</Txt>
          <Meta>{tx('Brief vom 24. Oktober · Toms Elterngeld', 'Letter of October 24 · Tom’s allowance')}</Meta>
        </View>
      </View>
      <Txt size={28} line={34} weight={700} tracking={-0.8} style={{ marginTop: 6 }}>{tx('Bis 12. Dezember fehlt noch die Arbeitgeber­bescheinigung.', 'The employer confirmation is still missing, due December 12.')}</Txt>
      <Meta color={tokens.mute}>{tx('Aktenzeichen EG-2026-118734', 'Reference EG-2026-118734')}</Meta>
      <View style={{ height: 6 }} />
      <Group>
        {PARTS.map((p) => (
          <LineRow
            key={p.key}
            lead={<ClayIcon name={p.icon} size={38} />}
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
