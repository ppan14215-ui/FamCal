/**
 * Jahr: the whole year at a glance (Julian 30.10.: the ring of the baby's first
 * year no longer fits the family calendar). Twelve small months like in the
 * Apple calendar, marked with what matters for a family: today, Feiertage,
 * Urlaub in the person's colour and a dot for every day with a Termin. A tap
 * on a month opens it, a swipe moves the year. Under the grid the year's
 * highlights that are still ahead: Urlaube, Feiertage and long Termine.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { H2, Group, Row } from '../../components/ui/kit';
import { isInfoDay } from '../../lib/feiertage';
import SwipeRow, { justSwiped } from '../../components/SwipeRow';
import { dropEvent } from './DayView';
import Txt from '../../components/ui/Txt';
import PressScale from '../../components/ui/PressScale';
import { tokens, persons, springs } from '../../theme';
import { useStore, actions } from '../../state/store';
import { haptics } from '../../lib/haptics';
import { addDays, monday, monthIdx, dayNum, iso, MONTHS, TODAY, dmShort, daysBetween } from '../../lib/dates';
import { isVacation } from '../../lib/urlaub';
import { useCalEvents } from '../../lib/useEvents';
import { tx } from '../../i18n/lang';
import type { CalEvent } from '../../state/types';
import { useYearLook } from '../../lib/look';
import { ClayIcon } from '../../components/ui/Clay';
import { glass, allColors } from '../../theme';

type Mark = { ev?: boolean; n?: number; hol?: boolean; vac?: string };

const yearOf = (d: string) => Number(d.slice(0, 4));

export function shiftYear(day: string, n: number): string {
  const y = yearOf(day) + n;
  // Back in the current year, land on today; elsewhere on New Year.
  return y === yearOf(TODAY) ? TODAY : `${y}-01-01`;
}

/** Every day of the year with what happens on it; multi-day Termine mark each day they cover. */
function marksFor(events: CalEvent[], y: number): Map<string, Mark> {
  const out = new Map<string, Mark>();
  const put = (d: string, m: Mark) => { const o = out.get(d); out.set(d, { ...o, ...m, n: (o?.n ?? 0) + (m.ev ? 1 : 0) }); };
  const from = `${y}-01-01`;
  const to = `${y}-12-31`;
  for (const e of events) {
    if (e.work) continue;
    const end = e.endDate ?? e.date;
    if (end < from || e.date > to) continue;
    const hol = e.cal === 'feiertage';
    const vac = isVacation(e) ? tokens.vac : undefined;
    for (let d = e.date < from ? from : e.date, i = 0; d <= end && d <= to && i < 370; d = addDays(d, 1), i++) {
      if (e.skipDates?.includes(d)) continue;
      put(d, hol ? { hol: true } : vac ? { vac, ev: true } : { ev: true });
    }
  }
  return out;
}

function Mini({ y, m, marks, onPress }: { y: number; m: number; marks: Map<string, Mark>; onPress: () => void }) {
  const first = iso(new Date(Date.UTC(y, m, 1)));
  const cells: (string | null)[] = [];
  for (let d = monday(first); cells.length < 42; d = addDays(d, 1)) cells.push(monthIdx(d) === m ? d : null);
  while (cells.length > 35 && cells.slice(-7).every((c) => !c)) cells.splice(-7, 7);
  const now = yearOf(TODAY) === y && monthIdx(TODAY) === m;
  return (
    <PressScale scale={0.96} onPress={onPress} accessibilityLabel={`${MONTHS[m]} ${y}`} style={{ width: '33.333%', paddingHorizontal: 4, paddingVertical: 6 }}>
      <Txt size={14} line={18} weight={700} color={now ? tokens.accent : tokens.ink} style={{ paddingLeft: 2, paddingBottom: 3 }}>{MONTHS[m]}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 17 }} />;
          const k = marks.get(d);
          const today = d === TODAY;
          const weekend = i % 7 >= 5;
          // Days gone by fade, so the eye lands on what is still ahead.
          const past = d < TODAY;
          return (
            <View key={d} style={{ width: `${100 / 7}%`, height: 17, alignItems: 'center', justifyContent: 'center', opacity: past ? (k?.vac ? 0.6 : 0.4) : 1,
              // Julian 04.11.: yellow looked odd; free days are outlined instead, one outline per Urlaub, open where it goes on.
              ...(k?.vac ? (() => {
                const first = i % 7 === 0 || !marks.get(addDays(d, -1))?.vac, last = i % 7 === 6 || !marks.get(addDays(d, 1))?.vac;
                return { borderColor: tokens.ink, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderLeftWidth: first ? 1.2 : 0, borderRightWidth: last ? 1.2 : 0,
                  borderTopLeftRadius: first ? 8 : 0, borderBottomLeftRadius: first ? 8 : 0, borderTopRightRadius: last ? 8 : 0, borderBottomRightRadius: last ? 8 : 0 };
              })() : null) }}>
              {/* Heatmap: the fuller the day, the deeper the teal behind its number. */}
              {k?.n && !today && !k.vac ? <View style={{ position: 'absolute', width: 15, height: 15, borderRadius: 8, backgroundColor: tokens.done, opacity: Math.min(0.5, 0.12 + (k.n - 1) * 0.13) }} /> : null}
              <View style={{ width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? tokens.accent : 'transparent' }}>
                <Txt size={8.5} line={10} weight={today || k?.ev || k?.hol ? 700 : 500} color={today ? '#FFFFFF' : k?.hol ? tokens.frist : weekend && !k?.vac ? tokens.mute : tokens.ink}>{String(dayNum(d))}</Txt>
              </View>
            </View>
          );
        })}
      </View>
    </PressScale>
  );
}

// The season's colour and clay icon of each month, from the earth colours of Ton & Papier.
const SEASON: { color: string; icon: 'schnee' | 'weihnachten' | 'fruehling' | 'strand' | 'herbst' }[] = [
  { color: 'E-Blau', icon: 'schnee' }, { color: 'E-Blau', icon: 'schnee' },
  { color: 'E-Salbei', icon: 'fruehling' }, { color: 'E-Salbei', icon: 'fruehling' }, { color: 'E-Salbei', icon: 'fruehling' },
  { color: 'E-Ocker', icon: 'strand' }, { color: 'E-Ocker', icon: 'strand' }, { color: 'E-Ocker', icon: 'strand' },
  { color: 'E-Terrakotta', icon: 'herbst' }, { color: 'E-Terrakotta', icon: 'herbst' }, { color: 'E-Terrakotta', icon: 'herbst' },
  { color: 'E-Blau', icon: 'weihnachten' },
];

/**
 * A month as a coloured tile (Julian 17.11.: white boxes are boring, "das funktioniert nur, wenn wir den farbigen Stil
 * aus dem ursprünglichen Konzept verwenden"): the season's colour, its name, and what stands out in it: an Urlaub or a
 * Feiertag by name, otherwise how much is on, and the season's clay icon at 48 dp. The running month wears an ink ring.
 */
function Tile({ y, m, events, onPress }: { y: number; m: number; events: CalEvent[]; onPress: () => void }) {
  const from = iso(new Date(Date.UTC(y, m, 1))), to = iso(new Date(Date.UTC(y, m + 1, 0)));
  const inMonth = events.filter((e) => !e.work && (e.endDate ?? e.date) >= from && e.date <= to);
  const vac = inMonth.find(isVacation);
  const hol = inMonth.filter((e) => e.cal === 'feiertage' && e.date >= from).sort((a, b) => a.date.localeCompare(b.date))[0];
  const n = inMonth.filter((e) => e.cal !== 'feiertage' && !isVacation(e) && e.date >= from).length;
  const now = yearOf(TODAY) === y && monthIdx(TODAY) === m;
  const c = allColors.find((x) => x.name === SEASON[m].color)!;
  const mark = vac ?? hol;
  const count = n ? tx(`${n} ${n === 1 ? 'Termin' : 'Termine'}`, `${n} ${n === 1 ? 'thing' : 'things'}`) : '';
  return (
    <View style={{ width: '33.333%', padding: 5 }}>
      <PressScale scale={0.96} onPress={onPress} accessibilityLabel={`${MONTHS[m]} ${y}`}
        style={[{ height: 132, borderRadius: 24, padding: 14, overflow: 'hidden' }, glass.lift, { backgroundColor: c.bg }, now ? { borderWidth: 2.5, borderColor: tokens.ink, padding: 11.5 } : null]}>
        <Txt size={20} line={24} weight={600} color={c.fg} numberOfLines={1}>{MONTHS[m]}</Txt>
        <Txt size={12.5} line={16} color={c.fg} numberOfLines={1} style={{ marginTop: 2, opacity: 0.85 }}>{mark ? mark.title : count || tx('noch frei', 'still free')}</Txt>
        {mark && count ? <Txt size={12.5} line={16} color={c.fg} numberOfLines={1} style={{ opacity: 0.7 }}>{count}</Txt> : null}
        <View pointerEvents="none" style={{ position: 'absolute', right: 8, bottom: 8 }}><ClayIcon name={(vac && vac.icon) || SEASON[m].icon} size={48} /></View>
      </PressScale>
    </View>
  );
}

export default function YearView() {
  const cards = useYearLook() === 'kacheln';
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const y = yearOf(day);
  const marks = useMemo(() => marksFor(events, y), [events, y]);

  // What the year still brings: Urlaube, Feiertage and Termine of more than one day.
  const ahead = useMemo(() => {
    const start = y === yearOf(TODAY) ? TODAY : `${y}-01-01`;
    const seen = new Set<string>();
    return events
      .filter((e) => !e.work && (e.endDate ?? e.date) >= start && e.date <= `${y}-12-31`)
      .filter((e) => e.cal === 'feiertage' || isVacation(e) || (!!e.endDate && e.endDate > e.date))
      .filter((e) => { const k = `${e.title}|${e.date}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events, y]);

  const W = useSharedValue(360);
  const x = useSharedValue(0);
  const go = (dir: number) => { haptics.select(); actions.setCalDay(shiftYear(day, dir)); };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => { x.value = e.translationX * 0.6; })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > W.value * 0.22 || Math.abs(e.velocityX) > 700) {
        const dir = e.translationX < 0 ? 1 : -1;
        x.value = withTiming(-dir * W.value * 0.5, { duration: 130 }, (f) => {
          if (!f) return;
          scheduleOnRN(go, dir);
          x.value = dir * W.value * 0.35;
          x.value = withSpring(0, springs.smooth);
        });
      } else {
        x.value = withSpring(0, springs.snapBack);
      }
    });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const open = (m: number) => {
    haptics.select();
    const now = yearOf(TODAY) === y && monthIdx(TODAY) === m;
    actions.setCalDay(now ? TODAY : iso(new Date(Date.UTC(y, m, 1))));
    actions.setCalView('monat');
  };

  return (
    <>
      <GestureDetector gesture={pan} touchAction="pan-y">
        <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }, slide]}>
          {Array.from({ length: 12 }, (_, m) => cards ? <Tile key={`${y}-${m}`} y={y} m={m} events={events} onPress={() => open(m)} /> : <Mini key={`${y}-${m}`} y={y} m={m} marks={marks} onPress={() => open(m)} />)}
        </Animated.View>
      </GestureDetector>
      {cards ? null : <Legend />}
      <H2>{tx('Was das Jahr noch bringt', 'Still ahead this year')}</H2>
      {ahead.length ? (
        <Group>
          {ahead.map((e) => {
            const days = e.endDate ? daysBetween(e.date, e.endDate) + 1 : 1;
            const when = days > 1 ? tx(`${dmShort(e.date)} bis ${dmShort(e.endDate!)} · ${days} Tage`, `${dmShort(e.date)} to ${dmShort(e.endDate!)} · ${days} days`) : dmShort(e.date);
            const inDays = daysBetween(TODAY, e.date);
            const sub = inDays > 0 ? tx(`${when} · in ${inDays} Tagen`, `${when} · in ${inDays} days`) : when;
            if (e.cal === 'feiertage' || isInfoDay(e)) return <Row key={e.id} icon={e.icon} title={e.title} sub={sub} onPress={e.cal === 'feiertage' ? undefined : () => router.push(`/termin/${e.id}`)} />;
            // Swipe left deletes, like in Tage (Julian 31.10. 18:21).
            return <SwipeRow key={e.id} onDelete={() => dropEvent(e)}><Row icon={e.icon} title={e.title} sub={sub} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} /></SwipeRow>;
          })}
        </Group>
      ) : (
        <Txt size={14} color={tokens.sub}>{tx('Noch nichts Großes geplant. Sag zum Beispiel: „Urlaub vom 3. bis 14. August“.', 'Nothing big planned yet. Try: "Vacation August 3 to 14".')}</Txt>
      )}
    </>
  );
}

function Legend() {
  const item = (dot: React.ReactNode, label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>{dot}<Txt size={12} color={tokens.sub}>{label}</Txt></View>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 2 }}>
      {item(<View style={{ flexDirection: 'row', gap: 2 }}>{[0.12, 0.25, 0.5].map((o) => <View key={o} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.done, opacity: o }} />)}</View>, tx('wenig bis viel los', 'quiet to busy'))}
      {item(<Txt size={12} weight={700} color={tokens.frist}>12</Txt>, tx('Feiertag', 'Holiday'))}
      {item(<View style={{ width: 14, height: 10, borderRadius: 5, borderWidth: 1.2, borderColor: tokens.ink }} />, tx('Urlaub', 'Vacation'))}
    </View>
  );
}
