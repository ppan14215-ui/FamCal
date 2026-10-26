/** Einkauf · Abo-Optionen. The parents close the subscription themselves. */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, Btn, Card, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens } from '../src/theme';
import { actions, toast } from '../src/state/store';

const OPTS = [
  { key: 'drogerie', t: 'Drogerie-Abo', sub: 'Lieferung alle 2 Wochen · jederzeit pausieren', price: 'ca. –10 %' },
  { key: 'versand', t: 'Versandhändler Spar-Abo', sub: 'Rabatt steigt mit mehr Abo-Artikeln', price: 'bis –15 %' },
  { key: 'selbst', t: 'Weiter selbst kaufen', sub: 'Bleibt auf eurer Liste wie bisher', price: '' },
];

export default function Abo() {
  const [sel, setSel] = React.useState('drogerie');
  const label = sel === 'drogerie' ? 'Zum Drogerie-Abo' : sel === 'versand' ? 'Zum Spar-Abo' : 'So lassen';
  return (
    <Screen
      footer={
        <>
          <Txt size={12.5} line={17} color={tokens.mute} center>Ihr schließt das Abo selbst beim Händler ab. Wir verdienen daran nichts.</Txt>
          <Btn
            label={label}
            onPress={() => {
              actions.dismissHint('abo');
              router.back();
              toast(sel === 'selbst' ? 'Bleibt auf eurer Liste' : 'Im Prototyp öffnet sich hier der Händler');
            }}
          />
        </>
      }
    >
      <BackBar />
      <View style={{ gap: 4 }}>
        <Txt size={13.5} color={tokens.sub}>Windeln Gr. 2 · etwa 3 Packungen im Monat</Txt>
        <Txt size={28} line={34} weight={700} tracking={-0.8}>So könnte es von selbst kommen.</Txt>
      </View>
      <View style={{ gap: 8 }}>
        {OPTS.map((o) => (
          <Pressable key={o.key} onPress={() => setSel(o.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row, borderWidth: 1.5, borderColor: sel === o.key ? tokens.ink : 'transparent' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} weight={600}>{o.t}</Txt>
              <Meta>{o.sub}</Meta>
            </View>
            {o.price ? <Txt size={15} weight={600}>{o.price}</Txt> : null}
          </Pressable>
        ))}
      </View>
      <Card pad={14}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <LineIcon name="sync" size={18} color={tokens.sub} />
          <Txt size={14} line={20} color={tokens.sub} style={{ flex: 1 }}>Wir denken mit: Ab Dezember braucht Ben Größe 3. Wir erinnern euch, das Abo umzustellen.</Txt>
        </View>
      </Card>
    </Screen>
  );
}
