/**
 * "Wer kümmert sich?" card stack. Left = Julia, right = Tom, the clay stage
 * tints in that person's colour while dragging, release past the threshold
 * assigns. "Später" sends the card to the back. The app never suggests who
 * takes something (HANDOFF): the stack is neutral until a parent decides.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolate, interpolateColor, Extrapolation } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
import PressScale from './ui/PressScale';
import SourceLink from './SourceLink';

type Dir = 'J' | 'T' | 'later';
type Fling = { dir: Dir; id: string; n: number };
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
  const [fling, setFling] = useState<Fling | null>(null);
  // Cards decided by a swipe keep flying off on top while the next one is
  // already live (Namore: the vote fires at release, not after the fly-off).
  const [leaving, setLeaving] = useState<Task[]>([]);
  const top = cards[0];
  const back = cards.slice(1, 3);
  const live = top && !leaving.some((l) => l.id === top.id) ? top : undefined;

  const release = useCallback((card: Task, d: Dir) => {
    setFling(null);
    if (d !== 'later') setLeaving((l) => [...l, card]);
    onDecide(card.id, d);
  }, [onDecide]);
  const gone = useCallback((id: string) => setLeaving((l) => l.filter((c) => c.id !== id)), []);

  const press = (dir: Dir) => live && setFling({ dir, id: live.id, n: Date.now() });

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
                key={`b-${c.id}`}
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
        {(live ? [live, ...leaving] : leaving).map((c) => (
          <TopCard
            key={`t-${c.id}`}
            card={c}
            live={c === live}
            fling={c === live && fling?.id === c.id ? fling : null}
            onRelease={release}
            onGone={gone}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 30 }}>
        <RoundAction label={persons.J.name} onPress={() => press('J')}><Avatar p="J" size={34} /></RoundAction>
        <RoundAction label="Später" onPress={() => press('later')}><LineIcon name="clock" size={24} /></RoundAction>
        <RoundAction label={persons.T.name} onPress={() => press('T')}><Avatar p="T" size={34} /></RoundAction>
      </View>
    </View>
  );
}

function RoundAction({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <PressScale
        accessibilityLabel={label}
        onPress={onPress}
        scale={0.92}
        style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}
      >
        {children}
      </PressScale>
      <Txt size={13} color={tokens.sub}>{label}</Txt>
    </View>
  );
}

// Namore swipe deck values: 80 pt lock-in, a flick counts above 800 px/s
// once the card moved 30 pt, tilt never passes 15 degrees.
const LOCK = 80;
const FLICK_V = 800;
const FLICK_MIN = 30;
const FLY_MS = 220;

function TopCard({ card, live, fling, onRelease, onGone }: {
  card: Task; live: boolean; fling: Fling | null;
  onRelease: (card: Task, d: Dir) => void; onGone: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const enter = useSharedValue(0.96);
  const crossed = useSharedValue(0);

  useEffect(() => { enter.value = withSpring(1, springs.smooth); }, []);

  const decide = useCallback((d: Dir) => { haptics.commit(); onRelease(card, d); }, [onRelease, card]);
  const done = useCallback(() => onGone(card.id), [onGone, card.id]);
  // Past the lock-in the object plays its own story once (Julian 26.10.).
  const [armed, setArmed] = useState(false);
  const tick = useCallback((c: number) => { if (c !== 0) haptics.select(); setArmed(c !== 0); }, []);

  const flyTo = (d: Dir, v = 0) => {
    'worklet';
    if (d === 'later') {
      // "Später" moves the card to the back; it may come straight back as the
      // top card, so it springs home once the store has reordered.
      y.value = withTiming(60, { duration: 200 });
      x.value = withTiming(0, { duration: 200 }, () => {
        scheduleOnRN(decide, d);
        y.value = withSpring(0, springs.smooth);
      });
      return;
    }
    const to = d === 'T' ? width * 1.3 : -width * 1.3;
    // A fast flick leaves faster, never slower than the base fly-off.
    const dur = Math.abs(v) > 0 ? Math.max(120, Math.min(FLY_MS, (Math.abs(to - x.value) / Math.abs(v)) * 1000)) : FLY_MS;
    x.value = withTiming(to, { duration: dur }, () => scheduleOnRN(done));
    scheduleOnRN(decide, d);
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
    .enabled(live)
    .activeOffsetX([-15, 15])
    .failOffsetY([-30, 30])
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.25;
      const c = x.value > LOCK ? 1 : x.value < -LOCK ? -1 : 0;
      if (c !== crossed.value) { crossed.value = c; scheduleOnRN(tick, c); }
    })
    .onEnd((e) => {
      const flick = Math.abs(x.value) >= FLICK_MIN && Math.abs(e.velocityX) > FLICK_V;
      const right = x.value > LOCK || (flick && e.velocityX > 0);
      const left = x.value < -LOCK || (flick && e.velocityX < 0);
      if (right) flyTo('T', e.velocityX);
      else if (left) flyTo('J', e.velocityX);
      else {
        // Springs carry the release velocity so the card settles, not snaps.
        x.value = withSpring(0, { ...springs.snapBack, velocity: e.velocityX });
        y.value = withSpring(0, { ...springs.snapBack, velocity: e.velocityY * 0.25 });
      }
    });

  const cardStyle = useAnimatedStyle((): any => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-300, 0, 300], [-15, 0, 15], Extrapolation.CLAMP)}deg` },
      { scale: enter.value },
    ],
  }));
  const base = tint(card.icon);
  const stage = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value, [-LOCK, 0, LOCK], [persons.J.tint, base, persons.T.tint]),
  }));
  // The object rides along with the drag: it lags behind the card, leans into
  // the direction and lifts towards the lock-in, so the hand feels the weight.
  const object = useAnimatedStyle((): any => {
    const k = interpolate(Math.abs(x.value), [0, LOCK], [0, 1], Extrapolation.CLAMP);
    const e = 1 - Math.pow(1 - k, 3);
    return {
      transform: [
        { translateX: interpolate(x.value, [-300, 0, 300], [-26, 0, 26], Extrapolation.CLAMP) },
        { translateY: -10 * e },
        { rotate: `${interpolate(x.value, [-300, 0, 300], [12, 0, -12], Extrapolation.CLAMP)}deg` },
        { scale: 1 + 0.08 * e },
      ],
    };
  });
  const tagT = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, LOCK], [0, 1], Extrapolation.CLAMP) }));
  const tagJ = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-20, -LOCK], [0, 1], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        pointerEvents={live ? 'auto' : 'none'}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30, backgroundColor: tokens.row, overflow: 'hidden' }, cardShadow, cardStyle]}
      >
        <Animated.View style={[{ height: 210, alignItems: 'center', justifyContent: 'center' }, stage]}>
          <Tag p="T" style={[{ left: 14 }, tagT]} />
          <Tag p="J" style={[{ right: 14 }, tagJ]} />
          <Animated.View style={object}><ClayIcon name={card.icon} size={150} celebrate={armed} /></Animated.View>
        </Animated.View>
        <View style={{ paddingVertical: 18, paddingHorizontal: 20, gap: 8 }}>
          {card.dueLabel ? <Meta color={card.frist ? tokens.frist : tokens.sub}>{card.dueLabel}</Meta> : null}
          <Txt size={24} line={30} weight={700} tracking={-0.5}>{card.title}</Txt>
          {card.text ? <Txt size={15} line={22} color={tokens.sub}>{card.text}</Txt> : null}
          {card.url ? <SourceLink prefix="Direkt hin" s={{ label: card.url.replace(/^https:\/\//, '').split('/')[0], url: card.url }} /> : null}
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
