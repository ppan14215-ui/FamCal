/**
 * Neuer Termin (Variante B, Julian 26.10.). Visible is what almost everyone
 * needs: title, when, where, who. The rest is one line with value and arrow,
 * rare things sit under "Mehr". Four categories + "Alle" opens every clay
 * icon; picked symbols move to the front next time.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, CancelBar, Btn, Group, LineRow, Meta, Chevron, TextLink } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import { Avatar, Pair } from '../src/components/ui/Person';
import { TitleInput } from '../src/components/Field';
import { tokens, tint, persons, fonts } from '../src/theme';
import { useStore, actions, toast } from '../src/state/store';
import { addDays, short, hm } from '../src/lib/dates';
import { haptics } from '../src/lib/haptics';
import { symbolLabel, isSport } from '../src/data/symbols';
import { newId } from '../src/data/sample';
import type { ClayName } from '../src/lib/clayIcons';
import type { Who } from '../src/state/types';

const BASE: { icon: ClayName; label: string }[] = [
  { icon: 'stethoskop', label: 'Arzt' },
  { icon: 'vertrag', label: 'Amt' },
  { icon: 'geburtstag', label: 'Familie' },
  { icon: 'yogamatte', label: 'Kurs' },
];
const REMIND = ['1 Tag vorher', '1 Stunde vorher', 'Keine'];
const REPEAT = ['Nie', 'Jede Woche', 'Alle 2 Wochen', 'Jeden Monat'];

export default function TerminNeu() {
  const draft = useStore((s) => s.draftSymbol);
  const recent = useStore((s) => s.recentSymbols);
  const [icon, setIcon] = useState<ClayName>('stethoskop');
  const [title, setTitle] = useState('U5 bei Dr. Weber');
  const [touched, setTouched] = useState(false);
  const [date, setDate] = useState('2026-11-12');
  const [time, setTime] = useState<[string, string]>(['09:30', '10:15']);
  const [place, setPlace] = useState('Kinderarztpraxis Weber');
  const [forWhom, setForWhom] = useState('Für Ben');
  const [who, setWho] = useState<Who>('T');
  const [remind, setRemind] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [more, setMore] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => () => actions.clearDraftSymbol(), []);

  // A symbol picked under "Alle" arrives through the store.
  useEffect(() => {
    if (!draft) return;
    setIcon(draft);
    if (isSport(draft)) {
      if (!touched) setTitle(symbolLabel(draft));
      setDate('2026-11-03');
      setTime(['19:00', '20:30']);
      setPlace('Sportplatz Süd');
      setForWhom('Für Tom');
      setWho('T');
      setRemind(1);
      setRepeat(1);
    } else if (!touched) {
      setTitle(symbolLabel(draft));
    }
  }, [draft]);

  const custom = !BASE.some((b) => b.icon === icon);
  const cats = useMemo(() => {
    const r = recent.filter((n) => !BASE.some((b) => b.icon === n)).map((n) => ({ icon: n, label: symbolLabel(n) }));
    return [...r, ...BASE].slice(0, 4);
  }, [recent]);

  const save = () => {
    actions.addEvent({
      id: newId('e'), title: title.trim() || 'Termin', sub: place, icon, date, start: time[0], end: time[1], who, place,
      repeat: repeat ? (isSport(icon) ? `Jeden ${['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(date).getUTCDay()]}` : REPEAT[repeat]) : undefined,
      reminder: REMIND[remind],
    });
    actions.setCalDay(date);
    actions.setCalView('tag');
    haptics.success();
    toast('Termin gespeichert');
    router.back();
    router.navigate('/kalender');
  };

  const whoBtn = (w: Who, label: string, lead: React.ReactNode) => {
    const on = who === w;
    const c = w === 'J' ? persons.J : persons.T;
    return (
      <Pressable
        key={label}
        onPress={() => { haptics.select(); setWho(w); }}
        style={{ flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: on ? c.tint : 'transparent' }}
      >
        {lead}
        <Txt size={14.5} weight={600} color={on ? c.ink : tokens.sub}>{label}</Txt>
      </Pressable>
    );
  };

  return (
    <Screen footer={<Btn label="Termin speichern" onPress={save} />}>
      <CancelBar />
      {custom ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 }}>
          <Pressable accessibilityLabel="Symbol ändern" onPress={() => router.push('/symbol')} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tint(icon), alignItems: 'center', justifyContent: 'center' }}>
            <ClayIcon name={icon} size={50} />
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
              <LineIcon name="papier" size={12} color={tokens.sub} />
            </View>
          </Pressable>
          <TitleInput value={title} onChangeText={(t) => { setTouched(true); setTitle(t); }} sub={forWhom} />
        </View>
      ) : (
        <>
          <TitleInput value={title} onChangeText={(t) => { setTouched(true); setTitle(t); }} sub={forWhom} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {cats.map((c) => {
              const on = c.icon === icon;
              return (
                <Pressable
                  key={c.icon}
                  onPress={() => { haptics.select(); setIcon(c.icon); }}
                  style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 4, borderRadius: 16, backgroundColor: on ? tint(c.icon) : tokens.row, borderWidth: 1.5, borderColor: on ? tokens.ink : 'transparent' }}
                >
                  <View style={{ opacity: on ? 1 : 0.55 }}><ClayIcon name={c.icon} size={34} /></View>
                  <Txt size={11.5} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.sub} numberOfLines={1}>{c.label}</Txt>
                </Pressable>
              );
            })}
            <Pressable onPress={() => router.push('/symbol')} style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, borderRadius: 16, backgroundColor: tokens.row }}>
              <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><LineIcon name="plus" size={22} color={tokens.sub} /></View>
              <Txt size={11.5} weight={500} color={tokens.sub}>Alle</Txt>
            </Pressable>
          </View>
        </>
      )}

      <Group>
        <LineRow icon="clock" value={`${short(date)} · ${hm(time[0])}–${hm(time[1])}`} onPress={() => setDate(addDays(date, 1))} right={<Meta>+1 Tag</Meta>} />
        {repeat ? <LineRow icon="sync" value={isSport(icon) ? 'Jeden Dienstag' : REPEAT[repeat]} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>bis Ende März</Meta><Chevron /></View>} onPress={() => setRepeat((repeat + 1) % REPEAT.length)} /> : null}
        <LineRow icon="pin" value={place} right={<Chevron />} onPress={() => toast('Ortssuche kommt mit Google Maps')} />
      </Group>

      <View style={{ flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: tokens.row }}>
        {whoBtn('J', 'Julia', <Avatar p="J" size={22} ring={who === 'J' ? '#FFFFFF' : undefined} />)}
        {whoBtn('T', 'Tom', <Avatar p="T" size={22} ring={who === 'T' ? '#FFFFFF' : undefined} />)}
        {whoBtn('both', 'Beide', <Pair size={20} ring={tokens.row} />)}
      </View>

      <Group>
        {!isSport(icon) ? <LineRow icon="check" value="Mitnehmen" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>4 Dinge</Meta><Chevron /></View>} onPress={() => toast('U-Heft, Impfpass, Versichertenkarte, Windeln')} /> : null}
        <LineRow icon="clock" value="Erinnerung" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>{REMIND[remind]}</Meta><Chevron /></View>} onPress={() => setRemind((remind + 1) % REMIND.length)} />
      </Group>

      {more ? (
        <Group>
          {!repeat ? <LineRow icon="sync" value="Wiederholen" weight={500} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Meta>{REPEAT[repeat]}</Meta><Chevron /></View>} onPress={() => setRepeat((repeat + 1) % REPEAT.length)} /> : null}
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
