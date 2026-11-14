/**
 * Neuer Termin, exactly as in the klar draft Julian approved (14.11., "Termin, neu"): the cross, the name of the page
 * and "Sichern" on top; the symbol beside the big title; then one line each for when, who, where, the reminder, what
 * to bring, repeating and a note. A tap on the symbol opens every clay icon. Below it the reminder that saying it to
 * Memo does the same.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import Pin from '../src/components/buddy/Pin';
import { FormBar, FormTitle, FormRow, FormValue, FormChip, FormPicks, FormInput, FormWho, whenChips } from '../src/components/TerminForm';
import { REMINDERS, reminderLabel, repeatOptions } from '../src/components/TerminDetails';
import { tokens } from '../src/theme';
import { useStore, actions, toast, get } from '../src/state/store';
import WhenField from '../src/components/WhenField';
import type { When } from '../src/lib/when';
import { haptics } from '../src/lib/haptics';
import { symbolLabel, isSport } from '../src/data/symbols';
import { newId } from '../src/data/sample';
import { findCity, passBring, isPassTermin } from '../src/data/cities';
import type { ClayName } from '../src/lib/clayIcons';
import type { Who } from '../src/state/types';
import { LIVE } from '../src/lib/live';
import { TODAY } from '../src/lib/dates';
import { onToday } from '../src/screens/kalender/AgendaView';
import { useMascot } from '../src/lib/mascot';
import { tx } from '../src/i18n/lang';

type Open = 'wann' | 'erinnern' | 'wiederholen' | null;

export default function TerminNeu() {
  const draft = useStore((s) => s.draftSymbol);
  const minimal = useMascot() === 'minimal';
  // The test link shows a filled example; the real app starts empty on today.
  const [icon, setIcon] = useState<ClayName>(LIVE ? 'kalender' : 'stethoskop');
  const [title, setTitle] = useState(LIVE ? '' : 'U5 bei Dr. Weber');
  const [touched, setTouched] = useState(false);
  // Tapping an empty slot in the calendar hands over its day and hour (Julian 05.11.).
  const slot = useLocalSearchParams<{ date?: string; start?: string }>();
  const plusHour = (t: string) => { const [h, m] = t.split(':').map(Number); return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
  const [when, setWhen] = useState<When>(slot.date ? { date: slot.date, ...(slot.start ? { start: slot.start, end: plusHour(slot.start) } : {}) } : LIVE ? { date: TODAY } : { date: '2026-11-12', start: '09:30', end: '10:15' });
  const [place, setPlace] = useState(LIVE ? '' : 'Kinderarztpraxis Weber');
  const [who, setWho] = useState<Who>(LIVE ? 'both' : 'T');
  const [people, setPeople] = useState<string[]>([]);
  const [reminder, setReminder] = useState('1d');
  const [bring, setBring] = useState('');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const toggle = (k: Open) => { haptics.select(); setOpen(open === k ? null : k); };

  useEffect(() => () => actions.clearDraftSymbol(), []);

  // A symbol picked from all clay icons arrives through the store.
  useEffect(() => {
    if (!draft) return;
    setIcon(draft);
    if (isSport(draft) && !LIVE) {
      if (!touched) setTitle(symbolLabel(draft));
      setWhen({ date: '2026-11-03', start: '19:00', end: '20:30', repeat: 'Jeden Dienstag' });
      setPlace('Sportplatz Süd');
      setWho('T');
    } else if (!touched) {
      setTitle(symbolLabel(draft));
    }
    // Taken over once; the next screen starts clean.
    actions.clearDraftSymbol();
  }, [draft]);

  const save = () => {
    // Pass or ID at the city office: the assistant adds what to bring, with its source.
    const pass = isPassTermin(title);
    const things = bring.split(',').map((t) => t.trim()).filter(Boolean).map((t) => ({ id: newId('b'), t, done: false }));
    const where = place.trim() || undefined;
    actions.addEvent({
      bring: pass ? [...things, ...(passBring(findCity(get().city)) ?? [])] : things.length ? things : undefined,
      id: newId('e'), title: title.trim() || tx('Termin', 'Event'), icon, date: when.date, endDate: when.endDate,
      start: when.start ?? '00:00', end: when.end, allDay: !when.start, who, place: where,
      people: people.length ? people : undefined,
      repeat: when.repeat,
      reminder: reminder || undefined,
      note: note.trim() || undefined,
    });
    actions.setCalDay(when.date);
    // Heute shows the coming weeks; anything later opens in the grid of days.
    actions.setCalView(onToday(when.date) ? 'heute' : 'tag');
    haptics.success();
    toast(pass ? tx('Termin gespeichert, Mitbringliste ergänzt', 'Saved, bring list added') : tx('Termin gespeichert', 'Saved'));
    goBack();
    router.navigate('/kalender');
  };

  const rep = repeatOptions(when.date);
  return (
    <Screen gap={18} padTop={10}>
      <FormBar title={tx('Neuer Termin', 'New event')} icon="x" leftLabel={tx('Abbrechen', 'Cancel')} onLeft={goBack} action={tx('Sichern', 'Save')} onAction={save} />
      <FormTitle icon={icon} value={title} onIcon={() => { haptics.select(); actions.pickSymbol(icon); router.push('/symbol'); }} onChange={(t) => { setTouched(true); setTitle(t); }} autoFocus={LIVE} />
      <View>
        <FormRow label={tx('Wann', 'When')} below={open === 'wann' ? <WhenField card startOpen value={when} onChange={setWhen} onDone={() => setOpen(null)} /> : undefined}>
          {open === 'wann' ? null : whenChips(when).map((c) => <FormChip key={c} label={c} onPress={() => toggle('wann')} />)}
        </FormRow>
        <FormRow label={tx('Wer', 'Who')}>
          <FormWho who={who} people={people} onWho={setWho} onPerson={(id) => setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />
        </FormRow>
        <FormRow label={tx('Wo', 'Where')}>
          <FormInput live label={tx('Wo', 'Where')} value={place} placeholder={tx('Hinzufügen', 'Add')} onCommit={setPlace} />
        </FormRow>
        <FormRow label={tx('Erinnern', 'Reminder')} onPress={() => toggle('erinnern')}
          below={open === 'erinnern' ? <FormPicks items={REMINDERS.filter((r) => !!when.start || !/m$|h$/.test(r.key) || r.key === '')} value={reminder} onPick={(k) => { setReminder(k); setOpen(null); }} /> : undefined}>
          <FormValue dim={!reminder}>{reminderLabel(reminder) || tx('Keine', 'None')}</FormValue>
        </FormRow>
        <FormRow label={tx('Mitbringen', 'Bring')}>
          <FormInput live label={tx('Mitbringen', 'Bring')} value={bring} placeholder={tx('Hinzufügen', 'Add')} onCommit={setBring} />
        </FormRow>
        <FormRow label={tx('Wiederholen', 'Repeat')} onPress={() => toggle('wiederholen')}
          below={open === 'wiederholen' ? <FormPicks items={rep} value={when.repeat ?? ''} onPick={(k) => { setWhen({ ...when, repeat: k || undefined }); setOpen(null); }} /> : undefined}>
          <FormValue dim={!when.repeat}>{when.repeat || tx('Nie', 'Never')}</FormValue>
        </FormRow>
        <FormRow last label={tx('Notiz', 'Note')}>
          <FormInput live label={tx('Notiz', 'Note')} value={note} placeholder={tx('Hinzufügen', 'Add')} onCommit={setNote} />
        </FormRow>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 6 }}>
        {minimal ? null : <Pin mood="idle" size={22} shadow={false} still />}
        <Txt size={15.5} color={tokens.sub}>{minimal ? tx('Oder einfach sagen', 'Or just say it') : tx('Oder einfach Memo sagen', 'Or just tell Memo')}</Txt>
      </View>
    </Screen>
  );
}
