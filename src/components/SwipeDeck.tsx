/**
 * "Wer kümmert sich?" card stack. Left = Julia, right = Tom, the clay stage
 * tints in that person's colour while dragging, release past the threshold
 * assigns. "Später" sends the card to the back. The app never suggests who
 * takes something (HANDOFF): the stack is neutral until a parent decides.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS, interpolate, interpolateColor, Extrapolation } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { ClayIcon } from './ui/Clay';
import { Avatar } from './ui/Person';
import { Meta } from './ui/kit';
import { tokens, persons, tint, springs } from '../theme';
import { haptics } from '../lib/haptics';
import type { Task } from '../state/types';
import type { PersonId } from '../theme';
import { Platform } from 'react-native';

type Dir = 'J' | 'T' | 'later';
type Props = {
  cards: Task[];
  onDecide: (id: string, d: Dir) => void;
  height?: number;
};

const cardShadow = Platform.select({
  web: { boxShadow: '0 18px 40px rgba(22,35,42,.12)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
});

export default function SwipeDeck({ cards, onDecide, height = 430 }: Props) {
  const [fling, setFling] = useState<{ dir: Dir; n: number } | null>(null);
  const top = cards[0];
  const back = cards.slice(1, 3);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ height, marginHorizontal: 6 }}>
        {back
          .slice()
          .reverse()
          .map((c, i, arr) => {
            const depth = arr.length - i; // 2 = furthest
            return (
              <View
                key={c.id}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30, overflow: 'hidden', backgroundColor: tokens.row,
                  opacity: depth === 2 ? 0.6 : 0.85,
                  transform: [{ translateY: depth === 2 ? 14 : 7 }, { rotate: depth === 2 ? '4deg' : '-3deg' }],
                }}
              >
                <View style={{ height: 210, backgroundColor: tint(c.icon), alignItems: 'center', justifyContent: 'center' }}>
                  <ClayIcon name={c.icon} size={150} />
                </View>
              </View>
            );
          })}
        {top ? <TopCard key={top.id} card={top} fling={fling} onDone={(d) => onDecide(top.id, d)} /> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 30 }}>
        <RoundAction label={persons.J.name} onPress={() => top && setFling({ dir: 'J', n: Date.now() })}><Avatar p="J" size={34} /></RoundAction>
        <RoundAction label="Später" onPress={() => top && setFling({ dir: 'later', n: Date.now() })}><LineIcon name="clock" size={24} /></RoundAction>
        <RoundAction label={persons.T.name} onPress={() => top && setFling({ dir: 'T', n: Date.now() })}><Avatar p="T" size={34} /></RoundAction>
      </View>
    </View>
  );
}

function RoundAction({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({ width: 64, height: 64, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
      >
        {children}
      </Pressable>
      <Txt size={13} color={tokens.sub}>{label}</Txt>
    </View>
  );
}

function TopCard({ card, fling, onDone }: { card: Task; fling: { dir: Dir; n: number } | null; onDone: (d: Dir) => void }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const enter = useSharedValue(0.96);
  const crossed = useSharedValue(0);
  const TH = 110;

  useEffect(() => { enter.value = withSpring(1, springs.smooth); }, []);

  const finish = useCallback((d: Dir) => { haptics.commit(); onDone(d); }, [onDone]);
  const tick = useCallback(() => haptics.select(), []);

  const flyTo = (d: Dir) => {
    'worklet';
    if (d === 'later') {
      y.value = withTiming(60, { duration: 200 });
      x.value = withTiming(0, { duration: 200 }, () => runOnJS(finish)(d));
      return;
    }
    const to = d === 'T' ? width * 1.3 : -width * 1.3;
    x.value = withTiming(to, { duration: 220 }, () => runOnJS(finish)(d));
  };

  // Buttons below the stack fling the same card.
  const lastFling = React.useRef<number | null>(null);
  useEffect(() => {
    if (!fling || fling.n === lastFling.current) return;
    lastFling.current = fling.n;
    if (fling.dir !== 'later') x.value = withTiming(fling.dir === 'T' ? 40 : -40, { duration: 90 }, () => flyTo(fling.dir));
    else flyTo('later');
  }, [fling]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.25;
      const c = x.value > TH ? 1 : x.value < -TH ? -1 : 0;
      if (c !== crossed.value) { crossed.value = c; if (c !== 0) runOnJS(tick)(); }
    })
    .onEnd((e) => {
      if (x.value > TH || e.velocityX > 900) flyTo('T');
      else if (x.value < -TH || e.velocityX < -900) flyTo('J');
      else { x.value = withSpring(0, springs.snapBack); y.value = withSpring(0, springs.snapBack); }
    });

  const cardStyle = useAnimatedStyle((): any => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-200, 0, 200], [-8, 0, 8])}deg` },
      { scale: enter.value },
    ],
  }));
  const base = tint(card.icon);
  const stage = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value, [-TH, 0, TH], [persons.J.tint, base, persons.T.tint]),
  }));
  const tagT = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, 80], [0, 1], Extrapolation.CLAMP) }));
  const tagJ = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-20, -80], [0, 1], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30, backgroundColor: tokens.row, overflow: 'hidden' }, cardShadow, cardStyle]}>
        <Animated.View style={[{ height: 210, alignItems: 'center', justifyContent: 'center' }, stage]}>
          <Tag p="T" style={[{ left: 14 }, tagT]} />
          <Tag p="J" style={[{ right: 14 }, tagJ]} />
          <ClayIcon name={card.icon} size={150} />
        </Animated.View>
        <View style={{ paddingVertical: 18, paddingHorizontal: 20, gap: 8 }}>
          {card.dueLabel ? <Meta color={card.frist ? tokens.frist : tokens.sub}>{card.dueLabel}</Meta> : null}
          <Txt size={24} line={30} weight={700} tracking={-0.5}>{card.title}</Txt>
          {card.text ? <Txt size={15} line={22} color={tokens.sub}>{card.text}</Txt> : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Tag({ p, style }: { p: PersonId; style: any }) {
  return (
    <Animated.View style={[{ position: 'absolute', top: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)' }, style]}>
      <Avatar p={p} size={22} />
      <Txt size={13.5} weight={600} color={persons[p].ink}>{persons[p].name}</Txt>
    </Animated.View>
  );
}
