/**
 * Kalender · Woche: hour grid 8 to 19, work as stripes, events as tinted blocks.
 * Swipe sideways for the week before or after; pinch, or plus and minus, to
 * zoom the hours (Julian 27.10.). Zoomed in, blocks show their time; all the
 * way in, three days fill the width with whole titles.
 */
import React, { useMemo, useState, useRef } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import LineIcon from '../../components/ui/LineIcon';
import { haptics } from '../../lib/haptics';
import { springs } from '../../theme';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import Stripes from '../../components/Stripes';
import { tokens, tint, PersonId, persons } from '../../theme';
import { useStore, actions } from '../../state/store';
import { addDays, monday, dayNum, WD_SHORT, weekday, minutes, TODAY, MONTHS_SHORT, monthIdx, hm, dmShort } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';
import { tx } from '../../i18n/lang';

const FROM = 8;
const TO = 19;
const HP_MIN = 30;
const HP_MAX = 96;
const ZOOMS = [30, 40, 60, 96];

const SHORT: Record<string, string> = { 'U6 bei Dr. Weber': 'U6', 'Bürgeramt: Pass': 'Pass', 'Oma Renate kommt': 'Oma', 'Rückbildung': 'Kurs', 'Hebamme Sarah': 'Hebi', 'Wochenmarkt': 'Markt', 'Zoo mit Lena': 'Zoo' };

export default function WeekView() {
  const day = useStore((s) => s.calDay);
  const events = useStore((s) => s.events);
  const [HP, setHP] = useState(40);
  // Zoomed all the way in, three days fill the width so whole titles fit.
  const n = HP >= 80 ? 3 : 7;
  const start = n === 7 ? monday(day) : addDays(day, -1);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => addDays(start, i)), [start, n]);
  const hours = Array.from({ length: TO - FROM }, (_, i) => FROM + i);
  const big = HP >= 60;
  const wide = n === 3;

  // Zoom: pinch with two fingers, or the plus and minus buttons.
  const base = useRef(HP);
  const zoomTo = (v: number) => setHP(Math.round(Math.max(HP_MIN, Math.min(HP_MAX, v))));
  const pinchStart = () => { base.current = HP; };
  const pinchMove = (scale: number) => zoomTo(base.current * scale);
  const step = (dir: 1 | -1) => {
    haptics.select();
    const next = dir > 0 ? ZOOMS.find((z) => z > HP) : [...ZOOMS].reverse().find((z) => z < HP);
    if (next) setHP(next);
  };

  // Swipe: the grid follows the finger, then the next week slides in from the side.
  const w = useSharedValue(360);
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  const go = (dir: number) => {
    haptics.select();
    actions.setCalDay(addDays(day, dir * n));
  };
  // Out to one side, swap the week, in from the other.
  const slideTo = (dir: number, ms: number) => {
    'worklet';
    x.value = withTiming(-dir * w.value * 0.6, { duration: ms }, (f) => {
      if (!f) return;
      scheduleOnRN(go, dir);
      x.value = dir * w.value * 0.4;
      op.value = 0.3;
      x.value = withSpring(0, springs.smooth);
      op.value = withTiming(1, { duration: 220 });
    });
  };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => { x.value = e.translationX; op.value = 1 - Math.min(0.5, Math.abs(e.translationX) / w.value); })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > w.value * 0.22 || Math.abs(e.velocityX) > 700;
      if (far) {
        slideTo(e.translationX < 0 ? 1 : -1, 140);
      } else {
        x.value = withSpring(0, springs.snapBack);
        op.value = withTiming(1, { duration: 160 });
      }
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { scheduleOnRN(pinchStart); })
    .onUpdate((e) => { scheduleOnRN(pinchMove, e.scale); });
  const gestures = Gesture.Simultaneous(pan, pinch);
  const slide = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }] }));
  const end = addDays(start, n - 1);
  const label = `${dmShort(start)} ${tx('bis', 'to')} ${dmShort(end)}`;
  // Times outside the grid sit at its edge instead of disappearing.
  const top = (t: string) => ((Math.max(FROM * 60, Math.min(TO * 60 - 30, minutes(t))) - FROM * 60) / 60) * HP;

  const round = { width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressScale accessibilityLabel={tx('Vorige Woche', 'Previous week')} onPress={() => slideTo(-1, 160)} style={round}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><LineIcon name="chev" size={16} color={tokens.ink} /></View>
        </PressScale>
        <Txt size={15} weight={600} style={{ flex: 1, textAlign: 'center' }}>{label}</Txt>
        <PressScale accessibilityLabel={tx('Nächste Woche', 'Next week')} onPress={() => slideTo(1, 160)} style={round}>
          <LineIcon name="chev" size={16} color={tokens.ink} />
        </PressScale>
      </View>
      <GestureDetector gesture={gestures} touchAction="pan-y">
      <View onLayout={(e: LayoutChangeEvent) => { w.value = e.nativeEvent.layout.width; }} style={{ borderRadius: 24, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <Animated.View style={[{ paddingTop: 12, paddingHorizontal: 10, paddingBottom: 10, gap: 10 }, slide]}>
        <View style={{ flexDirection: 'row', paddingLeft: 22 }}>
          {days.map((d) => {
            const sel = d === day;
            return (
              <PressScale key={d} onPress={() => { actions.setCalDay(d); actions.setCalView('tag'); }} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Txt size={11.5} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
                <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: sel ? tokens.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={15} weight={600} color={sel ? '#FFFFFF' : d === TODAY ? tokens.done : tokens.ink}>{String(dayNum(d))}</Txt>
                </View>
              </PressScale>
            );
          })}
        </View>
        <View style={{ paddingLeft: 22, height: hours.length * HP }}>
          {hours.map((h, i) => (
            <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HP }}>
              <View style={{ position: 'absolute', left: 22, right: 0, height: 1, backgroundColor: tokens.hair }} />
              <Txt size={10.5} line={14} color={tokens.mute} style={{ position: 'absolute', left: 0, top: -7 }}>{String(h)}</Txt>
            </View>
          ))}
          <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {days.map((d) => {
              const list = events.filter((e) => e.date === d);
              return (
                <View key={d} style={{ flex: 1, position: 'relative' }}>
                  {list.filter((e) => e.work).map((e) => (
                    <Stripes key={e.id} p={(e.who === 'J' ? 'J' : 'T') as PersonId} radius={8} style={{ position: 'absolute', left: 1, right: 1, top: top(e.start), height: top(e.end ?? e.start) - top(e.start), opacity: 0.9 }} />
                  ))}
                  {list.filter((e) => !e.work).map((e) => {
                    const h = Math.max(28, (e.end && top(e.end) > top(e.start) ? top(e.end) - top(e.start) : HP * 0.8) - 4);
                    return (
                      <PressScale
                        key={e.id}
                        onPress={() => router.push(`/termin/${e.id}`)}
                        style={{ position: 'absolute', left: 3, right: 3, top: top(e.start) + 2, height: h, borderRadius: 8, backgroundColor: tint(e.icon), borderWidth: 1.5, borderColor: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 4, overflow: 'hidden' }}
                      >
                        <Txt size={wide ? 12.5 : 10.5} line={wide ? 16 : 13} weight={700} numberOfLines={wide ? Math.max(1, Math.floor(h / 17) - 1) : 2}>{wide ? e.title : SHORT[e.title] ?? e.title.split(' ')[0]}</Txt>
                        {big && h >= 44 && !e.allDay ? <Txt size={wide ? 12 : 10} line={wide ? 15 : 12} color={tokens.sub} numberOfLines={1}>{wide && e.end ? `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}` : hm(e.start)}</Txt> : null}
                      </PressScale>
                    );
                  })}
                  {d === TODAY ? <View style={{ position: 'absolute', left: -2, right: -2, top: top('08:50'), height: 2, backgroundColor: tokens.done }} /> : null}
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
      </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {(['T', 'J'] as PersonId[]).map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Stripes p={p} radius={4} style={{ width: 18, height: 12 }} />
            <Txt size={13} color={tokens.sub}>{tx(`${persons[p].name} arbeitet`, `${persons[p].name} at work`)}</Txt>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <PressScale accessibilityLabel={tx('Kleiner', 'Smaller')} onPress={() => step(-1)} style={[round, { opacity: HP <= HP_MIN ? 0.4 : 1 }]}>
          <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: tokens.ink }} />
        </PressScale>
        <PressScale accessibilityLabel={tx('Größer', 'Larger')} onPress={() => step(1)} style={[round, { opacity: HP >= HP_MAX ? 0.4 : 1 }]}>
          <LineIcon name="plus" size={16} color={tokens.ink} stroke={2} />
        </PressScale>
      </View>
    </>
  );
}
