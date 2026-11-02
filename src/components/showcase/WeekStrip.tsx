/**
 * Seven days over the showcase chat, so a Termin is seen to land on its day (pattern 7 from Julian's
 * collection: the card travels to its day, and the same motion shows a move). Grey dots are what the
 * demo family already has that day; the Termin's own tile rises onto its day when it is made and
 * travels along the strip when it is moved (critically damped, no overshoot). Reads the demo store.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Txt from '../ui/Txt';
import { Tile } from '../ui/Clay';
import { useStore } from '../../state/store';
import { addDays, dayNum, weekday } from '../../lib/dates';
import type { ClayName } from '../../lib/clayIcons';
import { tokens, motion, easing } from '../../theme';
import { tx } from '../../i18n/lang';

/** Critically damped (motion-design rule 2): ζ = 26 / (2·√170) ≈ 1. */
export const CRIT = { stiffness: 170, damping: 26, mass: 1 };

const WD_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const T = 26;

export default function WeekStrip({ today, tile, icon, skip }: { today: string; /** The day the tile sits on; none yet before it is made. */ tile?: string; icon: ClayName; /** Event id the tile stands for, left out of the dots. */ skip?: string }) {
  const events = useStore((s) => s.events);
  const days = Array.from({ length: 7 }, (_, k) => addDays(today, k));
  const [w, setW] = useState(0);
  const col = w / 7;
  const idx = tile ? days.indexOf(tile) : -1;
  const x = useSharedValue(0);
  // Already on its day when the strip mounts (chapter 3 starts there): no entrance.
  const shown = useSharedValue(idx >= 0 ? 1 : 0);
  const placed = useRef(false);
  useEffect(() => {
    if (!w || idx < 0) return;
    const to = idx * col + (col - T) / 2;
    if (!placed.current) {
      placed.current = true;
      x.value = to;
      // Entrances come from below, with easing out.
      shown.value = withTiming(1, { duration: motion.base, easing: easing.out });
      return;
    }
    x.value = withSpring(to, CRIT);
  }, [idx, w]);
  const st = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value }, { translateY: (1 - shown.value) * 10 }] as any }));
  const dots = (day: string) => Math.min(3, events.filter((e) => e.id !== skip && !e.work && (e.date === day || (e.endDate && e.date <= day && e.endDate >= day))).length);
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 2, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: tokens.hair }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row' }}>
        {days.map((day, k) => (
          <View key={day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Txt size={12} weight={k ? 500 : 600} color={k ? tokens.sub : tokens.done}>{`${tx(WD_DE[weekday(day)], WD_EN[weekday(day)])} ${dayNum(day)}`}</Txt>
            <View style={{ height: T, flexDirection: 'row', gap: 3, alignItems: 'center' }}>
              {Array.from({ length: dots(day) }).map((_, j) => <View key={j} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.dotOff }} />)}
            </View>
          </View>
        ))}
        {w > 0 && (idx >= 0 || placed.current) ? (
          <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0 }, st]}>
            <Tile name={icon} size={T} radius={8} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
