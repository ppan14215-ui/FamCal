/**
 * Einkauf · Hinzufügen. Typing suggests from what you buy; tapping adds,
 * tapping again takes it back out. Sorting into Drogerie or Supermarkt is
 * automatic.
 */
import React, { useMemo, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, H2, Group, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens, fonts } from '../src/theme';
import { useStore, actions } from '../src/state/store';
import { catalog, oftBeiEuch, parseItem, sectionFor } from '../src/data/sample';
import { haptics } from '../src/lib/haptics';
import { useKeyboardInset } from '../src/lib/keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressScale from '../src/components/ui/PressScale';
import { tx } from '../src/i18n/lang';

export default function EinkaufNeu() {
  const kb = useKeyboardInset();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  // One place for every list (Julian 30.10.: "Listen versteht man auch nicht"): pick the list here, or start a new one.
  const lists = useStore((s) => s.lists);
  const [target, setTarget] = useState('einkauf');
  const shop = target === 'einkauf';
  const list = useStore((s) => s.lists.find((l) => l.id === 'einkauf'));
  const onList = useMemo(() => new Set(list?.sections.flatMap((s) => s.items).filter((i) => !i.done).map((i) => i.name.toLowerCase()) ?? []), [list]);

  const name = parseItem(q).name;
  const hits = name && shop ? catalog.filter((c) => c.name.toLowerCase().startsWith(name.toLowerCase())).slice(0, 4) : [];
  const exact = hits.some((h) => h.name.toLowerCase() === name.toLowerCase());

  const toggle = (n: string) => { haptics.select(); actions.toggleShopping(n); };
  // With a quantity or note typed ("2 Hafermilch, ungesüßt") a hit adds or
  // updates that line instead of toggling it off again.
  const pick = (n: string) => {
    const p = parseItem(q);
    if (!p.qty && !p.note) return toggle(n);
    haptics.select();
    const text = `${p.qty ? p.qty + ' ' : ''}${n}${p.note ? ', ' + p.note : ''}`;
    const existing = list?.sections.flatMap((s) => s.items).find((i) => !i.done && i.name.toLowerCase() === n.toLowerCase());
    if (existing) actions.editItem('einkauf', existing.id, text);
    else actions.addItem('einkauf', text);
    setQ('');
  };
  const addFree = () => {
    if (!q.trim()) return;
    haptics.select();
    actions.addItem(target, q);
    setQ('');
  };

  // The input sits at the bottom where the thumb is and rides up with the
  // keyboard; hits appear right above it (Julian 26.10.).
  return (
    <Screen
      gap={14}
      footer={
        <View style={{ gap: 10, marginBottom: kb ? Math.max(0, kb - insets.bottom) : 0 }}>
          {name ? (
            <Group>
              {hits.map((h) => {
                const added = onList.has(h.name.toLowerCase());
                return (
                  <PressScale key={h.name} onPress={() => pick(h.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: tokens.row }}>
                    <View style={{ flex: 1 }}>
                      <Txt size={16} weight={added ? 600 : 500} color={added ? tokens.done : tokens.ink}>{h.name}</Txt>
                      <Meta>{`${h.section === 'drogerie' ? tx('Drogerie', 'Drugstore') : tx('Supermarkt', 'Supermarket')}${h.last ? ' · ' + h.last : ''}`}</Meta>
                    </View>
                    <LineIcon name={added ? 'check' : 'plus'} size={18} color={added ? tokens.done : tokens.sub} stroke={added ? 2.4 : 1.8} />
                  </PressScale>
                );
              })}
              {!exact ? (
                <PressScale onPress={addFree} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: tokens.row }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={16} weight={500}>{tx(`„${q.trim()}“ als neues Ding`, `“${q.trim()}” as a new item`)}</Txt>
                    <Meta>{sectionFor(name) === 'drogerie' ? tx('kommt zu Drogerie', 'goes to drugstore') : tx('kommt zu Supermarkt', 'goes to supermarket')}</Meta>
                  </View>
                  <LineIcon name="plus" size={18} color={tokens.sub} />
                </PressScale>
              ) : null}
            </Group>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tokens.row, borderWidth: 1.5, borderColor: tokens.ink }}>
            <LineIcon name="plus" size={20} color={tokens.sub} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => (hits[0] && exact ? (pick(hits[0].name), setQ('')) : addFree())}
              blurOnSubmit={false}
              placeholder={tx('Was fehlt?', 'What\'s missing?')}
              placeholderTextColor={tokens.mute}
              selectionColor={tokens.select} cursorColor={tokens.ink}
              returnKeyType="done"
              style={[{ flex: 1, fontFamily: fonts[500], fontSize: 17, color: tokens.ink }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
            />
          </View>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={22} weight={700} tracking={-0.4}>{tx('Auf die Liste', 'To a list')}</Txt>
        <PressScale hitSlop={10} onPress={() => goBack()}><Txt size={15} weight={600}>{tx('Fertig', 'Done')}</Txt></PressScale>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {lists.map((l) => {
          const on = l.id === target;
          return (
            <PressScale key={l.id} onPress={() => { haptics.select(); setTarget(l.id); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? tokens.ink : tokens.row, borderWidth: on ? 0 : 1, borderColor: tokens.hair }}>
              <Txt size={14.5} weight={600} color={on ? tokens.onInk : tokens.ink}>{l.name}</Txt>
            </PressScale>
          );
        })}
        <PressScale onPress={() => { haptics.select(); router.replace('/liste-neu'); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: tokens.hair, borderStyle: 'dashed' }}>
          <LineIcon name="plus" size={14} color={tokens.ink} />
          <Txt size={14.5} weight={600}>{tx('Neue Liste', 'New list')}</Txt>
        </PressScale>
      </View>
      {shop ? <H2>{tx('Oft bei euch', 'You often buy')}</H2> : null}
      {shop ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {oftBeiEuch.map((n) => {
          const on = onList.has(n.toLowerCase());
          return (
            <PressScale
              key={n}
              onPress={() => toggle(n)}
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? tokens.doneSoft : tokens.row, borderWidth: on ? 0 : 1, borderColor: tokens.hair }}
            >
              {on ? <LineIcon name="check" size={14} color={tokens.done} stroke={2.4} /> : null}
              <Txt size={14.5} weight={500} color={on ? tokens.done : tokens.ink}>{n}</Txt>
            </PressScale>
          );
        })}
      </View> : null}
      <Txt size={13.5} line={19} color={tokens.sub}>{tx('Tippen fügt hinzu, nochmal tippen nimmt es wieder raus. Wir sortieren es selbst in Drogerie oder Supermarkt. Menge und Notiz einfach mitschreiben: „2 Hafermilch, ungesüßt“.', 'Tap to add, tap again to remove. We sort it into drugstore or supermarket. Just add amount and note: “2 oat milk, unsweetened”.')}</Txt>
    </Screen>
  );
}
