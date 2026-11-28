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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { isInfoDay } from '../../lib/feiertage';
import { SectionLabel } from '../../components/ui/Group';
import { evFill } from '../../lib/evColor';
import { EvRow, Rows, Line } from './DayList';
import Txt from '../../components/ui/Txt';
import PressScale from '../../components/ui/PressScale';
import { tokens, springs } from '../../theme';
import { useStore, actions } from '../../state/store';
import { haptics } from '../../lib/haptics';
import { monthIdx, iso, MONTHS, MONTHS_SHORT, TODAY, dmShort, daysBetween } from '../../lib/dates';
import { isVacation } from '../../lib/urlaub';
import { useCalEvents } from '../../lib/useEvents';
import { tx } from '../../i18n/lang';
import type { CalEvent } from '../../state/types';

const yearOf = (d: string) => Number(d.slice(0, 4));

export function shiftYear(day: string, n: number): string {
  const y = yearOf(day) + n;
  // Back in the current year, land on today; elsewhere on New Year.
  return y === yearOf(TODAY) ? TODAY : `${y}-01-01`;
}

/** Urlaub: the soft green of the brand. */
const VAC = '#E7F4E6';

type Month = { n: number; dots: string[]; vac: boolean };

/** Per month: how many Termine, whose colours, and whether an Urlaub lies in it. */
function monthsOf(events: CalEvent[], y: number): Month[] {
  const out: Month[] = Array.from({ length: 12 }, () => ({ n: 0, dots: [], vac: false }));
  for (const e of events) {
    if (e.work || e.cal === 'feiertage' || isInfoDay(e)) continue;
    if (yearOf(e.date) !== y && yearOf(e.endDate ?? e.date) !== y) continue;
    const m = yearOf(e.date) === y ? monthIdx(e.date) : 0;
    if (isVacation(e)) { const last = yearOf(e.endDate ?? e.date) === y ? monthIdx(e.endDate ?? e.date) : 11; for (let k = m; k <= last; k++) out[k].vac = true; continue; }
    out[m].n++;
    const f = evFill(e);
    if (out[m].dots.length < 3 && !out[m].dots.includes(f)) out[m].dots.push(f);
  }
  return out;
}

/**
 * A month as a soft tile of the brand: its name, a bar for how much is on, the colours of who has something.
 * A month with an Urlaub lies on green. The running month's name is red, like today everywhere else.
 */
function Tile({ y, m, info, most, onPress }: { y: number; m: number; info: Month; most: number; onPress: () => void }) {
  const now = yearOf(TODAY) === y && monthIdx(TODAY) === m;
  const full = most ? Math.max(info.n ? 0.12 : 0, info.n / most) : 0;
  return (
    <View style={{ width: '33.333%', padding: 5 }}>
      <PressScale scale={0.96} onPress={onPress} accessibilityLabel={`${MONTHS[m]} ${y}`}
        style={{ height: 92, borderRadius: 16, paddingHorizontal: 14, paddingTop: 12, backgroundColor: info.vac ? VAC : tokens.group }}>
        <Txt size={15} line={20} weight={600} tracking={-0.18} color={now ? '#E5484D' : tokens.ink} numberOfLines={1}>{MONTHS_SHORT[m].replace('.', '')}</Txt>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: tokens.doneSoft, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(full * 100)}%`, height: 4, borderRadius: 2, backgroundColor: tokens.ink }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, height: 6 }}>
          {info.dots.map((c, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />)}
        </View>
      </PressScale>
    </View>
  );
}

export default function YearView() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const y = yearOf(day);
  const months = useMemo(() => monthsOf(events, y), [events, y]);
  const most = Math.max(...months.map((x) => x.n));

  // What the year still brings: Urlaube, Feiertage and Termine of more than one day.
  const ahead = useMemo(() => {
    const start = y === yearOf(TODAY) ? TODAY : `${y}-01-01`;
    const seen = new Set<string>();
    return events
      .filter((e) => !e.work && (e.endDate ?? e.date) >= start && e.date <= `${y}-12-31`)
      .filter((e) => e.cal !== 'feiertage' && !isInfoDay(e))
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
        <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }, slide]}>
          {months.map((info, m) => <Tile key={`${y}-${m}`} y={y} m={m} info={info} most={most} onPress={() => open(m)} />)}
        </Animated.View>
      </GestureDetector>
      <Txt size={14} line={20} color={tokens.sub} style={{ paddingTop: 10 }}>{tx('Balken zeigen, wie viel los ist. Grün markiert: Urlaub.', 'Bars show how busy a month is. Green marks a vacation.')}</Txt>
      <SectionLabel>{tx('Was das Jahr noch bringt', 'Still ahead this year')}</SectionLabel>
      {ahead.length ? (
        <Rows>
          {ahead.map((e, i) => {
            const days = e.endDate ? daysBetween(e.date, e.endDate) + 1 : 1;
            const note = days > 1 ? tx(`${days} Tage`, `${days} days`) : e.place ?? e.sub ?? '';
            return (
              <View key={e.id}>
                {i ? <Line /> : null}
                <EvRow e={e} day={e.date} label={dmShort(e.date)} note={note} />
              </View>
            );
          })}
        </Rows>
      ) : (
        <Txt size={14} line={20} color={tokens.sub}>{tx('Noch nichts Großes geplant. Sag Memo zum Beispiel: „Urlaub vom 3. bis 14. August“.', 'Nothing big planned yet. Tell Memo for example: "Vacation August 3 to 14".')}</Txt>
      )}
    </>
  );
}
