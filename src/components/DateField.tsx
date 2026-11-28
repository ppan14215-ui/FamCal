/**
 * An exact day: birth date or due date (Julian 26.10.: "beim Geburtsdatum
 * geht es immer um ein genaues Datum", years back must be one tap away).
 * Typing "14.9.2022" is the fast way. tx('Kalender', 'Calendar') shows year, month and day at
 * once, so four years back is three taps, never 48 arrow presses. The device
 * remembers which of the two was used last, like the Wann line.
 */
import React, { useState } from 'react';
import { View, TextInput, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { Meta } from './ui/kit';
import MonthGrid, { firstOf } from './MonthGrid';
import { tokens, fonts, rise, swapIn } from '../theme';
import { TODAY, MONTHS, MONTHS_SHORT, monthIdx, year, dayNum, dayMonth, long } from '../lib/dates';
import { parseDay } from '../lib/day';
import { getPref, setPref } from '../lib/prefs';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

type Props = {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  /** Birth date: no day after today, years go back. Due date: from today on. */
  past?: boolean;
  right?: React.ReactNode;
  /** A sentence after the date ("Ella ist 6 Wochen alt."). */
  extra?: (iso: string) => string | undefined;
};

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export default function DateField({ label, value, onChange, past, right, extra }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'cal'>('text');
  const [text, setText] = useState('');
  const ty = year(TODAY);
  const [y, setY] = useState(value ? year(value) : ty);
  const [m, setM] = useState(value ? monthIdx(value) : monthIdx(TODAY));

  const parsed = text.trim() ? parseDay(text, { past }) : null;
  const wrongSide = !!parsed && (past ? parsed > TODAY : parsed < TODAY);
  const shown = mode === 'text' && text.trim() ? (wrongSide ? null : parsed) : value;

  const begin = () => {
    haptics.select();
    setMode(getPref('wann') === 'cal' ? 'cal' : 'text');
    setText(value ? `${dayNum(value)}.${monthIdx(value) + 1}.${year(value)}` : '');
    if (value) { setY(year(value)); setM(monthIdx(value)); }
    setOpen(true);
  };
  const close = () => { setOpen(false); setText(''); };
  const switchTo = (k: 'text' | 'cal') => {
    haptics.select();
    setPref('wann', k);
    if (k === 'text') setText(value ? `${dayNum(value)}.${monthIdx(value) + 1}.${year(value)}` : '');
    setMode(k);
  };
  const onText = (t: string) => {
    setText(t);
    const d = t.trim() ? parseDay(t, { past }) : null;
    if (d && !(past ? d > TODAY : d < TODAY)) { onChange(d); setY(year(d)); setM(monthIdx(d)); }
  };
  // Year and month keep the chosen day where it exists (31. → 30.).
  const keepDay = (yy: number, mm: number) => {
    if (!value) return;
    const d = `${yy}-${pad(mm + 1)}-${pad(Math.min(dayNum(value), lastDay(yy, mm)))}`;
    if (past ? d <= TODAY : d >= TODAY) onChange(d);
  };
  const pickYear = (yy: number) => { haptics.select(); setY(yy); keepDay(yy, m); };
  const pickMonth = (mm: number) => { haptics.select(); setM(mm); keepDay(y, mm); };
  const pickDay = (d: string) => { haptics.commit(); onChange(d); setTimeout(close, 180); };

  // Birth dates reach back 18 years, due dates one year ahead.
  const years = past ? Array.from({ length: 19 }, (_, i) => ty - i) : [ty, ty + 1];
  const monthOk = (mm: number) => {
    const first = `${y}-${pad(mm + 1)}-01`;
    const last = `${y}-${pad(mm + 1)}-${pad(lastDay(y, mm))}`;
    return past ? first <= TODAY : last >= TODAY;
  };

  const sentence = mode === 'text' && text.trim() && !parsed
    ? tx('Bitte als Tag, Monat und Jahr, zum Beispiel 14.9.2022 oder 14. September 2022.', 'Please as day, month and year, for example 14.9.2022 or 14 September 2022.')
    : wrongSide ? (past ? tx('Das liegt nach heute.', 'That is after today.') : tx('Das liegt vor heute.', 'That is before today.'))
    : shown ? [`${long(shown)} ${year(shown)}.`, extra?.(shown)].filter(Boolean).join(' ')
    : past ? tx('Tag, Monat und Jahr, zum Beispiel 14.9.2022.', 'Day, month and year, for example 14.9.2022.') : tx('Den Tag aus dem Mutterpass, zum Beispiel 12.3.2027.', 'The due date from your scan, for example 12.3.2027.');

  return (
    <View style={{ gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt size={13} color={tokens.sub}>{label}</Txt>
          {open && mode === 'text' ? (
            <TextInput
              value={text}
              onChangeText={onText}
              autoFocus
              selectTextOnFocus
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              placeholder={tx('TT.MM.JJJJ', 'DD.MM.YYYY')}
              placeholderTextColor={tokens.mute}
              selectionColor={tokens.select} cursorColor={tokens.ink}
              returnKeyType="done"
              onSubmitEditing={() => { if (parsed && !wrongSide) haptics.commit(); close(); }}
              style={[{ fontFamily: fonts[600], fontSize: 18, color: tokens.ink, padding: 0 }, noOutline]}
            />
          ) : (
            <PressScale scale={0.98} onPress={open ? close : begin} accessibilityLabel={label}>
              <Txt size={18} weight={600} color={value ? tokens.ink : tokens.mute} numberOfLines={1}>{value ? `${dayMonth(value)} ${year(value)}` : tx('Datum wählen', 'Pick a date')}</Txt>
            </PressScale>
          )}
        </View>
        {open ? (
          <PressScale hitSlop={10} scale={0.92} onPress={() => { haptics.select(); close(); }}>
            <Txt size={15} weight={600}>{tx('Fertig', 'Done')}</Txt>
          </PressScale>
        ) : right}
      </View>

      {open ? (
        <Animated.View entering={rise()} style={{ gap: 10 }}>
          <Meta color={(mode === 'text' && text.trim() && !parsed) || wrongSide ? tokens.frist : tokens.sub}>{sentence}</Meta>
          <View style={{ flexDirection: 'row' }}>
            <Chip icon={mode === 'text' ? 'cal' : 'papier'} label={mode === 'text' ? tx('Kalender', 'Calendar') : tx('Tastatur', 'Keyboard')} onPress={() => switchTo(mode === 'text' ? 'cal' : 'text')} />
          </View>
          {mode === 'cal' ? (
            <Animated.View entering={swapIn} style={{ gap: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginRight: -16 }}>
                {years.map((yy) => <Chip key={yy} label={String(yy)} on={yy === y} onPress={() => pickYear(yy)} />)}
              </ScrollView>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {MONTHS_SHORT.map((l, mm) => (
                  <Chip key={l} label={l} on={mm === m} disabled={!monthOk(mm)} onPress={() => pickMonth(mm)} style={{ width: '23%', justifyContent: 'center' }} />
                ))}
              </View>
              <MonthGrid
                month={firstOf(`${y}-${pad(m + 1)}-01`)}
                onMonth={(f) => { setY(year(f)); setM(monthIdx(f)); }}
                date={value ?? undefined}
                max={past ? TODAY : undefined}
                onPick={pickDay}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Chip({ label, icon, on, disabled, onPress, style }: { label: string; icon?: 'cal' | 'papier'; on?: boolean; disabled?: boolean; onPress: () => void; style?: any }) {
  return (
    <PressScale
      onPress={disabled ? undefined : onPress}
      scale={0.94}
      accessibilityLabel={label === String(Number(label)) ? tx(`Jahr ${label}`, `Year ${label}`) : MONTHS[MONTHS_SHORT.indexOf(label)] ?? label}
      style={[{ height: 34, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? tokens.row : tokens.chipBg, borderWidth: on ? 1.5 : 0, borderColor: tokens.ink, opacity: disabled ? 0.35 : 1 }, style]}
    >
      {icon ? <LineIcon name={icon} size={14} color={tokens.ink} /> : null}
      <Txt size={13.5} weight={600}>{label}</Txt>
    </PressScale>
  );
}
