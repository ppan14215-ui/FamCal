/**
 * Wochenbriefing (Julian 31.10. 21:11). Opened from the Sunday 18:00 notice and from Heute: the week ahead for both,
 * where it clashes, what nobody has taken, what still needs a time, what is open and what is due for the children.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, H1, H2, Group, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { Tile } from '../src/components/ui/Clay';
import { Owner } from '../src/components/ui/Person';
import PressScale from '../src/components/ui/PressScale';
import DueOffer from '../src/components/DueOffer';
import { tokens, persons } from '../src/theme';
import { useStore } from '../src/state/store';
import { useCalEvents } from '../src/lib/useEvents';
import { weekBriefing } from '../src/lib/briefing';
import { kidsOf, useHandled } from '../src/lib/mitdenken';
import { WD_LONG, WD_SHORT, weekday, hm, short } from '../src/lib/dates';
import { haptics } from '../src/lib/haptics';
import type { CalEvent } from '../src/state/types';
import { tx } from '../src/i18n/lang';

function Line({ e, lead, right }: { e: CalEvent; lead: string; right?: React.ReactNode }) {
  return (
    <PressScale scale={0.985} onPress={() => { haptics.select(); router.push(`/termin/${e.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: tokens.row }}>
      <Txt size={13.5} weight={600} color={tokens.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ width: 48 }}>{lead}</Txt>
      <Tile name={e.icon} bg="transparent" size={32} />
      <Txt size={15.5} weight={600} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
      {right ?? <Owner who={e.who} size={22} />}
    </PressScale>
  );
}

export default function Woche() {
  const events = useCalEvents();
  const lists = useStore((s) => s.lists);
  const people = useStore((s) => s.people);
  const kid = useStore((s) => s.kid);
  const country = useStore((s) => s.country);
  const v = useHandled();
  const b = useMemo(() => weekBriefing(events, lists, kidsOf(people, kid), country), [events, lists, people, kid, country, v]);
  const busy = b.days.filter((d) => d.events.length);
  const headline = [
    tx(`${b.count} ${b.count === 1 ? 'Termin' : 'Termine'}`, `${b.count} ${b.count === 1 ? 'event' : 'events'}`),
    b.clashes.length ? tx(`${b.clashes.length} ${b.clashes.length === 1 ? 'Überschneidung' : 'Überschneidungen'}`, `${b.clashes.length} ${b.clashes.length === 1 ? 'clash' : 'clashes'}`) : '',
    b.unassigned.length ? tx(`${b.unassigned.length} ohne Zuständigen`, `${b.unassigned.length} unassigned`) : '',
  ].filter(Boolean).join(', ');
  return (
    <Screen gap={14}>
      <BackBar />
      <H1 sub={tx(`${short(b.from)} bis ${short(b.to)}`, `${short(b.from)} to ${short(b.to)}`)}>{tx('Eure Woche', 'Your week')}</H1>
      <Txt size={18} line={25} weight={600}>{headline}{b.clashes.length || b.unassigned.length || b.noTime.length ? '' : tx('. Alles verteilt.', '. All sorted.')}</Txt>

      {b.clashes.length ? (
        <View style={{ gap: 8 }}>
          <H2>{tx('Überschneidungen', 'Clashes')}</H2>
          <Group>
            {b.clashes.map((c) => (
              <View key={`${c.a.id}-${c.b.id}`} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 2, backgroundColor: tokens.row }}>
                <Txt size={15.5} weight={600}>{`${persons[c.who].name}: ${c.a.title} ${tx('und', 'and')} ${c.b.title}`}</Txt>
                <Meta color={tokens.frist}>{`${WD_LONG[weekday(c.a.date)]}, ${hm(c.a.start)}${c.a.end ? `–${hm(c.a.end)}` : ''} ${tx('und', 'and')} ${hm(c.b.start)}`}</Meta>
              </View>
            ))}
          </Group>
        </View>
      ) : null}

      {b.unassigned.length ? (
        <View style={{ gap: 8 }}>
          <H2>{tx('Wer geht?', "Who's going?")}</H2>
          <Group>{b.unassigned.map((e) => <Line key={e.id} e={e} lead={WD_SHORT[weekday(e.date)]} right={<Txt size={13} weight={600} color={tokens.done}>{tx('Wer?', 'Who?')}</Txt>} />)}</Group>
        </View>
      ) : null}

      {b.noTime.length ? (
        <View style={{ gap: 8 }}>
          <H2>{tx('Noch ohne Uhrzeit', 'Still without a time')}</H2>
          <Group>{b.noTime.map((e) => <Line key={e.id} e={e} lead={WD_SHORT[weekday(e.date)]} />)}</Group>
        </View>
      ) : null}

      {b.due.length ? (
        <View style={{ gap: 8 }}>
          <H2>{tx('Mitgedacht', 'Thought ahead')}</H2>
          <Group style={{ paddingHorizontal: 14, backgroundColor: tokens.row }}>{b.due.map((d) => <DueOffer key={d.key} d={d} />)}</Group>
        </View>
      ) : null}

      {b.todos.length ? (
        <View style={{ gap: 8 }}>
          <H2>{tx(`Noch offen (${b.todos.length})`, `Still open (${b.todos.length})`)}</H2>
          <Group>
            {b.todos.slice(0, 6).map((t) => (
              <View key={t.id} style={{ paddingVertical: 11, paddingHorizontal: 14, backgroundColor: tokens.row }}><Txt size={15.5} weight={500} numberOfLines={1}>{t.name}</Txt></View>
            ))}
          </Group>
        </View>
      ) : null}

      <H2>{tx('Tag für Tag', 'Day by day')}</H2>
      {busy.length ? busy.map((d) => (
        <View key={d.date} style={{ gap: 6 }}>
          <Txt size={13} weight={600} tracking={0.5} color={tokens.sub}>{short(d.date).toUpperCase()}</Txt>
          <Group>{d.events.map((e) => <Line key={`${d.date}-${e.id}`} e={e} lead={e.allDay ? tx('Tag', 'Day') : hm(e.start)} />)}</Group>
        </View>
      )) : <Meta>{tx('Die Woche ist noch frei.', 'The week is still free.')}</Meta>}
    </Screen>
  );
}
