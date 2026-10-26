/**
 * Listen · Neue Liste. Same screen from "+ Neu" and from the assistant's
 * suggestion; from a suggestion, name, date and template are pre-filled.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CancelBar, Btn, CardRow } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { TitleInput } from '../src/components/Field';
import { tokens } from '../src/theme';
import { actions } from '../src/state/store';
import { templates, kliniktasche, listFromTemplate } from '../src/data/sample';
import type { ClayName } from '../src/lib/clayIcons';
import type { List } from '../src/state/types';

type Key = 'leer' | 'klinik' | 'urlaub' | 'erst';
const TPL: { key: Key; icon?: ClayName; title: string; sub: string; name: string }[] = [
  { key: 'leer', title: 'Leer', sub: 'Ihr tragt selbst ein', name: '' },
  { key: 'klinik', icon: 'hebamme', title: 'Kliniktasche', sub: '18 Dinge für Geburt und Wochenbett', name: 'Kliniktasche' },
  { key: 'urlaub', icon: 'reise', title: 'Urlaub mit Baby', sub: 'Packliste, 24 Dinge', name: 'Urlaub mit Baby' },
  { key: 'erst', icon: 'einkauf', title: 'Erstausstattung', sub: 'Was ihr vor der Geburt braucht', name: 'Erstausstattung' },
];

function build(key: Key, name: string): List {
  if (key === 'klinik') {
    const l = kliniktasche();
    return { ...l, name, sections: l.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, done: false, who: null })) })) };
  }
  if (key === 'urlaub') return listFromTemplate(name, 'reise', templates.urlaub);
  if (key === 'erst') return listFromTemplate(name, 'einkauf', templates.erstausstattung);
  return listFromTemplate(name, 'karten', null);
}

export default function ListeNeu() {
  const { vorschlag } = useLocalSearchParams<{ vorschlag?: string }>();
  const fromHint = vorschlag === 'urlaub';
  const [sel, setSel] = useState<Key>(fromHint ? 'urlaub' : 'klinik');
  const [name, setName] = useState(fromHint ? 'Ostsee mit Ben' : 'Kliniktasche');
  const order = fromHint ? (['urlaub', 'leer', 'klinik', 'erst'] as Key[]) : (['leer', 'klinik', 'urlaub', 'erst'] as Key[]);

  const pick = (k: Key) => {
    const prev = TPL.find((t) => t.key === sel)!;
    if (!name.trim() || name === prev.name) setName(TPL.find((t) => t.key === k)!.name);
    setSel(k);
  };

  return (
    <Screen
      gap={12}
      footer={
        <Btn
          label="Liste anlegen"
          disabled={!name.trim()}
          onPress={() => {
            actions.createList(build(sel, name.trim()));
            if (fromHint) actions.dismissHint('urlaub');
            router.back();
          }}
        />
      }
    >
      <CancelBar />
      <TitleInput value={name} onChangeText={setName} placeholder="Name der Liste" sub={fromHint ? 'Fällig vor Abreise am Sa 20. März' : 'Für euch beide sichtbar'} />
      <Txt size={15} weight={600} style={{ marginTop: 4 }}>Womit anfangen?</Txt>
      <View style={{ gap: 8 }}>
        {order.map((k) => {
          const t = TPL.find((x) => x.key === k)!;
          return <CardRow key={k} icon={t.icon} empty={!t.icon} title={t.title} sub={fromHint && k === 'urlaub' ? 'Packliste, 24 Dinge · passt zu eurem Urlaub' : t.sub} selected={sel === k} onPress={() => pick(k)} />;
        })}
      </View>
      {fromHint ? <Txt size={13.5} line={19} color={tokens.sub}>Name, Datum und Vorlage kommen aus dem Urlaub in eurem Kalender.</Txt> : null}
    </Screen>
  );
}
