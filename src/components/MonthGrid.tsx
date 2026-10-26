/**
 * Month grid under the Schreibzeile (Canvas Zeile 7). The choice is a ring,
 * never dark. Dots show real events in the person's colour; work blocks get
 * none. Two taps make a range, drawn as a grey band.
 */
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens, swapIn } from '../theme';
import { TODAY, MONTHS, addDays, weekday, dayNum, monthIdx, year } from '../lib/dates';
import { haptics } from '../lib/haptics';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const BAND = '#EFEFEC';

/** First day of the month containing the date. */
export const firstOf = (d: string) => `${d.slice(0, 8)}01`;
export const shiftMonth = (first: string, n: number) => {
  const y = year(first); const m = monthIdx(first) + n;
  const yy = y + Math.floor(m / 12); const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
};

type Props = {
  month: string;
  onMonth: (first: string) => void;
  date?: string;
  endDate?: string;
  dots?: Record<string, string[]>;
  /** Days after this are grey and cannot be picked (birth dates). */
  max?: string;
  onPick: (d: string) => void;
};

export default function MonthGrid({ month, onMonth, date, endDate, dots = {}, max, onPick }: Props) {
  const lead = (weekday(month) + 6) % 7;
  const start = addDays(month, -lead);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const rows = Array.from({ length: 6 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const inMonth = (d: string) => monthIdx(d) === monthIdx(month);
  const canNext = !max || shiftMonth(month, 1) <= max;

  return (
    <View style={{ gap: 6, paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Txt size={15} weight={600}>{`${MONTHS[monthIdx(month)]} ${year(month)}`}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Arrow icon="back" label="Monat zurück" onPress={() => onMonth(shiftMonth(month, -1))} />
          <Arrow icon="chev" label="Monat vor" disabled={!canNext} onPress={() => onMonth(shiftMonth(month, 1))} />
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WD.map((w) => <Txt key={w} size={12} weight={600} color={tokens.sub} center style={{ flex: 1 }}>{w}</Txt>)}
      </View>
      <Animated.View key={month} entering={swapIn}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((d, c) => {
              const off = !inMonth(d) || (!!max && d > max);
              const ring = d === date || d === endDate;
              const inBand = !!endDate && !!date && d >= date && d <= endDate;
              const today = d === TODAY;
              const ds = today ? [tokens.ink] : dots[d] ?? [];
              return (
                <View key={d} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  {inBand ? (
                    <View style={{ position: 'absolute', top: 2, bottom: 2, left: d === date && c !== 0 ? '50%' : 0, right: d === endDate && c !== 6 ? '50%' : 0, backgroundColor: BAND }} />
                  ) : null}
                  <PressScale
                    accessibilityLabel={`${dayNum(d)}. ${MONTHS[monthIdx(d)]}`}
                    accessibilityState={{ selected: ring, disabled: off }}
                    disabled={!!max && d > max}
                    scale={0.88}
                    onPress={() => { haptics.select(); onPick(d); }}
                    style={{ width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: ring ? tokens.row : 'transparent', borderWidth: ring ? 1.5 : 0, borderColor: tokens.ink }}
                  >
                    <Txt size={15} line={17} weight={today ? 700 : 500} color={off ? tokens.mute : tokens.ink}>{String(dayNum(d))}</Txt>
                    <View style={{ flexDirection: 'row', gap: 2, height: 4 }}>
                      {ds.slice(0, 3).map((col, i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: col }} />)}
                    </View>
                  </PressScale>
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function Arrow({ icon, label, onPress, disabled }: { icon: 'back' | 'chev'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressScale accessibilityLabel={label} disabled={disabled} scale={0.9} onPress={() => { haptics.select(); onPress(); }} style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <LineIcon name={icon} size={16} color={tokens.sub} />
    </PressScale>
  );
}
