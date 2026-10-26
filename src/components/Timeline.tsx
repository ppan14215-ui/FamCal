/** Milestone rows with a connecting line (canvas `tl_rows`). */
import React from 'react';
import { View, Platform } from 'react-native';
import Txt from './ui/Txt';
import { Tile } from './ui/Clay';
import { Check, Meta } from './ui/kit';
import Animated from 'react-native-reanimated';
import { tokens, rowIn, rowOut, rowLayout } from '../theme';
import type { Milestone } from '../state/types';
import { until, dayNum, MONTHS_SHORT, monthIdx } from '../lib/dates';
import PressScale from './ui/PressScale';

export function milestoneSub(m: Milestone): string {
  if (m.frist && !m.done) return `Frist ${dayNum(m.date)}. ${MONTHS_SHORT[monthIdx(m.date)]} · ${until(m.date)}`;
  if (m.done) return m.sub.replace(/\s*·\s*schon erledigt\?$/, '') + ' · erledigt';
  return m.sub;
}

// A ticked row stays where it is (Julian 26.10.: "abhaken anstatt verschwinden").
// Reanimated's layout transition can pin a row out of place in mobile Safari,
// so the web link skips it.
const layout = Platform.OS === 'web' ? undefined : rowLayout;

export default function Timeline({ items, onToggle, onPress, highlight }: { items: Milestone[]; onToggle?: (id: string) => void; onPress?: (m: Milestone) => void; highlight?: string | null }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((m, i) => (
        <Animated.View key={m.id} entering={rowIn} exiting={rowOut} layout={layout}>
        <PressScale
          disabled={!onPress}
          onPress={() => onPress?.(m)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, margin: -6, padding: 6, borderWidth: highlight === m.id ? 1.5 : 0, borderColor: tokens.ink }}
        >
          {i < items.length - 1 ? <View style={{ position: 'absolute', left: 31, top: 58, bottom: -14, width: 2, backgroundColor: tokens.hair }} /> : null}
          <Tile name={m.icon} size={52} radius={16} celebrate={m.done} />
          <View style={{ flex: 1 }}>
            <Txt size={16} weight={600} strike={m.done} color={m.done ? tokens.mute : tokens.ink}>{m.title}</Txt>
            <Meta color={m.frist && !m.done ? tokens.frist : tokens.sub}>{milestoneSub(m)}</Meta>
          </View>
          <Check done={m.done} onPress={onToggle ? () => onToggle(m.id) : undefined} />
        </PressScale>
        </Animated.View>
      ))}
    </View>
  );
}
