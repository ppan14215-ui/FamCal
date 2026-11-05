/**
 * The recipe card from the Dock (Dock.tsx RecipeCard, 28.10.: "Bolognese kochen") as a still picture
 * for the onboarding showcase: what to buy as ticked chips, what is at home struck through, and
 * "5 hinzufügen". Same look, but every state comes in as props (`off`, `pressed`), so a chapter can
 * play "one chip toggled off, then add" without the Dock's text fields or the real store.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import Txt from '../../ui/Txt';
import LineIcon from '../../ui/LineIcon';
import { Chip } from '../../ui/kit';
import { cardFrame } from '../../ChatCards';
import { tokens, motion, easing } from '../../../theme';
import { tx } from '../../../i18n/lang';

/** The assistant's line with its teal dot (Dock AppLine). */
export function AppLine({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: tokens.doneSoft, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: tokens.done }} />
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
        <Txt size={16} line={21} weight={600}>{text}</Txt>
        {sub ? <Txt size={13} line={18} color={tokens.sub}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

export type RecipePickProps = {
  dish: string;
  /** "4 Portionen". */
  servings?: string;
  picks: string[];
  /** Picks tapped away ("haben wir schon"). */
  off?: string[];
  have?: string[];
  /** Turning true presses the add button in once, and it springs back (like FakeComposer's arrow). */
  pressed?: boolean;
  /** Inside a chat card frame with padding (default), or bare. */
  framed?: boolean;
  /** Onboarding (Julian 05.11.): the chips can be tapped for real. Without these it stays a still picture. */
  onToggle?: (label: string) => void;
  onAdd?: () => void;
  onSkip?: () => void;
};

export default function RecipePick({ dish, servings, picks, off = [], have, pressed, framed = true, onToggle, onAdd, onSkip }: RecipePickProps) {
  const gone = new Set(off);
  const take = picks.filter((x) => !gone.has(x));
  const body = (
    <View style={{ gap: 12 }}>
      <AppLine
        text={picks.length ? tx(`${dish}${servings ? `, ${servings}` : ''}: Was fehlt euch?`, `${dish}${servings ? `, ${servings}` : ''}: what do you need?`) : tx(`Für ${dish} steht schon alles auf der Liste.`, `Everything for ${dish} is already on the list.`)}
        sub={tx('Tipp weg, was ihr schon habt. Lang drücken ändert.', 'Tap away what you already have. Long press to change.')}
      />
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 36 }}>
        {picks.map((x) => (onToggle ? <Pressable key={x} onPress={() => onToggle(x)} accessibilityRole="button"><PickChip label={x} on={!gone.has(x)} /></Pressable> : <PickChip key={x} label={x} on={!gone.has(x)} />))}
        <Chip height={36} icon={<LineIcon name="plus" size={13} color={tokens.ink} stroke={2.4} />}>{tx('Ergänzen', 'Add more')}</Chip>
      </View>
      {have?.length ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingLeft: 36 }}>
          <Txt size={13} color={tokens.sub}>{tx('Habt ihr schon:', 'Already at home:')}</Txt>
          {have.map((x) => (
            <View key={x} style={{ height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.chipBg, justifyContent: 'center' }}>
              <Txt size={13} color={tokens.mute} strike>{x}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable disabled={!onSkip} onPress={onSkip} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={15} weight={600}>{picks.length ? tx('Weglassen', 'Skip') : tx('Passt', 'Done')}</Txt>
        </Pressable>
        {picks.length ? (
          <Pressable disabled={!onAdd || !take.length} onPress={onAdd} style={{ flex: 1 }}>
            <AddButton n={take.length} pressed={!!pressed} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
  return framed ? <View style={[cardFrame, { padding: 14 }]}>{body}</View> : body;
}

/**
 * One pick. Both looks are drawn on top of each other at the same size, and turning it off cross fades
 * them (opacity only, motion.micro), so the chip never snaps and the row never jumps.
 */
function PickChip({ label, on }: { label: string; on: boolean }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => { v.value = withTiming(on ? 1 : 0, { duration: motion.micro, easing: easing.out }); }, [on]);
  const onSt = useAnimatedStyle(() => ({ opacity: v.value }));
  const offSt = useAnimatedStyle(() => ({ opacity: 1 - v.value }));
  return (
    <View style={{ height: 36 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }, offSt]}>
        <Txt size={13} weight={600} color={tokens.mute}>{label}</Txt>
      </Animated.View>
      <Animated.View style={[{ height: 36, paddingHorizontal: 10.5, borderRadius: 999, backgroundColor: tokens.doneSoft, borderWidth: 1.5, borderColor: tokens.done, flexDirection: 'row', alignItems: 'center', gap: 6 }, onSt]}>
        <LineIcon name="check" size={13} color={tokens.done} stroke={2.6} />
        <Txt size={13} weight={600} color={tokens.done}>{label}</Txt>
      </Animated.View>
    </View>
  );
}

/** "4 hinzufügen": presses in and comes back out when `pressed` turns true. */
function AddButton({ n, pressed }: { n: number; pressed: boolean }) {
  const k = useSharedValue(1);
  useEffect(() => {
    if (!pressed) return;
    k.value = withSequence(withTiming(0.97, { duration: motion.press, easing: easing.out }), withTiming(1, { duration: motion.micro, easing: easing.out }));
  }, [pressed]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return (
    <Animated.View style={[{ height: 44, borderRadius: 999, backgroundColor: n ? tokens.ink : tokens.chipBg, alignItems: 'center', justifyContent: 'center' }, st]}>
      <Txt size={15} weight={600} color={n ? tokens.onInk : tokens.mute}>{tx(`${n} hinzufügen`, `Add ${n}`)}</Txt>
    </Animated.View>
  );
}
