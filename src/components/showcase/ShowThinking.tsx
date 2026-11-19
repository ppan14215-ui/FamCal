/**
 * The chat's thinking card for the onboarding showcase: a copy of ChatCards.Thinking that takes its
 * state as props instead of reading the global veil (setVeil is shared with the real chat and
 * VeilHost, so the showcase never touches it). Same bubble, same card frame, same Memo face, so
 * when the finished Entry takes its place nothing jumps.
 *
 * `Turn` is the bubble half of ChatCards.Entry (who, time, the sentence) with any card under it,
 * for the showcase cards that are not feed entries (Agenda, Rezept).
 */
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Txt from '../ui/Txt';
import { Avatar, usePersons } from '../ui/Person';
import { Reply, cardFrame, at, shortSaid } from '../ChatCards';
import { Step } from '../Veil';
import { tokens, rowLayout } from '../../theme';
import type { PersonId } from '../../theme';
import { tx } from '../../i18n/lang';

export type Side = 'left' | 'right';

/** Who said it and when, the bubble in their colour, and whatever came of it below. */
export function Turn({ by, said, when, side, children }: { by: PersonId; said: string; when: string; side: Side; children?: React.ReactNode }) {
  const persons = usePersons();
  const mine = side === 'right';
  const p = persons[by];
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {mine ? null : <View style={{ marginTop: 20 }}><Avatar p={by} size={28} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <Txt size={12.5} color={tokens.sub}>{[mine ? tx('Du', 'You') : p.name, at(when)].join(' · ')}</Txt>
        <View style={[{ maxWidth: '86%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: p.tint }, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }]}>
          <Txt size={15} line={21}>{shortSaid(said)}</Txt>
        </View>
        {children}
      </View>
    </View>
  );
}

export type ShowThinkingProps = {
  by: PersonId;
  said: string;
  side: Side;
  /** ISO time of the sentence. */
  when: string;
  /** Memo's sentence once it has spoken; dots until then. */
  reply?: string;
  head?: string;
  lines?: string[];
  shown?: number;
};

export default function ShowThinking({ by, said, side, when, reply, head, lines = [], shown = 0 }: ShowThinkingProps) {
  return (
    <Turn by={by} said={said} when={when} side={side}>
      <Animated.View layout={rowLayout} style={cardFrame}>
        <Reply text={reply} live />
        {head || lines.length ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14, gap: 10 }}>
            {head ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{head.toUpperCase()}</Txt> : null}
            {lines.map((l, i) => <Step key={i} label={l} state={i < shown ? 'done' : i === shown ? 'now' : 'next'} />)}
          </View>
        ) : <View style={{ height: 10 }} />}
      </Animated.View>
    </Turn>
  );
}
