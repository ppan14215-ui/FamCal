/** Jahr · 3 Loslassen: the milestone under the thumb grows into a card. */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Sheet from '../../src/components/Sheet';
import { Btn, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import { Owner } from '../../src/components/ui/Person';
import { milestoneSub } from '../../src/components/Timeline';
import { tokens } from '../../src/theme';
import { useStore, toast } from '../../src/state/store';

export default function Meilenstein() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = useStore((s) => s.milestones.find((x) => x.id === id));
  if (!m) return null;
  const open = () => {
    if (m.id === 'm-eg') router.replace('/infozettel');
    else { router.back(); toast(`${m.title} ist im Kalender eingetragen`); }
  };
  return (
    <Sheet bg={tokens.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Tile name={m.icon} size={64} radius={20} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={20} weight={700} tracking={-0.4}>{m.id === 'm-eg' ? 'Elterngeld beantragen' : m.title}</Txt>
          <Meta color={m.frist && !m.done ? tokens.frist : tokens.sub}>{milestoneSub(m)}</Meta>
        </View>
        {m.who ? <Owner who={m.who} size={30} /> : null}
      </View>
      {m.text ? <Txt size={15} line={22} color={tokens.sub}>{m.text}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="Öffnen" onPress={open} style={{ flex: 1 }} />
        <Btn label="Zu heute" primary={false} onPress={() => router.back()} />
      </View>
    </Sheet>
  );
}
