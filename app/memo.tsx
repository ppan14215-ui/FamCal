/**
 * Memo, alles auf einen Blick (Julian 13.11.: "für jede Eventualität eine passende Animation"): every state, every
 * small reaction and every morph, to check the rig. Linked from the test rows in the settings. Shows nothing of the family.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Screen, BackBar, H1, H2, Chip, Btn } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import Pin from '../src/components/buddy/Pin';
import { MORPH_KINDS, type MorphKind } from '../src/components/buddy/morphs';
import { BUBBLES } from '../src/lib/look';
import { tokens } from '../src/theme';
import type { Mood } from '../src/lib/buddy';
import { tx } from '../src/i18n/lang';

const MOODS: { m: Mood; t: string }[] = [
  { m: 'idle', t: tx('Ruhe', 'Rest') }, { m: 'type', t: tx('Liest mit', 'Reads along') }, { m: 'listen', t: tx('Hört zu', 'Listens') },
  { m: 'think', t: tx('Denkt', 'Thinks') }, { m: 'sleep', t: tx('Nacht', 'Night') }, { m: 'happy', t: tx('Freut sich', 'Glad') },
];
const NAME: Record<MorphKind, string> = {
  termin: tx('Termin', 'Event'), glocke: tx('Erinnerung', 'Reminder'), korb: tx('Einkauf', 'Shopping'), sonne: tx('Ganzer Tag', 'All day'),
  kuchen: tx('Geburtstag', 'Birthday'), idee: tx('Gemerkt', 'Noted'), lupe: tx('Suche', 'Search'), pfeil: tx('Verschoben', 'Moved'),
  flieger: tx('Gesendet', 'Sent'), umschlag: tx('Wochenbrief', 'Weekly letter'), haken: tx('Alles erledigt', 'All done'), uhr: tx('Zeit zu gehen', 'Time to go'),
  koffer: tx('Urlaub', 'Holiday'), schloss: tx('Ohne KI', 'Without AI'), kette: tx('Verbunden', 'Connected'), familie: tx('Neu dabei', 'New member'),
  herz: tx('Danke', 'Thanks'), konflikt: tx('Überschneidung', 'Overlap'), offline: tx('Kein Netz', 'Offline'), eimer: tx('Gelöscht', 'Deleted'),
};

function Tile({ kind, all, color }: { kind: MorphKind; all: number; color?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { if (all) setN((v) => v + 1); }, [all]);
  return (
    <PressScale onPress={() => setN((v) => v + 1)} accessibilityLabel={NAME[kind]} style={{ width: '31%', alignItems: 'center', gap: 4, paddingTop: 22, paddingBottom: 10, borderRadius: 18, backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}` } as any}>
      <Pin size={52} joy={n} joyKind={kind} color={color} ground={tokens.row} />
      <View style={{ height: 14 }} />
      <Txt size={12.5} weight={500} color={tokens.sub} numberOfLines={1}>{NAME[kind]}</Txt>
    </PressScale>
  );
}

export default function MemoAll() {
  const [mood, setMood] = useState<Mood>('idle');
  const [ev, setEv] = useState({ joy: 0, poke: 0, tap: 0, wink: 0, sad: 0 });
  const [all, setAll] = useState(0);
  const [col, setCol] = useState<string | undefined>(undefined);
  const lvl = useSharedValue(0);
  useEffect(() => { lvl.value = withRepeat(withSequence(withTiming(0.9, { duration: 140 }), withTiming(0.2, { duration: 180 }), withTiming(0.7, { duration: 120 }), withTiming(0.05, { duration: 300 })), -1); }, []);
  const bump = (k: keyof typeof ev) => setEv((e) => ({ ...e, [k]: e[k] + 1 }));
  return (
    <Screen head={<BackBar />}>
      <H1 sub={tx('Zustände, kleine Antworten und Verwandlungen', 'States, small reactions and morphs')}>Memo</H1>
      <View style={{ alignItems: 'center', paddingVertical: 18 }}>
        <Pin size={132} mood={mood} level={lvl} joy={ev.joy} poke={ev.poke} tap={ev.tap} wink={ev.wink} sad={ev.sad} color={col} ground={tokens.bg} breathe />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {MOODS.map((x) => <Chip key={x.m} onPress={() => setMood(x.m)} bg={mood === x.m ? tokens.ink : undefined} color={mood === x.m ? tokens.onInk : tokens.ink}>{x.t}</Chip>)}
      </View>
      <H2>{tx('Kleine Antworten', 'Small reactions')}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip onPress={() => bump('joy')}>{tx('Freude', 'Joy')}</Chip>
        <Chip onPress={() => bump('poke')}>{tx('Aufgemerkt', 'Attention')}</Chip>
        <Chip onPress={() => bump('tap')}>{tx('Angestupst', 'Tapped')}</Chip>
        <Chip onPress={() => bump('wink')}>{tx('Zwinkert', 'Wink')}</Chip>
        <Chip onPress={() => bump('sad')}>{tx('Klappt nicht', 'Did not work')}</Chip>
      </View>
      <H2>{tx('Farbe', 'Colour')}</H2>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <PressScale onPress={() => setCol(undefined)} accessibilityLabel={tx('Schwarz', 'Black')} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tokens.ink, boxShadow: col ? undefined : `0 0 0 2px ${tokens.bg}, 0 0 0 4px ${tokens.ink}` } as any} />
        {BUBBLES.map((b) => <PressScale key={b.id} onPress={() => setCol(b.c)} accessibilityLabel={tx(b.de, b.en)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: b.c, boxShadow: col === b.c ? `0 0 0 2px ${tokens.bg}, 0 0 0 4px ${b.c}` : undefined } as any} />)}
      </View>
      <H2>{tx('Verwandlungen', 'Morphs')}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        {MORPH_KINDS.map((k) => <Tile key={k} kind={k} all={all} color={col} />)}
        <View style={{ width: '31%' }} />
      </View>
      <Btn label={tx('Alle abspielen', 'Play all')} primary={false} onPress={() => setAll((v) => v + 1)} />
    </Screen>
  );
}
