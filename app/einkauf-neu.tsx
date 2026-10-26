/**
 * Einkauf · Hinzufügen. Typing suggests from what you buy; tapping adds,
 * tapping again takes it back out. Sorting into Drogerie or Supermarkt is
 * automatic.
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, H2, Group, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens, fonts } from '../src/theme';
import { useStore, actions } from '../src/state/store';
import { catalog, oftBeiEuch, parseItem, sectionFor } from '../src/data/sample';
import { haptics } from '../src/lib/haptics';

export default function EinkaufNeu() {
  const [q, setQ] = useState('');
  const list = useStore((s) => s.lists.find((l) => l.id === 'einkauf'));
  const onList = useMemo(() => new Set(list?.sections.flatMap((s) => s.items).filter((i) => !i.done).map((i) => i.name.toLowerCase()) ?? []), [list]);

  const name = parseItem(q).name;
  const hits = name ? catalog.filter((c) => c.name.toLowerCase().startsWith(name.toLowerCase())).slice(0, 4) : [];
  const exact = hits.some((h) => h.name.toLowerCase() === name.toLowerCase());

  const toggle = (n: string) => { haptics.select(); actions.toggleShopping(n); };
  const addFree = () => {
    if (!q.trim()) return;
    haptics.select();
    actions.addItem('einkauf', q);
    setQ('');
  };

  return (
    <Screen gap={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tokens.row, borderWidth: 1.5, borderColor: tokens.ink }}>
          <LineIcon name="plus" size={20} color={tokens.sub} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => (hits[0] && exact ? (toggle(hits[0].name), setQ('')) : addFree())}
            blurOnSubmit={false}
            placeholder="Was fehlt?"
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.ink}
            returnKeyType="done"
            style={[{ flex: 1, fontFamily: fonts[500], fontSize: 17, color: tokens.ink }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
        <Pressable hitSlop={10} onPress={() => router.back()}><Txt size={15} weight={600}>Fertig</Txt></Pressable>
      </View>

      {name ? (
        <Group>
          {hits.map((h) => {
            const added = onList.has(h.name.toLowerCase());
            return (
              <Pressable key={h.name} onPress={() => toggle(h.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: tokens.row }}>
                <View style={{ flex: 1 }}>
                  <Txt size={16} weight={added ? 600 : 500} color={added ? tokens.done : tokens.ink}>{h.name}</Txt>
                  <Meta>{`${h.section === 'drogerie' ? 'Drogerie' : 'Supermarkt'}${h.last ? ' · ' + h.last : ''}`}</Meta>
                </View>
                <LineIcon name={added ? 'check' : 'plus'} size={18} color={added ? tokens.done : tokens.sub} stroke={added ? 2.4 : 1.8} />
              </Pressable>
            );
          })}
          {!exact ? (
            <Pressable onPress={addFree} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: tokens.row }}>
              <View style={{ flex: 1 }}>
                <Txt size={16} weight={500}>{`„${q.trim()}“ als neues Ding`}</Txt>
                <Meta>{sectionFor(name) === 'drogerie' ? 'kommt zu Drogerie' : 'kommt zu Supermarkt'}</Meta>
              </View>
              <LineIcon name="plus" size={18} color={tokens.sub} />
            </Pressable>
          ) : null}
        </Group>
      ) : null}

      <H2>Oft bei euch</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {oftBeiEuch.map((n) => {
          const on = onList.has(n.toLowerCase());
          return (
            <Pressable
              key={n}
              onPress={() => toggle(n)}
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? tokens.doneSoft : tokens.row, borderWidth: on ? 0 : 1, borderColor: tokens.hair }}
            >
              {on ? <LineIcon name="check" size={14} color={tokens.done} stroke={2.4} /> : null}
              <Txt size={14.5} weight={500} color={on ? tokens.done : tokens.ink}>{n}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt size={13.5} line={19} color={tokens.sub}>Tippen fügt hinzu, nochmal tippen nimmt es wieder raus. Wir sortieren es selbst in Drogerie oder Supermarkt. Menge und Notiz einfach mitschreiben: „2 Hafermilch, ungesüßt“.</Txt>
    </Screen>
  );
}
