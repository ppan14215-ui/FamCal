/**
 * One onboarding step (storyboard 01.11.2026): a thin story bar on top, Memo,
 * one big line, one lead line, the content, and the buttons at the bottom.
 * Every step says one thing and asks for one action.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Screen, RoundButton } from '../ui/kit';
import Txt, { Dot } from '../ui/Txt';
import { tokens } from '../../theme';
import { goBack } from '../../lib/nav';
import { tx } from '../../i18n/lang';
import Memo, { type MemoAct } from './Memo';

/** The steps after sign-in, in order. Hallo comes before and has no bar. */
export const STEPS = ['familie', 'termin', 'einkauf', 'kalender', 'partner', 'fertig'] as const;

export function StoryBar({ i, n = STEPS.length }: { i: number; n?: number }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityLabel={tx(`Schritt ${i + 1} von ${n}`, `Step ${i + 1} of ${n}`)}>
      {Array.from({ length: n }).map((_, k) => <Seg key={k} on={k <= i} />)}
    </View>
  );
}

function Seg({ on }: { on: boolean }) {
  const w = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { w.value = withTiming(on ? 1 : 0, { duration: 420 }); }, [on]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: tokens.dotOff, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: tokens.ink }, fill]} />
    </View>
  );
}

type Props = {
  step: number;
  title: string;
  lead?: string;
  /** null hides Memo when the step draws it itself. */
  memo?: MemoAct | null;
  memoBeat?: number;
  footer: React.ReactNode;
  children?: React.ReactNode;
  back?: boolean;
  bg?: string;
};

export default function Step({ step, title, lead, memo = 'idle', memoBeat, footer, children, back = true, bg }: Props) {
  return (
    <Screen bg={bg} gap={18} footer={footer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 40 }}>
        {back ? <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={goBack} /> : <View style={{ width: 40 }} />}
        <StoryBar i={step} />
        <View style={{ width: 40 }} />
      </View>
      <View style={{ gap: 10, paddingTop: 6 }}>
        {memo ? <Memo act={memo} beat={memoBeat} size={76} style={{ marginLeft: -4 }} /> : null}
        <Txt size={34} line={40} weight={700} tracking={-1}>{title}<Dot /></Txt>
        {lead ? <Txt size={17} line={24} color={tokens.sub}>{lead}</Txt> : null}
      </View>
      {children}
    </Screen>
  );
}
