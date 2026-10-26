/**
 * Neuer Termin (Variante B, Julian 26.10.). Visible is what almost everyone
 * needs: title, when, where, who. The rest is one line with value and arrow,
 * rare things sit under "Mehr". Four categories + "Alle" opens every clay
 * icon; picked symbols move to the front next time.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, CancelBar, Btn, Group, LineRow, Meta, Chevron, TextLink } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import { Avatar, Pair } from '../src/components/ui/Person';
import { TitleInput } from '../src/components/Field';
import { tokens, tint, persons, fonts } from '../src/theme';
import { useStore, actions, toast, get } from '../src/state/store';
import WhenField from '../src/components/WhenField';
import type { When } from '../src/lib/when';
import { haptics } from '../src/lib/haptics';
import { symbolLabel, isSport } from '../src/data/symbols';
import { newId } from '../src/data/sample';
import { findCity, passBring, isPassTermin } from '../src/data/cities';
import type { ClayName } from '../src/lib/clayIcons';
import type { Who } from '../src/state/types';
import PressScale from '../src/components/ui/PressScale';

const BASE: { icon: ClayName; label: string }[] = [
  { icon: 'stethoskop', label: 'Arzt' },
  { icon: 'vertrag', label: 'Amt' },
  { icon: 'geburtstag', label: 'Familie' },
  { icon: 'yogamatte', label: 'Kurs' },
];
const REMIND = ['1 Tag vorher', '1 Stunde vorher', 'Keine'];
const REPEAT = ['Jede Woche', 'Alle 2 Wochen', 'Jeden Monat'];
// Cycles through the repeat options and back to none.
const nextRepeat = (r?: string) => (r === undefined ? REPEAT[0] : REPEAT[REPEAT.indexOf(r) + 1]);

export default function TerminNeu() {
  const draft = useStore((s) => s.draftSymbol);
  const recent = useStore((s) => s.recentSymbols);
  const [icon, setIcon] = useState<ClayName>('stethoskop');
  const [title, setTitle] = useState('U5 bei Dr. Weber');
  const [touched, setTouched] = useState(false);
  const [when, setWhen] = useState<When>({ date: '2026-11-12', start: '09:30', end: '10:15' });
  const [place, setPlace] = useState('Kinderarztpraxis Weber');
  const kid = useStore((s) => s.kid);
  const [forWhom, setForWhom] = useState(kid?.name ? `Für ${kid.name}` : 'Für euch');
  const [who, setWho] = useState<Who>('T');
  const [remind, setRemind] = useState(0);
  const [more, setMore] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => () => actions.clearDraftSymbol(), []);

  // A symbol picked under "Alle" arrives through the store.
  useEffect(() => {
    if (!draft) return;
    setIcon(draft);
    if (isSport(draft)) {
      if (!touched) setTitle(symbolLabel(draft));
      setWhen({ date: '2026-11-03', start: '19:00', end: '20:30', repeat: 'Jeden Dienstag' });
      setPlace('Sportplatz Süd');
      setForWhom(`Für ${persons.T.name}`);
      setWho('T');
      setRemind(1);
    } else if (!touched) {
      setTitle(symbolLabel(draft));
    }
    // Taken over once; the next screen starts clean.
    actions.clearDraftSymbol();
  }, [draft]);

  const custom = !BASE.some((b) => b.icon === icon);
  const cats = useMemo(() => {
    const r = recent.filter((n) => !BASE.some((b) => b.icon === n)).map((n) => ({ icon: n, label: symbolLabel(n) }));
    return [...r, ...BASE].slice(0, 4);
  }, [recent]);

  const save = () => {
    // Pass or ID at the city office: the assistant adds what to bring, with its source.
    const pass = isPassTermin(title);
    actions.addEvent({
      bring: pass ? passBring(findCity(get().city)) : undefined,
      id: newId('e'), title: title.trim() || 'Termin', sub: place, icon, date: when.date, endDate: when.endDate,
      start: when.start ?? '00:00', end: when.end, allDay: !when.start, who, place,
      repeat: when.repeat,
      reminder: REMIND[remind],
    });
    actions.setCalDay(when.date);
    actions.setCalView('tag');
    haptics.success();
    toast(pass ? 'Termin gespeichert, Mitbringliste ergänzt' : 'Termin gespeichert');
    goBack();
    router.navigate('/kalender');
  };

  const whoBtn = (w: Who, label: string, lead: React.ReactNode) => {
    const on = who === w;
    const c = w === 'J' ? persons.J : persons.T;
    return (
      <PressScale
        key={label}
        onPress={() => { haptics.select(); setWho(w); }}
        style={{ flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: on ? c.tint : 'transparent' }}
      >
        {lead}
        <Txt size={14.5} weight={600} color={on ? c.ink : tokens.sub}>{label}</Txt>
      </PressScale>
    );
  };

  return (
    <Screen footer={<Btn label="Termin speichern" onPress={save} />}>
      <CancelBar />
      {custom ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 }}>
          <PressScale accessibilityLabel="Symbol ändern" onPress={() => router.push('/symbol')} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tint(icon), alignItems: 'center', justifyContent: 'center' }}>
            <ClayIcon name={icon} size={50} />
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
              <LineIcon name="papier" size={12} color={tokens.sub} />
            </View>
          </PressScale>
          <TitleInput value={title} onChangeText={(t) => { setTouched(true); setTitle(t); }} sub={forWhom} />
        </View>
      ) : (
        <>
          <TitleInput value={title} onChangeText={(t) => { setTouched(true); setTitle(t); }} sub={forWhom} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {cats.map((c) => {
              const on = c.icon === icon;
              return (
                <PressScale
                  key={c.icon}
                  onPress={() => { haptics.select(); setIcon(c.icon); }}
                  style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 4, borderRadius: 16, backgroundColor: on ? tint(c.icon) : tokens.row, borderWidth: 1.5, borderColor: on ? tokens.ink : 'transparent' }}
                >
                  <View style={{ opacity: on ? 1 : 0.55 }}><ClayIcon name={c.icon} size={42} /></View>
                  <Txt size={11.5} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.sub} numberOfLines={1}>{c.label}</Txt>
                </PressScale>
              );
            })}
            <PressScale onPress={() => router.push('/symbol')} style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, borderRadius: 16, backgroundColor: tokens.row }}>
              <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><LineIcon name="plus" size={22} color={tokens.sub} /></View>
              <Txt size={11.5} weight={500} color={tokens.sub}>Alle</Txt>
            </PressScale>
          </View>
        </>
      )}

      <Group>
        <WhenField key="wann" value={when} onChange={setWhen} />
        {when.repeat ? <LineRow key="rep" icon="sync" value={when.repeat} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>bis Ende März</Meta><Chevron /></View>} onPress={() => setWhen({ ...when, repeat: nextRepeat(when.repeat) })} /> : null}
        <LineRow icon="pin" value={place} right={<Chevron />} onPress={() => toast('Ortssuche kommt mit Google Maps')} />
      </Group>

      <View style={{ flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: tokens.row }}>
        {whoBtn('J', persons.J.name, <Avatar p="J" size={22} ring={who === 'J' ? '#FFFFFF' : undefined} />)}
        {whoBtn('T', persons.T.name, <Avatar p="T" size={22} ring={who === 'T' ? '#FFFFFF' : undefined} />)}
        {whoBtn('both', 'Beide', <Pair size={20} ring={tokens.row} />)}
      </View>

      <Group>
        {!isSport(icon) ? <LineRow icon="check" value="Mitnehmen" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>4 Dinge</Meta><Chevron /></View>} onPress={() => toast('U-Heft, Impfpass, Versichertenkarte, Windeln')} /> : null}
        <LineRow icon="clock" value="Erinnerung" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>{REMIND[remind]}</Meta><Chevron /></View>} onPress={() => setRemind((remind + 1) % REMIND.length)} />
      </Group>

      {more ? (
        <Group>
          {!when.repeat ? <LineRow icon="sync" value="Wiederholen" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>Nie</Meta><Chevron /></View>} onPress={() => setWhen({ ...when, repeat: nextRepeat(undefined) })} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: tokens.row }}>
            <LineIcon name="papier" size={20} color={tokens.sub} />
            <TextInput value={note} onChangeText={setNote} placeholder="Notiz" placeholderTextColor={tokens.mute} style={[{ flex: 1, fontFamily: fonts[500], fontSize: 16, color: tokens.ink, paddingVertical: 8 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
          </View>
          <LineRow icon="copy" value="Anhang" weight={500} right={<Chevron />} onPress={() => toast('Anhänge kommen später')} />
        </Group>
      ) : (
        <TextLink label="Mehr: Wiederholen, Notiz, Anhang" onPress={() => setMore(true)} />
      )}
      {custom ? <Txt size={13.5} line={19} color={tokens.sub}>{`Das Symbol merken wir uns. Nächstes Mal steht ${symbolLabel(icon)} gleich oben bei den Kategorien.`}</Txt> : null}
    </Screen>
  );
}
