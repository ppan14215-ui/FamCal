/**
 * Termin auf einen Blick (Julian 28.10., Lücke zu TimeTree): calm fixed rows
 * for what TimeTree puts in its form: ganztägig, Wiederholen and when the
 * series ends, Erinnerung, Countdown and Notiz. Talking still changes all of
 * it; the rows only make the state visible and one tap away.
 */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import LineIcon, { type LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import DateField from './DateField';
import { Card, Toggle, Chip } from './ui/kit';
import { tokens, fonts } from '../theme';
import type { CalEvent } from '../state/types';
import { WD_LONG, weekday, dayMonth, year, TODAY, daysBetween } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export const REMINDERS: { key: string; label: string }[] = [
  { key: '', label: tx('Keine', 'None') },
  { key: '0m', label: tx('Zum Start', 'At start') },
  { key: '10m', label: tx('10 Min vorher', '10 min before') },
  { key: '30m', label: tx('30 Min vorher', '30 min before') },
  { key: '1h', label: tx('1 Std vorher', '1 hour before') },
  { key: 'vorabend', label: tx('Am Vorabend', 'Evening before') },
  { key: '1d', label: tx('1 Tag vorher', '1 day before') },
  { key: '1w', label: tx('1 Woche vorher', '1 week before') },
];
/** Old labels ("1 Tag vorher") still sit on some Termine. */
const LEGACY: Record<string, string> = { '1 Tag vorher': '1d', '1 day before': '1d', '1 Stunde vorher': '1h', '1 hour before': '1h', Keine: '', None: '' };
export const reminderKey = (r?: string) => (r === undefined ? '' : LEGACY[r] ?? r);
export const reminderLabel = (r?: string) => REMINDERS.find((x) => x.key === reminderKey(r))?.label ?? r ?? '';

const repeats = (date: string) => [
  { key: '', label: tx('Nie', 'Never') },
  { key: tx('Täglich', 'Daily'), label: tx('Täglich', 'Daily') },
  { key: tx(`Jeden ${WD_LONG[weekday(date)]}`, `Every ${WD_LONG[weekday(date)]}`), label: tx(`Jeden ${WD_LONG[weekday(date)]}`, `Every ${WD_LONG[weekday(date)]}`) },
  { key: tx('Alle 2 Wochen', 'Every 2 weeks'), label: tx('Alle 2 Wochen', 'Every 2 weeks') },
  { key: tx('Montag bis Freitag', 'Mondays to Fridays'), label: tx('Mo bis Fr', 'Mon to Fri') },
  { key: tx('Jeden Monat', 'Every month'), label: tx('Jeden Monat', 'Every month') },
  { key: tx('Jährlich', 'Every year'), label: tx('Jährlich', 'Every year') },
];

/** "in 12 Tagen", "morgen", "heute"; for the countdown. */
export function daysTo(date: string): string {
  const d = daysBetween(TODAY, date);
  if (d < 0) return tx('vorbei', 'past');
  if (d === 0) return tx('heute', 'today');
  if (d === 1) return tx('morgen', 'tomorrow');
  return tx(`in ${d} Tagen`, `in ${d} days`);
}

type Open = 'repeat' | 'remind' | null;

export default function TerminDetails({ e, onPatch }: { e: CalEvent; onPatch: (p: Partial<CalEvent>) => void }) {
  const [open, setOpen] = useState<Open>(null);
  const [note, setNote] = useState(e.note ?? '');
  const toggle = (k: Open) => { haptics.select(); setOpen(open === k ? null : k); };
  const rep = repeats(e.date);
  const untilText = (d: string) => (year(d) === year(TODAY) ? dayMonth(d) : `${dayMonth(d)} ${year(d)}`);
  return (
    <Card pad={0} gap={0}>
      <Row icon="clock" label={tx('Ganztägig', 'All day')} right={<Toggle value={!!e.allDay} onChange={(v) => onPatch(v ? { allDay: true, start: '00:00', end: undefined } : { allDay: undefined, start: '09:00', end: '10:00' })} />} />
      <Line />
      <Row icon="sync" label={tx('Wiederholen', 'Repeat')} value={e.repeat || tx('Nie', 'Never')} onPress={() => toggle('repeat')} />
      {open === 'repeat' ? (
        <Chips items={rep} value={rep.find((r) => r.key === e.repeat)?.key ?? (e.repeat ? null : '')} extra={e.repeat && !rep.some((r) => r.key === e.repeat) ? e.repeat : undefined} onPick={(k) => { onPatch({ repeat: k || undefined, ...(k ? {} : { repeatUntil: undefined }) }); setOpen(null); }} />
      ) : null}
      {e.repeat ? (
        <View style={{ paddingHorizontal: 4 }}>
          <DateField
            label={tx('Serie endet', 'Series ends')}
            value={e.repeatUntil ?? null}
            onChange={(d) => onPatch({ repeatUntil: d < e.date ? e.date : d })}
            right={e.repeatUntil ? <Chip onPress={() => { haptics.select(); onPatch({ repeatUntil: undefined }); }}>{tx('Nie', 'Never')}</Chip> : <Txt size={14} color={tokens.sub}>{tx('Nie', 'Never')}</Txt>}
            extra={(d) => tx(`Letzter Termin am ${untilText(d)}.`, `Last one on ${untilText(d)}.`)}
          />
        </View>
      ) : null}
      <Line />
      <Row icon="flash" label={tx('Erinnerung', 'Reminder')} value={reminderLabel(e.reminder) || tx('Keine', 'None')} onPress={() => toggle('remind')} />
      {open === 'remind' ? <Chips items={REMINDERS.filter((r) => !e.allDay || !/m$|h$/.test(r.key) || r.key === '')} value={reminderKey(e.reminder)} onPick={(k) => { onPatch({ reminder: k || undefined }); setOpen(null); }} /> : null}
      <Line />
      <Row icon="cal" label={tx('Tage bis zum Termin zeigen', 'Show days to go')} sub={e.countdown ? daysTo(e.date) : undefined} right={<Toggle value={!!e.countdown} onChange={(v) => onPatch({ countdown: v || undefined })} />} />
      <Line />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ paddingTop: 2 }}><LineIcon name="papier" size={20} color={tokens.sub} /></View>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={() => { const v = note.trim(); if (v !== (e.note ?? '')) { haptics.commit(); onPatch({ note: v || undefined }); } }}
          multiline
          placeholder={tx('Notiz', 'Note')}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.select} cursorColor={tokens.ink}
          maxLength={2000}
          style={[{ flex: 1, minHeight: 24, fontFamily: fonts[400], fontSize: 16, lineHeight: 22, color: tokens.ink, padding: 0 }, noOutline]}
        />
      </View>
    </Card>
  );
}

function Row({ icon, label, value, sub, right, onPress }: { icon: LineName; label: string; value?: string; sub?: string; right?: React.ReactNode; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, paddingVertical: 8 }}>
      <LineIcon name={icon} size={20} color={tokens.sub} />
      <View style={{ flex: 1 }}>
        <Txt size={16} weight={500}>{label}</Txt>
        {sub ? <Txt size={13} color={tokens.done}>{sub}</Txt> : null}
      </View>
      {value !== undefined ? <Txt size={15} color={tokens.sub} numberOfLines={1} style={{ maxWidth: '50%' }}>{value}</Txt> : null}
      {right}
    </View>
  );
  return onPress ? <PressScale onPress={onPress} scale={0.99}>{body}</PressScale> : body;
}

function Chips({ items, value, extra, onPick }: { items: { key: string; label: string }[]; value: string | null; extra?: string; onPick: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12, paddingLeft: 48 }}>
      {extra ? <Chip bg={tokens.doneSoft} color={tokens.done}>{extra}</Chip> : null}
      {items.map((it) => (
        <Chip key={it.key || 'none'} bg={it.key === value ? tokens.doneSoft : tokens.chipBg} color={it.key === value ? tokens.done : tokens.ink} onPress={() => { haptics.select(); onPick(it.key); }}>{it.label}</Chip>
      ))}
    </View>
  );
}

const Line = () => <View style={{ height: 1, backgroundColor: tokens.hair, marginLeft: 48 }} />;
