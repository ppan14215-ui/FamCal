/**
 * Listen · Neue Liste. Same screen from "+ Neu" and from the assistant's
 * suggestion; from a suggestion, name, date and template are pre-filled.
 * Like Notion the list gets its own icon (Julian 27.10.): it follows the
 * name or template until you pick one. A Sammlung has no checks, for films,
 * books or ideas.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, CancelBar, Btn, CardRow } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import { ClayIcon } from '../src/components/ui/Clay';
import { TitleInput } from '../src/components/Field';
import { tokens, tint } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import { templates, kliniktasche, listFromTemplate } from '../src/data/sample';
import { iconFor } from '../src/lib/iconWords';
import { blueprintFor } from '../src/lib/blueprint';
import { haptics } from '../src/lib/haptics';
import type { ClayName } from '../src/lib/clayIcons';
import type { List, Blueprint, Block } from '../src/state/types';
import { tx } from '../src/i18n/lang';

type Key = 'leer' | 'sammlung' | 'klinik' | 'urlaub' | 'erst';
const TPL: { key: Key; icon?: ClayName; title: string; sub: string; name: string }[] = [
  { key: 'leer', title: tx('Leer', 'Empty'), sub: tx('Zum Abhaken, ihr tragt selbst ein', 'To check off, you add things yourself'), name: '' },
  { key: 'sammlung', icon: 'notizblock', title: tx('Sammlung', 'Collection'), sub: tx('Ohne Haken, z. B. Filme, Bücher, Ideen', 'No checks, e.g. films, books, ideas'), name: '' },
  { key: 'klinik', icon: 'hebamme', title: 'Kliniktasche', sub: tx('18 Dinge für Geburt und Wochenbett', '18 things for the birth and the first days'), name: 'Kliniktasche' },
  { key: 'urlaub', icon: 'reise', title: 'Urlaub mit Baby', sub: tx('Packliste, 24 Dinge', 'Packing list, 24 things'), name: 'Urlaub mit Baby' },
  { key: 'erst', icon: 'einkauf', title: 'Erstausstattung', sub: tx('Was ihr vor der Geburt braucht', 'What you need before the birth'), name: 'Erstausstattung' },
];

function build(key: Key, name: string, icon: ClayName): List {
  if (key === 'klinik') {
    const l = kliniktasche();
    return { ...l, name, icon, sections: l.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, done: false, who: null })) })) };
  }
  if (key === 'urlaub') return listFromTemplate(name, icon, templates.urlaub);
  if (key === 'erst') return listFromTemplate(name, icon, templates.erstausstattung);
  if (key === 'sammlung') return { ...listFromTemplate(name, icon, null), kind: 'collection' };
  return listFromTemplate(name, icon, null);
}

const BLOCK_NAME: Partial<Record<Block, string>> = {
  cover: tx('Cover', 'cover'), stars: tx('Bewertung', 'rating'), year: tx('Jahr', 'year'), by: tx('Autor oder Regie', 'author or director'),
  link: 'Link', price: tx('Preis', 'price'), place: tx('Ort', 'place'), date: tx('Datum', 'date'), note: tx('Notiz', 'note'),
};

/** "Mit Cover, Bewertung und Gesehen": what the list will grow, said before it exists. */
function preview(bp: Blueprint): string {
  // Year and author come with the cover, so the line names only what you see and touch.
  const names = bp.blocks.filter((b) => b !== 'year' && b !== 'by').map((b) => (b === 'seen' ? bp.seenLabel ?? tx('Erledigt', 'Done') : BLOCK_NAME[b])).filter((x): x is string => !!x);
  const last = names.pop();
  return tx('Mit ', 'With ') + (names.length ? `${names.join(', ')} ${tx('und', 'and')} ${last}` : last ?? '');
}

/** The icon a list gets when nobody picked one: from its name, else from its template. */
const autoIcon = (name: string, key: Key): ClayName => {
  const t = TPL.find((x) => x.key === key)!;
  const fromName = name === t.name ? 'kalender' : iconFor(name);
  return fromName !== 'kalender' ? fromName : t.icon ?? 'karten';
};

export default function ListeNeu() {
  const { vorschlag } = useLocalSearchParams<{ vorschlag?: string }>();
  const fromHint = vorschlag === 'urlaub';
  const draft = useStore((s) => s.draftSymbol);
  const [sel, setSel] = useState<Key>(fromHint ? 'urlaub' : 'klinik');
  const [name, setName] = useState(fromHint ? 'Ostsee mit Ben' : 'Kliniktasche');
  const [picked, setPicked] = useState<ClayName | null>(null);
  const order = fromHint ? (['urlaub', 'leer', 'sammlung', 'klinik', 'erst'] as Key[]) : (['leer', 'sammlung', 'klinik', 'urlaub', 'erst'] as Key[]);
  const icon = picked ?? autoIcon(name, sel);
  // The store gives the same blueprint when the list is made (createList).
  const bp = blueprintFor(name);

  // The picker writes draftSymbol; taken over once, and cleared when leaving.
  useEffect(() => () => actions.clearDraftSymbol(), []);
  useEffect(() => {
    if (!draft) return;
    setPicked(draft);
    actions.clearDraftSymbol();
  }, [draft]);

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
          label={tx('Liste anlegen', 'Create list')}
          disabled={!name.trim()}
          onPress={() => {
            actions.createList(build(sel, name.trim(), icon));
            if (fromHint) actions.dismissHint('urlaub');
            goBack();
          }}
        />
      }
    >
      <CancelBar />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PressScale
          accessibilityLabel={tx('Symbol der Liste ändern', 'Change the list icon')}
          onPress={() => { haptics.select(); router.push('/symbol'); }}
          style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tint(icon), alignItems: 'center', justifyContent: 'center' }}
        >
          <ClayIcon name={icon} size={52} />
        </PressScale>
        <TitleInput value={name} onChangeText={setName} placeholder={tx('Name der Liste', 'List name')} sub={fromHint ? tx('Fällig vor Abreise am Sa 20. März', 'Due before leaving on Sat March 20') : bp ? `✦ ${preview(bp)}` : tx('Symbol antippen zum Ändern', 'Tap the icon to change it')} />
      </View>
      <Txt size={15} weight={600} style={{ marginTop: 4 }}>{tx('Womit anfangen?', 'Start with what?')}</Txt>
      <View style={{ gap: 8 }}>
        {order.map((k) => {
          const t = TPL.find((x) => x.key === k)!;
          return <CardRow key={k} icon={t.icon} empty={!t.icon} title={t.title} sub={fromHint && k === 'urlaub' ? tx('Packliste, 24 Dinge · passt zu eurem Urlaub', 'Packing list, 24 things · fits your trip') : t.sub} selected={sel === k} onPress={() => pick(k)} />;
        })}
      </View>
      {fromHint ? <Txt size={13.5} line={19} color={tokens.sub}>{tx('Name, Datum und Vorlage kommen aus dem Urlaub in eurem Kalender.', 'Name, date and template come from the trip in your calendar.')}</Txt> : null}
    </Screen>
  );
}
