/**
 * Was ich weiß (Julian 31.10. 21:10: Familiengedächtnis). Everything the assistant was told to remember, for both
 * parents, grouped by who it is about. Visible, deletable with a swipe (Rückgängig in the toast), never guessed.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1, H2, Lead, Group, Meta, Hint } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import SwipeRow from '../src/components/SwipeRow';
import { tokens, persons } from '../src/theme';
import { toast, useStore } from '../src/state/store';
import { facts, forget, Fact } from '../src/lib/wissen';
import { short } from '../src/lib/dates';
import { tx } from '../src/i18n/lang';

export default function Wissen() {
  const lists = useStore((s) => s.lists);
  const all = useMemo(() => facts(lists), [lists]);
  const groups = useMemo(() => {
    const m = new Map<string, Fact[]>();
    for (const f of [...all].reverse()) {
      const k = f.about?.trim() || tx('Allgemein', 'General');
      m.set(k, [...(m.get(k) ?? []), f]);
    }
    return [...m.entries()];
  }, [all]);
  const drop = (f: Fact) => {
    const undo = forget([f.id]);
    toast(tx('Vergessen', 'Forgotten'), undo);
  };
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{tx('Was ich weiß', 'What I know')}</H1>
      <Lead>{tx('Alles, was ihr mir zum Merken gesagt habt. Ihr seht beide dasselbe. Wischen löscht.', 'Everything you asked me to remember. You both see the same. Swipe to delete.')}</Lead>
      {groups.length ? groups.map(([who, list]) => (
        <View key={who} style={{ gap: 8 }}>
          <H2>{who}</H2>
          <Group>
            {list.map((f) => (
              <SwipeRow key={f.id} onDelete={() => drop(f)}>
                <View style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 2, backgroundColor: tokens.row }}>
                  <Txt size={15.5} line={21} weight={600}>{f.text}</Txt>
                  {f.by || f.at ? <Meta>{[f.by ? persons[f.by].name : '', f.at ? short(f.at) : ''].filter(Boolean).join(' · ')}</Meta> : null}
                </View>
              </SwipeRow>
            ))}
          </Group>
        </View>
      )) : (
        <Group>
          <View style={{ paddingVertical: 16, paddingHorizontal: 14, gap: 4, backgroundColor: tokens.row }}>
            <Txt size={15.5} weight={600}>{tx('Noch nichts gemerkt', 'Nothing remembered yet')}</Txt>
            <Meta>{tx('Sag einfach: "Karlo hat Schuhgröße 28" oder "Merk dir, der Klempner heißt Herr Maier". Später fragst du: "Welche Größe hat Karlo?"', 'Just say: "Karlo wears shoe size 28" or "Remember, the plumber is Mr Maier". Later ask: "What size is Karlo?"')}</Meta>
          </View>
        </Group>
      )}
      <Hint icon="lock">{tx('Passwörter, PINs und Kontonummern merke ich mir nie.', 'I never store passwords, PINs or account numbers.')}</Hint>
    </Screen>
  );
}
