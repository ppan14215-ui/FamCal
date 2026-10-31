/**
 * Schreibzeile (Canvas Zeile 7, Julian 26.10.). tx('Wann', 'When') is one line. Tapping
 * it turns it into a text field, like a shopping line; underneath stands the
 * sentence it understood and a few chips. tx('Kalender', 'Calendar') swaps the keyboard for a
 * month grid, and the device remembers that choice for next time.
 * Rule 8 exception: only date fields show extras under the field.
 */
import React, { useMemo, useRef, useState } from 'react';
import { View, TextInput, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon, { LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { Meta } from './ui/kit';
import MonthGrid, { firstOf, shiftMonth } from './MonthGrid';
import { tokens, fonts, persons, rise, swapIn } from '../theme';
import { TODAY, addDays, WD_SHORT, WD_LONG, weekday, dayNum, minutes, hm, MONTHS_SHORT, monthIdx, long, dayMonth, year } from '../lib/dates';
import { parseWhen, whenLine, whenSentence, whenText, When } from '../lib/when';
import { getPref, setPref } from '../lib/prefs';
import { haptics } from '../lib/haptics';
import { useStore } from '../state/store';
import { tx, EN } from '../i18n/lang';

type Mode = 'text' | 'cal';
type Props = {
  value: When | null;
  onChange: (w: When) => void;
  /** 'termin' = day and time, 'tag' = a day only (birth date). */
  kind?: 'termin' | 'tag';
  /** Birth dates: no day after today, a day without year means the last one. */
  past?: boolean;
  icon?: LineName;
  /** Small label above the value ("Geboren am"); without it the line has an icon. */
  label?: string;
  placeholder?: string;
  right?: React.ReactNode;
  /** Extra sentence after the understood one ("Ben ist 6 Wochen alt."). */
  extra?: (w: When) => string | undefined;
  /** Own rounded surface instead of a row inside a Group. */
  card?: boolean;
  /** Close after one tap in the grid (birth date). */
  closeOnPick?: boolean;
  /** Called when the field closes (Fertig, return key, pick). */
  onDone?: () => void;
};

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const plusMin = (t: string, m: number) => {
  const v = Math.min(23 * 60 + 59, minutes(t) + m);
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

export default function WhenField({ value, onChange, kind = 'termin', past, icon = 'clock', label, placeholder = tx('Wann? Zum Beispiel morgen 15 Uhr', 'When? For example tomorrow 3pm'), right, extra, card, closeOnPick, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [month, setMonth] = useState(firstOf(value?.date ?? TODAY));
  const anchor = useRef<string | null>(null);
  const events = useStore((s) => s.events);

  // Person dots per day: real events only, work blocks get none.
  const dots = useMemo(() => {
    if (kind !== 'termin') return {};
    const m: Record<string, string[]> = {};
    for (const e of events) {
      if (e.work) continue;
      const c = e.who === 'J' ? [persons.J.ink] : e.who === 'T' ? [persons.T.ink] : e.who === 'both' ? [persons.J.ink, persons.T.ink] : [tokens.sub];
      m[e.date] = [...(m[e.date] ?? []), ...c].filter((x, i, a) => a.indexOf(x) === i);
    }
    return m;
  }, [events, kind]);

  const parsed = text.trim() ? parseWhen(text, { past }) : null;
  const shown = mode === 'text' && text.trim() ? parsed : value;
  const tooLate = !!past && !!parsed && parsed.date > TODAY;

  const begin = () => {
    haptics.select();
    const m: Mode = getPref('wann') === 'cal' ? 'cal' : 'text';
    setMode(m);
    setText(value ? whenText(value) : '');
    setMonth(firstOf(value?.date ?? TODAY));
    anchor.current = null;
    setOpen(true);
  };
  const close = () => { setOpen(false); setText(''); onDone?.(); };
  const switchTo = (m: Mode) => {
    haptics.select();
    setPref('wann', m);
    if (m === 'cal' && value) setMonth(firstOf(value.date));
    if (m === 'text') setText(value ? whenText(value) : '');
    setMode(m);
  };
  const apply = (w: When) => {
    onChange(w);
    if (mode === 'text') setText(whenText(w));
    setMonth(firstOf(w.date));
  };
  const onText = (t: string) => {
    setText(t);
    const w = t.trim() ? parseWhen(t, { past }) : null;
    if (w && !(past && w.date > TODAY)) { onChange(w); setMonth(firstOf(w.date)); }
  };
  const pick = (d: string) => {
    if (kind === 'tag') {
      onChange({ date: d });
      if (closeOnPick) { haptics.commit(); setTimeout(close, 160); }
      return;
    }
    const v = value;
    // Second tap after the first: a range of whole days.
    if (anchor.current && d > anchor.current) {
      onChange({ date: anchor.current, endDate: d });
      anchor.current = null;
      return;
    }
    anchor.current = d;
    onChange({ date: d, start: v?.endDate ? undefined : v?.start, end: v?.endDate ? undefined : v?.end, repeat: v?.repeat });
  };

  // Chips: what is most likely missing next.
  const chips: { label: string; on?: boolean; run: () => void }[] = [];
  if (mode === 'text') {
    if (kind === 'termin' && shown) {
      chips.push({ label: tx('+1 Tag', '+1 day'), run: () => apply({ ...shown, date: addDays(shown.date, 1), endDate: shown.endDate && addDays(shown.endDate, 1) }) });
      if (shown.start) chips.push({ label: tx('+1 Std', '+1 hour'), run: () => apply({ ...shown, start: plusMin(shown.start!, 60), end: shown.end && plusMin(shown.end, 60) }) });
      if (!shown.repeat) chips.push({ label: tx('Jede Woche', 'Every week'), run: () => apply({ ...shown, repeat: tx(`Jeden ${WD_LONG[weekday(shown.date)]}`, `Every ${WD_LONG[weekday(shown.date)]}`) }) });
      if (shown.start) chips.push({ label: tx('Ganztägig', 'All day'), run: () => apply({ ...shown, start: undefined, end: undefined }) });
    } else if (kind === 'termin') {
      chips.push({ label: tx(`Heute · ${WD_SHORT[weekday(TODAY)]}`, `Today · ${WD_SHORT[weekday(TODAY)]}`), run: () => apply({ date: TODAY }) });
      chips.push({ label: tx(`Morgen · ${WD_SHORT[weekday(addDays(TODAY, 1))]}`, `Tomorrow · ${WD_SHORT[weekday(addDays(TODAY, 1))]}`), run: () => apply({ date: addDays(TODAY, 1) }) });
      for (let i = 2; i < 7; i++) { const d = addDays(TODAY, i); chips.push({ label: `${WD_SHORT[weekday(d)]} ${dayNum(d)}${EN ? '' : '.'}`, run: () => apply({ date: d }) }); }
    }
  } else if (kind === 'termin' && value?.start && !value.endDate) {
    for (const [l, m] of [[tx('30 Min', '30 min'), 30], [tx('45 Min', '45 min'), 45], [tx('1 Std', '1 h'), 60], [tx('1,5 Std', '1.5 h'), 90], [tx('2 Std', '2 h'), 120]] as const) {
      const on = !!value.end && minutes(value.end) - minutes(value.start) === m;
      chips.push({ label: l, on, run: () => onChange({ ...value, end: plusMin(value.start!, m) }) });
    }
  } else if (kind === 'tag') {
    for (let i = 0; i < 4; i++) {
      const f = shiftMonth(firstOf(TODAY), -i);
      chips.push({ label: MONTHS_SHORT[monthIdx(f)], on: f === month, run: () => setMonth(f) });
    }
  }

  const sentence = mode === 'text' && text.trim() && !parsed
    ? tx('Das verstehe ich noch nicht. Zum Beispiel: Do 15 Uhr, 12.11. 9:30-10:15 oder jeden Di 19-20:30.', 'I don\'t get that yet. For example: Thu 3pm, Nov 12 9:30am to 10:15am or every Tue 7pm to 8:30pm.')
    : tooLate ? tx('Das liegt nach heute.', 'That is after today.')
    : shown ? [kind === 'tag' ? `${long(shown.date)} ${year(shown.date)}.` : whenSentence(shown), extra?.(shown)].filter(Boolean).join(' ')
    : kind === 'tag' ? tx('Tag, Monat und Jahr, zum Beispiel 14.9.2026.', 'Day, month and year, for example Sep 14 2026.') : tx('Tag und Uhrzeit, gern auch jeden Dienstag.', 'Day and time, or every Tuesday.');

  const valueText = value ? (kind === 'tag' ? `${dayMonth(value.date)} ${year(value.date)}` : whenLine(value)) : '';
  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {label ? null : <LineIcon name={icon} size={20} color={tokens.sub} />}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {label ? <Txt size={13} color={tokens.sub}>{label}</Txt> : null}
        {open && mode === 'text' ? (
          <TextInput
            value={text}
            onChangeText={onText}
            autoFocus
            selectTextOnFocus
            placeholder={kind === 'tag' ? tx('Zum Beispiel 14.9.2026', 'For example Sep 14 2026') : placeholder}
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.select} cursorColor={tokens.ink}
            returnKeyType="done"
            onSubmitEditing={() => { if (parsed && !tooLate) haptics.commit(); close(); }}
            style={[{ fontFamily: fonts[600], fontSize: label ? 18 : 16, color: tokens.ink, padding: 0 }, noOutline]}
          />
        ) : (
          <PressScale scale={0.98} onPress={open ? close : begin} accessibilityLabel={label ?? tx('Wann', 'When')}>
            <Txt size={label ? 18 : 16} weight={600} color={value ? tokens.ink : tokens.mute} numberOfLines={1}>{value ? valueText : kind === 'tag' ? tx('Datum wählen', 'Pick a date') : tx('Wann?', 'When?')}</Txt>
          </PressScale>
        )}
      </View>
      {open ? (
        <PressScale hitSlop={10} scale={0.92} onPress={() => { haptics.select(); close(); }}>
          <Txt size={15} weight={600}>{tx('Fertig', 'Done')}</Txt>
        </PressScale>
      ) : right}
    </View>
  );

  return (
    <View style={card
      ? { gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }
      : { gap: 10, paddingVertical: open ? 14 : 14, paddingHorizontal: 16, backgroundColor: tokens.row }}
    >
      {head}
      {open ? (
        <Animated.View entering={rise()} style={{ gap: 10, paddingLeft: label || card ? 0 : 32 }}>
          <Meta color={tooLate || (mode === 'text' && text.trim() && !parsed) ? tokens.frist : tokens.sub}>{sentence}</Meta>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }} style={{ marginRight: -16 }}>
            <WChip icon={mode === 'text' ? 'cal' : 'papier'} label={mode === 'text' ? tx('Kalender', 'Calendar') : tx('Tastatur', 'Keyboard')} onPress={() => switchTo(mode === 'text' ? 'cal' : 'text')} />
            {chips.map((c) => <WChip key={c.label} label={c.label} on={c.on} onPress={() => { haptics.select(); c.run(); }} />)}
          </ScrollView>
          {mode === 'cal' ? (
            <Animated.View entering={swapIn} style={{ marginLeft: label || card ? 0 : -32 }}>
              <MonthGrid month={month} onMonth={setMonth} date={value?.date} endDate={value?.endDate} dots={dots} max={past ? TODAY : undefined} onPick={pick} />
              {kind === 'termin' && value && !value.endDate ? (
                <StartStrip
                  start={value.start}
                  onPick={(t) => {
                    haptics.select();
                    // The length stays (Julian 31.10.: moving a Termin to the evening keeps its hour).
                    const len = value.start && value.end ? minutes(value.end) - minutes(value.start) : 60;
                    onChange({ ...value, start: t, end: plusMin(t, Math.max(15, len)) });
                  }}
                />
              ) : null}
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function WChip({ label, icon, on, onPress }: { label: string; icon?: LineName; on?: boolean; onPress: () => void }) {
  return (
    <PressScale
      onPress={onPress}
      scale={0.94}
      style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? tokens.row : tokens.chipBg, borderWidth: on ? 1.5 : 0, borderColor: tokens.ink }}
    >
      {icon ? <LineIcon name={icon} size={14} color={tokens.ink} /> : null}
      <Txt size={13.5} weight={600}>{label}</Txt>
    </PressScale>
  );
}

/**
 * Julian 31.10. 20:27: the time must be its own control, the grid alone could not move a Termin to the evening.
 * A row of start times every 30 minutes; it opens at the current start.
 */
const SLOTS = Array.from({ length: 36 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
function StartStrip({ start, onPick }: { start?: string; onPick: (t: string) => void }) {
  const ref = useRef<ScrollView>(null);
  const xs = useRef<Record<string, number>>({});
  const near = start ? SLOTS.reduce((a, b) => (Math.abs(minutes(b) - minutes(start)) < Math.abs(minutes(a) - minutes(start)) ? b : a)) : '09:00';
  const slots = start && !SLOTS.includes(start) ? [...SLOTS, start].sort() : SLOTS;
  const jumped = useRef(false);
  return (
    <View style={{ gap: 8, paddingTop: 12 }}>
      <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4 }}>{tx('Beginn', 'Starts at')}</Txt>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingRight: 16 }} style={{ marginRight: -16 }}>
        {slots.map((t) => (
          <View
            key={t}
            onLayout={(e) => {
              xs.current[t] = e.nativeEvent.layout.x;
              if (!jumped.current && t === (start ?? near)) { jumped.current = true; ref.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 80), animated: false }); }
            }}
          >
            <WChip label={hm(t)} on={t === start} onPress={() => onPick(t)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
