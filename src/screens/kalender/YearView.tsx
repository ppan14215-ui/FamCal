/**
 * Jahr: the child's first year as a ring (Canvas v36, row 6).
 * 1 Halten: the ring thickens (10 → 14, 160 ms), a handle appears on today,
 *   haptic tick. No new screen.
 * 2 Ziehen: the week number rolls along, every milestone gives a tick; the
 *   milestone under the thumb lifts as its clay object above the finger and is
 *   highlighted in the list.
 * 3 Loslassen: on a milestone it grows into a card (sheet). Anywhere else the
 *   handle springs back to today.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, FadeIn, FadeOut } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { H2, Meta } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { Tile } from '../../components/ui/Clay';
import Timeline from '../../components/Timeline';
import { tokens, springs } from '../../theme';
import { useStore, actions } from '../../state/store';
import { haptics } from '../../lib/haptics';
import { BEN_BORN, TODAY, daysBetween, addDays, dayNum, monthIdx, MONTHS, MONTHS_SHORT } from '../../lib/dates';
import type { Milestone } from '../../state/types';

const SIZE = 250;
const C = SIZE / 2;
const R = SIZE / 2 - 22;
const YEAR = 365;
const SNAP = 0.022;

// The ring starts at the birth (or due) date of the child from onboarding.
let BORN = BEN_BORN;
const fracOf = (date: string) => Math.max(0, Math.min(1, daysBetween(BORN, date) / YEAR));
const pt = (f: number) => {
  const a = -Math.PI / 2 + 2 * Math.PI * f;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
};
const arc = (from: number, to: number) => {
  if (to <= from) return '';
  const a = pt(from);
  const b = pt(Math.min(to, 0.9999));
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
};

function weekLabel(w: number) {
  const d = addDays(BORN, w * 7);
  const n = dayNum(d);
  const part = n <= 10 ? 'Anfang' : n <= 20 ? 'Mitte' : 'Ende';
  return `Woche · ${part} ${MONTHS[monthIdx(d)]}`;
}

export default function YearView() {
  const kid = useStore((s) => s.kid);
  BORN = kid?.born ?? kid?.due ?? BEN_BORN;
  const TODAY_F = fracOf(TODAY);
  const milestones = useStore((s) => s.milestones);
  const sorted = useMemo(() => [...milestones].sort((a, b) => a.date.localeCompare(b.date)), [milestones]);
  const marks = useMemo(() => sorted.map((m) => ({ id: m.id, f: fracOf(m.date) })), [sorted]);
  const upcoming = sorted.filter((m) => !m.done);

  const [active, setActive] = useState(false);
  const [week, setWeek] = useState<number | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [dragF, setDragF] = useState(TODAY_F);

  const thick = useSharedValue(10);
  const knobF = useSharedValue(TODAY_F);
  const knobOn = useSharedValue(0);
  const lastWeek = useSharedValue(-1);
  const lastNear = useSharedValue('');

  const onHold = useCallback(() => { haptics.select(); setActive(true); }, []);
  const onMove = useCallback((f: number, w: number, nid: string) => {
    setDragF(f);
    setWeek(w);
    setNear(nid || null);
    if (nid) haptics.select();
  }, []);
  const onWeek = useCallback((f: number, w: number) => { setDragF(f); setWeek(w); }, []);
  const onRelease = useCallback((nid: string) => {
    setActive(false);
    setWeek(null);
    setNear(null);
    setDragF(TODAY_F);
    if (nid) {
      haptics.commit();
      router.push(`/meilenstein/${nid}`);
    }
  }, []);

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      thick.value = withTiming(14, { duration: 160 });
      knobOn.value = withTiming(1, { duration: 160 });
      knobF.value = TODAY_F;
      lastWeek.value = -1;
      lastNear.value = '';
      scheduleOnRN(onHold);
    })
    .onUpdate((e) => {
      const a = Math.atan2(e.y - C, e.x - C);
      let f = (a + Math.PI / 2) / (2 * Math.PI);
      if (f < 0) f += 1;
      // Keep the handle from jumping across 12 o'clock.
      if (knobF.value > 0.8 && f < 0.2) f = 0.999;
      if (knobF.value < 0.2 && f > 0.8) f = 0;
      let nid = '';
      let snapF = f;
      // Snap to the nearest milestone, not the first one in range.
      let best = SNAP;
      for (let i = 0; i < marks.length; i++) {
        const d = Math.abs(marks[i].f - f);
        if (d < best) { best = d; nid = marks[i].id; snapF = marks[i].f; }
      }
      knobF.value = snapF;
      // Week of life counted from days, so the label matches the date.
      const w = Math.floor(Math.round(snapF * YEAR) / 7);
      if (nid !== lastNear.value) {
        lastNear.value = nid;
        lastWeek.value = w;
        scheduleOnRN(onMove, snapF, w, nid);
      } else if (w !== lastWeek.value) {
        lastWeek.value = w;
        scheduleOnRN(onWeek, snapF, w);
      }
    })
    .onFinalize(() => {
      const nid = lastNear.value;
      thick.value = withTiming(10, { duration: 160 });
      if (!nid) knobF.value = withSpring(TODAY_F, springs.smooth);
      knobOn.value = withTiming(0, { duration: 240 });
      scheduleOnRN(onRelease, nid);
      lastNear.value = '';
    });

  const knob = useAnimatedStyle((): any => {
    const a = -Math.PI / 2 + 2 * Math.PI * knobF.value;
    return {
      opacity: knobOn.value,
      transform: [{ translateX: C + R * Math.cos(a) - 15 }, { translateY: C + R * Math.sin(a) - 15 }, { scale: 0.6 + 0.4 * knobOn.value }],
    };
  });
  const ringW = useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }));

  const nearM = near ? sorted.find((m) => m.id === near) : null;
  const tipPos = nearM ? pt(fracOf(nearM.date)) : null;
  const sw = active ? 14 : 10;

  return (
    <>
      <View style={{ alignSelf: 'center', width: SIZE, height: SIZE, marginTop: nearM ? 8 : 0, zIndex: 2 }}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ width: SIZE, height: SIZE }, ringW]}>
            <Svg width={SIZE} height={SIZE}>
              <Circle cx={C} cy={C} r={R} fill="none" stroke={tokens.hair} strokeWidth={sw} />
              <Path d={arc(0, TODAY_F)} fill="none" stroke={tokens.done} strokeWidth={sw} strokeLinecap="round" />
              {active && dragF > TODAY_F ? <Path d={arc(TODAY_F, dragF)} fill="none" stroke={tokens.done} strokeOpacity={0.35} strokeWidth={sw} strokeLinecap="round" /> : null}
              {sorted.map((m) => {
                if (m.id === near) return null;
                const p = pt(fracOf(m.date));
                const past = m.done || m.date < TODAY;
                const col = past ? tokens.done : m.frist ? tokens.frist : tokens.mute;
                return <Circle key={m.id} cx={p.x} cy={p.y} r={7} fill={past ? col : '#FFFFFF'} stroke={col} strokeWidth={2.5} />;
              })}
            </Svg>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={40} line={46} weight={700} tracking={-1.5} style={{ fontVariant: ['tabular-nums'] }}>{String(week ?? Math.max(0, Math.floor(daysBetween(BORN, TODAY) / 7)))}</Txt>
              <Meta>{week !== null ? weekLabel(week) : BORN > TODAY ? `noch ${Math.ceil(daysBetween(TODAY, BORN) / 7)} Wochen` : 'Wochen alt'}</Meta>
            </View>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: tokens.ink }, knob]} />
          </Animated.View>
        </GestureDetector>
        {nearM && tipPos ? (
          <Animated.View
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(120)}
            pointerEvents="none"
            style={{ position: 'absolute', zIndex: 10, left: tipPos.x - 80, width: 160, top: tipPos.y > C + 20 ? tipPos.y + 20 : tipPos.y - 108, flexDirection: tipPos.y > C + 20 ? 'column-reverse' : 'column', alignItems: 'center', gap: 4 }}
          >
            <Tile name={nearM.icon} size={60} radius={18} />
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: tokens.ink }}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Geist_600SemiBold', fontSize: 12.5 }} numberOfLines={1}>{`${nearM.title} · ${dayNum(nearM.date)}. ${MONTHS_SHORT[monthIdx(nearM.date)]}`}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
      <Txt size={13} color={tokens.sub} center style={{ marginTop: -4 }}>Ring halten und ziehen, um durchs Jahr zu blättern.</Txt>
      <H2 right={`${23} im Jahr`}>Als Nächstes</H2>
      <View style={{ padding: 14, borderRadius: 24, backgroundColor: tokens.row }}>
        <Timeline items={upcoming} onToggle={actions.toggleMilestone} highlight={near} onPress={(m: Milestone) => router.push(`/meilenstein/${m.id}`)} />
      </View>
    </>
  );
}
