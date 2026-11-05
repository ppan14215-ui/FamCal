/**
 * Pick the bottom navigation (Julian 05.11.2026 20:05, card: "Navigation: Tabs oder Ein Balken" is chosen in
 * onboarding, both stay, and the choice is tracked). Two cards with a tiny drawing of each; a tap switches the
 * app at once (setNavStyle redraws without restart), so what you pick is what you see in the next step.
 * Placement and motion belong to the onboarding flow; this only draws the choice and reports it.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { navStyle, setNavStyle, type NavStyle } from '../lib/navStyle';
import { chooseNav } from '../lib/funnel';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

type Opt = { key: Extract<NavStyle, 'strip' | 'bar'>; title: string; sub: string };

export default function NavChoice({ onChosen }: { onChosen?: (s: NavStyle) => void }) {
  const [sel, setSel] = useState<NavStyle>(navStyle() === 'bar' ? 'bar' : 'strip');
  const opts: Opt[] = [
    { key: 'strip', title: tx('Tabs unter der Eingabe', 'Tabs under the field'), sub: tx('Alles immer sichtbar', 'Everything always in view') },
    { key: 'bar', title: tx('Ein Balken', 'One bar'), sub: tx('Ruhiger, mehr Platz', 'Calmer, more room') },
  ];
  const pick = (k: NavStyle) => {
    haptics.select();
    setSel(k);
    setNavStyle(k);
    chooseNav(k, 'onboarding');
    onChosen?.(k);
  };
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {opts.map((o) => (
        <PressScale key={o.key} onPress={() => pick(o.key)} accessibilityRole="button" accessibilityState={{ selected: sel === o.key }}
          style={{ flex: 1, padding: 12, gap: 10, borderRadius: 20, backgroundColor: tokens.row, borderWidth: 2, borderColor: sel === o.key ? tokens.ink : 'transparent' }}>
          <Mini kind={o.key} />
          <View style={{ gap: 2 }}>
            <Txt size={15} line={19} weight={600}>{o.title}</Txt>
            <Txt size={13} line={17} color={tokens.sub}>{o.sub}</Txt>
          </View>
        </PressScale>
      ))}
    </View>
  );
}

/** A phone bottom in miniature: the field and the tabs as they will look. */
function Mini({ kind }: { kind: 'strip' | 'bar' }) {
  const field = <View style={{ flex: 1, height: 18, borderRadius: 9, backgroundColor: tokens.chipBg }} />;
  return (
    <View style={{ height: 96, borderRadius: 14, backgroundColor: tokens.bg, padding: 8, justifyContent: 'flex-end', gap: 6 }}>
      {kind === 'strip' ? (
        <>
          {field}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[0, 1, 2].map((i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: i === 0 ? tokens.ink : tokens.chipBg }} />)}
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tokens.ink }} />
          {field}
        </View>
      )}
    </View>
  );
}
