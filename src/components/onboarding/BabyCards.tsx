/**
 * "Memo denkt mit" (Julian 05.11.2026 22:07 CET): Memo remembers the baby is due soon and sends the
 * first year on its own, asks to turn it into tasks, then splits who does what. Same look as the app's
 * chat cards (cardFrame, transparent clay tiles, person avatars); data from src/data/firstYear.ts.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring, useReducedMotion } from 'react-native-reanimated';
import Txt from '../ui/Txt';
import { Tile } from '../ui/Clay';
import { Avatar } from '../ui/Person';
import { cardFrame } from '../ChatCards';
import { tokens } from '../../theme';
import type { ClayName } from '../../lib/clayIcons';
import type { PersonId } from '../../theme';
import { tx } from '../../i18n/lang';

export type PlanRow = { id: string; icon: ClayName; title: string; sub: string; frist?: boolean };

function Head({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
      <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: tokens.doneSoft, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: tokens.done }} />
      </View>
      <Txt size={12} weight={700} color={tokens.done} tracking={0.6}>MEMO</Txt>
    </View>
  );
}

/** What is coming, in order: the first year at a glance. */
export function PlanCard({ say, rows, more }: { say: string; rows: PlanRow[]; more: number }) {
  return (
    <View style={cardFrame}>
      <Head text="Memo" />
      <Txt size={15.5} line={21} style={{ paddingHorizontal: 14, paddingBottom: 6 }}>{say}</Txt>
      {rows.map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Tile bg="transparent" name={r.icon} size={36} radius={10} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} weight={600} numberOfLines={1}>{r.title}</Txt>
            <Txt size={12.5} color={r.frist ? tokens.done : tokens.sub} weight={r.frist ? 600 : 400} numberOfLines={1}>{r.sub}</Txt>
          </View>
        </View>
      ))}
      <Txt size={13} color={tokens.mute} style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 }}>{tx(`und ${more} weitere bis zum ersten Geburtstag`, `and ${more} more until the first birthday`)}</Txt>
    </View>
  );
}

export type TaskRow = { id: string; icon: ClayName; title: string; due: string; who?: PersonId };

/** The task list made from it. Once split, each row gets its person, one after another. */
export function TaskCard({ title, rows, split }: { title: string; rows: TaskRow[]; split: boolean }) {
  return (
    <View style={cardFrame}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
        <Txt size={16} weight={700}>{title}</Txt>
        <Txt size={12.5} color={tokens.sub}>{tx(`${rows.length} Aufgaben`, `${rows.length} tasks`)}</Txt>
      </View>
      {rows.map((r, i) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 5 }}>
          <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.hair }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} weight={500} numberOfLines={1}>{r.title}</Txt>
            <Txt size={12.5} color={tokens.sub} numberOfLines={1}>{r.due}</Txt>
          </View>
          <View style={{ width: 26, height: 26 }}>
            {split && r.who ? <PopIn delay={i * 140}><Avatar p={r.who} size={26} /></PopIn> : null}
          </View>
        </View>
      ))}
      <View style={{ height: 8 }} />
    </View>
  );
}

/** One spring with a small overshoot, like the stickers. */
function PopIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { if (!reduced) k.value = withDelay(delay, withSpring(1, { stiffness: 340, damping: 14, mass: 0.9 })); }, []);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value * 2), transform: [{ scale: k.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}
