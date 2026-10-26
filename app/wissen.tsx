/** Assistent · Was ich weiß. Visible memory (R3): everything here can be changed or deleted. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1, H2, Lead, Group, Meta, Chevron, Hint } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { Tile } from '../src/components/ui/Clay';
import { Avatar } from '../src/components/ui/Person';
import SwipeRow from '../src/components/SwipeRow';
import { tokens } from '../src/theme';
import { toast } from '../src/state/store';
import { weeksOld } from '../src/lib/dates';
import type { ClayName } from '../src/lib/clayIcons';

type K = { id: string; lead: React.ReactNode; t: string; s: string };

const FAMILIE: K[] = [
  { id: 'j', lead: <Avatar p="J" size={30} />, t: 'Julia', s: 'Mama · Farbe Rosa' },
  { id: 't', lead: <Avatar p="T" size={30} />, t: 'Tom', s: 'Papa · Farbe Blau' },
  { id: 'b', lead: <Tile name="schnuller" size={30} radius={10} />, t: 'Ben', s: `${weeksOld()} Wochen · geboren 14. Sep 2026` },
];
const tile = (n: ClayName) => <Tile name={n} size={30} radius={10} />;
const MENSCHEN: K[] = [
  { id: 'w', lead: tile('stethoskop'), t: 'Dr. Weber', s: 'Kinderarzt · Hauptstr. 12' },
  { id: 's', lead: tile('hebamme'), t: 'Sarah Lind', s: 'Hebamme' },
  { id: 'i', lead: tile('geburtstag'), t: 'Oma Inge', s: 'Geburtstag 2. Nov · letztes Geschenk: Kalender' },
  { id: 'l', lead: tile('kochtopf'), t: 'Lena', s: 'Freundin · isst vegetarisch' },
];

export default function Wissen() {
  const [people, setPeople] = useState(MENSCHEN);
  const row = (k: K, del?: () => void) => {
    const body = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: tokens.row }}>
        {k.lead}
        <View style={{ flex: 1 }}>
          <Txt size={15.5} weight={600}>{k.t}</Txt>
          <Meta>{k.s}</Meta>
        </View>
        <Chevron />
      </View>
    );
    return del ? <SwipeRow key={k.id} onDelete={del}>{body}</SwipeRow> : <View key={k.id}>{body}</View>;
  };
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>Was ich weiß</H1>
      <Lead>Alles hier ist sichtbar, änderbar und löschbar. Nichts davon wird zum Training genutzt.</Lead>
      <H2>Familie</H2>
      <Group>{FAMILIE.map((k) => row(k))}</Group>
      <H2>Menschen und Orte</H2>
      <Group>
        {people.map((k) => row(k, () => {
          const before = people;
          setPeople(people.filter((p) => p.id !== k.id));
          toast(`${k.t} vergessen`, () => setPeople(before));
        }))}
      </Group>
      <Hint icon="lock">U- und Impfstatus bleiben nur auf diesem Gerät.</Hint>
    </Screen>
  );
}
