/** Termin: clay stage on top, who goes, what to bring, where it came from. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { BackBar, Card, Chip, Meta, Check, Hint } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { ClayIcon } from '../../src/components/ui/Clay';
import { Owner } from '../../src/components/ui/Person';
import AddInline from '../../src/components/AddInline';
import { tokens, tint, persons } from '../../src/theme';
import { useStore, actions, toast, get } from '../../src/state/store';
import WhenField from '../../src/components/WhenField';
import { whenLine, When } from '../../src/lib/when';
import { WD_SHORT, weekday, hm, minutes } from '../../src/lib/dates';
import type { CalEvent } from '../../src/state/types';
import { haptics } from '../../src/lib/haptics';
import type { Who } from '../../src/state/types';

const NEXT: Record<string, Who> = { T: 'J', J: 'both', both: null, null: 'T' };

function whoLine(who: Who, title: string): { t: string; s: string } {
  const kid = get().kid?.name;
  const withKid = !!kid && /U\d|Impf|Pass|Arzt|Dr\./.test(title);
  const go = (p: 'J' | 'T') => (withKid ? `${persons[p].name} bringt ${kid}` : `${persons[p].name} geht hin`);
  if (who === 'T') return { t: go('T'), s: 'selbst übernommen' };
  if (who === 'J') return { t: go('J'), s: 'selbst übernommen' };
  if (who === 'both') return { t: 'Ihr geht beide', s: 'zusammen' };
  return { t: 'Noch niemand', s: 'Wer geht hin?' };
}

const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

export default function Termin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const insets = useSafeAreaInsets();
  const all = useStore((s) => s.events);
  const [draft, setDraft] = useState<When | null>(null);
  if (!e) return null;
  const now: When = { date: e.date, endDate: e.endDate, start: e.allDay ? undefined : e.start, end: e.end, repeat: e.repeat };
  // Moving keeps the duration when only the start changes.
  const change = (w: When) => {
    const d = e.end && !e.allDay ? minutes(e.end) - minutes(e.start) : 0;
    const keep = w.start && !w.end && d > 0 ? { ...w, end: addMin(w.start, d) } : w;
    setDraft(keep);
  };
  const done = () => {
    if (!draft || whenLine(draft) === whenLine(now)) return setDraft(null);
    const before = actions.moveEvent(e.id, draft);
    setDraft(null);
    toast(`Verschoben auf ${WD_SHORT[weekday(draft.date)]}${draft.start ? ' ' + hm(draft.start) : ''}`, before ? () => actions.restoreEvent(before) : undefined);
  };
  const overlap = (w: When) => {
    if (!w.start) return undefined;
    const a = minutes(w.start); const b = w.end ? minutes(w.end) : a + 30;
    const o = all.find((x: CalEvent) => x.id !== e.id && !x.work && x.date === w.date && minutes(x.start) < b && (x.end ? minutes(x.end) : minutes(x.start) + 30) > a);
    if (!o) return undefined;
    const name = o.who === 'J' ? persons.J.name : o.who === 'T' ? persons.T.name : o.who === 'both' ? 'ihr beide' : 'noch niemand';
    return `Gleichzeitig: ${o.title}, ${name}, ${hm(o.start)}${o.end ? ' bis ' + hm(o.end) : ''}.`;
  };
  const w = whoLine(e.who, e.title);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 34 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: tint(e.icon), paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 18 }}><BackBar /></View>
        <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon name={e.icon} size={160} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Txt size={30} line={36} weight={700} tracking={-0.8}>{e.title}<Dot /></Txt>
          {e.place || e.sub ? <Meta>{e.place ?? e.sub}</Meta> : null}
        </View>
        <WhenField card value={draft ?? now} onChange={change} onDone={done} extra={overlap} />
        <Card pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Owner who={e.who} size={32} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight={600}>{w.t}</Txt>
              <Meta>{w.s}</Meta>
            </View>
            <Chip onPress={() => { haptics.select(); actions.setEventWho(e.id, NEXT[String(e.who)]); }}>Ändern</Chip>
          </View>
        </Card>
        <Card pad={14} gap={10}>
          <Txt size={13} weight={600} color={tokens.sub}>Mitnehmen</Txt>
          {(e.bring ?? []).map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Check done={b.done} onPress={() => actions.toggleBring(e.id, b.id)} />
              <Txt size={15} strike={b.done} color={b.done ? tokens.mute : tokens.ink}>{b.t}</Txt>
            </View>
          ))}
          <View style={{ marginHorizontal: -14, marginBottom: -14 }}>
            <AddInline placeholder="Hinzufügen" onAdd={(t) => actions.addBring(e.id, t)} />
          </View>
        </Card>
        {e.source ? <Hint icon="sparkle">{e.source}</Hint> : null}
      </View>
    </ScrollView>
  );
}
