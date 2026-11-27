/**
 * Neuer Termin, exactly as in the klar draft Julian approved (14.11., "Termin, neu"): the cross, the name of the page
 * and "Sichern" on top; the symbol beside the big title; then one line each for when, who, where, the reminder, what
 * to bring, repeating and a note. A tap on the symbol opens every clay icon. Below it the reminder that saying it to
 * Memo does the same.
 */
import { endAfter } from '../src/lib/dauer';
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform, type ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { FormBar, FormRow, FormValue, FormPicks, FormInput, FormWho, FormGroup, whenText, useWhenInView } from '../src/components/TerminForm';
import PressScale from '../src/components/ui/PressScale';
import { REMINDERS, reminderLabel, repeatOptions } from '../src/components/TerminDetails';
import { tokens, fonts, glass } from '../src/theme';
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
  // Julian 19.11.: the set length for new Termine (Einstellungen or told to Memo), else one hour.
  const plusHour = (t: string) => endAfter(t);
  const [when, setWhen] = useState<When>(slot.date ? { date: slot.date, ...(slot.start ? { start: slot.start, end: plusHour(slot.start) } : {}) } : LIVE ? { date: TODAY } : { date: '2026-11-12', start: '09:30', end: '10:15' });
  const [place, setPlace] = useState(LIVE ? '' : 'Kinderarztpraxis Weber');
  const [who, setWho] = useState<Who>(LIVE ? 'both' : 'T');
  const [people, setPeople] = useState<string[]>([]);
  const [reminder, setReminder] = useState('1d');
  const [bring, setBring] = useState('');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const scroll = useRef<ScrollView>(null);
  const linesAt = useWhenInView(scroll, open === 'wann');
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
    <Screen gap={14} scrollRef={scroll}
      head={<FormBar leftLabel={tx('Abbrechen', 'Cancel')} onLeft={goBack} action={tx('Sichern', 'Save')} onAction={save} />}>
      <Txt size={34} line={38} weight={700}>{tx('Neuer Termin', 'New event')}</Txt>
      {/* The title on a white card with its small label, as in the draft: the one thing to type. */}
      <View style={[{ borderRadius: 16, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, backgroundColor: '#FFFFFF' }, glass.lift]}>
        <Txt size={11.5} line={14} weight={600} tracking={0.9} color={tokens.mute}>{tx('TERMIN', 'EVENT')}</Txt>
        <TextInput value={title} onChangeText={(t) => { setTouched(true); setTitle(t); }} autoFocus={LIVE} placeholder={tx('Was steht an?', 'What is it?')} placeholderTextColor={tokens.mute}
          accessibilityLabel={tx('Titel', 'Title')} selectionColor={tokens.select} cursorColor={tokens.ink} returnKeyType="done"
          style={[{ marginTop: 4, fontFamily: fonts[700], fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
      </View>
      <View onLayout={linesAt} style={{ gap: 12 }}>
        <FormGroup>
          <FormRow label={tx('Wann', 'When')} onPress={open === 'wann' ? undefined : () => toggle('wann')} below={open === 'wann' ? <WhenField card fold startOpen value={when} onChange={setWhen} onDone={() => setOpen(null)} /> : undefined}>
            {open === 'wann' ? null : <FormValue>{whenText(when)}</FormValue>}
          </FormRow>
          <FormRow label={tx('Wer', 'Who')}>
            <FormWho who={who} people={people} onWho={setWho} onPerson={(id) => setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />
          </FormRow>
          <FormRow last label={tx('Wo', 'Where')}>
            <FormInput live label={tx('Wo', 'Where')} value={place} placeholder={tx('Hinzufügen', 'Add')} onCommit={setPlace} />
          </FormRow>
        </FormGroup>
        <FormGroup>
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
        </FormGroup>
      </View>
      <Txt size={15} line={20} color={tokens.sub} style={{ textAlign: 'center', paddingTop: 6 }}>{minimal ? tx('Oder einfach sagen', 'Or just say it') : tx('Oder einfach Memo sagen', 'Or just tell Memo')}</Txt>
      <PressScale accessibilityRole="button" scale={0.98} onPress={save} style={{ height: 54, borderRadius: 14, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={16} line={20} weight={600} color="#FFFFFF">{tx('Sichern', 'Save')}</Txt>
      </PressScale>
    </Screen>
  );
}
