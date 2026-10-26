/** Neuer Termin · Symbol wählen: every clay icon, grouped, searchable. */
import React, { useState } from 'react';
import { View, ScrollView, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import Sheet from '../src/components/Sheet';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import { tokens, tint, fonts } from '../src/theme';
import { useStore, actions } from '../src/state/store';
import { SYMBOL_GROUPS, symbolLabel } from '../src/data/symbols';
import { haptics } from '../src/lib/haptics';
import type { ClayName } from '../src/lib/clayIcons';
import PressScale from '../src/components/ui/PressScale';

export default function Symbol() {
  const current = useStore((s) => s.draftSymbol);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<ClayName | null>(current);
  const query = q.trim().toLowerCase();
  const groups = SYMBOL_GROUPS.map((g) => ({ ...g, icons: g.icons.filter((n) => !query || n.includes(query) || symbolLabel(n).toLowerCase().includes(query)) })).filter((g) => g.icons.length);

  const choose = (n: ClayName) => {
    haptics.select();
    setSel(n);
    actions.pickSymbol(n);
    setTimeout(() => goBack(), 140);
  };

  return (
    <Sheet bg={tokens.row} top={70} scrollable style={{ paddingBottom: 0, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={20} weight={700} tracking={-0.4}>Symbol</Txt>
        <PressScale hitSlop={10} onPress={() => goBack()}><Txt size={15} weight={600}>Fertig</Txt></PressScale>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F1F1EF' }}>
        <LineIcon name="sparkle" size={16} color={tokens.sub} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Suchen, z. B. Fußball"
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.ink}
          style={[{ flex: 1, fontFamily: fonts[400], fontSize: 16, color: tokens.ink }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
      </View>
      <ScrollView style={{ flex: 1, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled">
        {groups.map((g) => (
          <View key={g.title} style={{ gap: 4 }}>
            <Txt size={13.5} weight={600} color={tokens.sub}>{g.title}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {g.icons.map((n) => {
                const on = n === sel;
                return (
                  <View key={n} style={{ width: `${100 / 6}%`, padding: 2 }}>
                    <PressScale
                      accessibilityLabel={symbolLabel(n)}
                      onPress={() => choose(n)}
                      style={{ aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tint(n) : 'transparent', borderWidth: 2, borderColor: on ? tokens.ink : 'transparent' }}
                    >
                      <ClayIcon name={n} size={40} />
                    </PressScale>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        {!groups.length ? <Txt size={15} color={tokens.sub}>Kein Symbol gefunden.</Txt> : null}
      </ScrollView>
    </Sheet>
  );
}
