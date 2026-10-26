/**
 * Heute: no tabs (Julian 26.10.), only what is due today and soon: events,
 * tasks due today, deadlines that are getting close.
 */
import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, H1, H2, Group, Row, Meta, Chevron, Check } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import { Avatar, Pair, Owner } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import { tokens, persons } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { eventsOn, nextEvent, tasksDueToday, upcomingFristen } from '../../src/lib/selectors';
import { TODAY, long, soon, hm, count, until, dayNum, MONTHS_SHORT, monthIdx } from '../../src/lib/dates';

export default function Heute() {
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);

  const today = useMemo(() => eventsOn(events, TODAY, false), [events]);
  const hero = useMemo(() => nextEvent(events), [events]);
  const due = useMemo(() => tasksDueToday(tasks), [tasks]);
  const fristen = useMemo(() => upcomingFristen(docs, 60), [docs]);
  const rest = today.filter((e) => e.id !== hero?.id);

  const sentence = `${count(today.length, 'Termin', 'Termine', true)}, ${count(due.length, 'Aufgabe', 'Aufgaben')}${fristen.length ? ` und ${fristen.length === 1 ? 'eine Frist, die näher rückt' : count(fristen.length, 'Frist', 'Fristen') + ', die näher rücken'}` : ''}.`;

  return (
    <Screen tab gap={14}>
      <H1 sub={long(TODAY)} right={<Pressable accessibilityLabel="Familie und Einstellungen" onPress={() => router.push('/einstellungen')}><Pair /></Pressable>}>Heute</H1>
      <Txt size={20} line={27} weight={600} tracking={-0.3} style={{ marginTop: -4 }}>{sentence}</Txt>

      {hero ? (
        <PressScale scale={0.985} onPress={() => router.push(`/termin/${hero.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: tokens.row }}>
          <Tile name={hero.icon} size={64} radius={18} />
          <View style={{ flex: 1, gap: 2 }}>
            <Meta color={tokens.done}>{soon(hero.date, hero.start)}</Meta>
            <Txt size={19} weight={700} tracking={-0.3}>{hero.title}</Txt>
            {hero.who && hero.who !== 'both' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Avatar p={hero.who} size={18} />
                <Meta>{hero.sub ?? persons[hero.who].name}</Meta>
              </View>
            ) : hero.sub ? <Meta>{hero.sub}</Meta> : null}
          </View>
          <Chevron />
        </PressScale>
      ) : null}

      {rest.length || due.length ? (
        <Group>
          {rest.map((e) => (
            <Row key={e.id} icon={e.icon} title={e.title} sub={e.sub} time={hm(e.start)} onPress={() => router.push(`/termin/${e.id}`)} right={<Owner who={e.who} />} />
          ))}
          {due.map((t) => (
            <Row key={t.id} icon="erledigt" title={t.title} sub={`Aufgabe · ${t.dueLabel}`} time="" strike={t.done} right={<View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Owner who={t.who} /><Check done={t.done} onPress={() => actions.toggleTask(t.id)} /></View>} />
          ))}
        </Group>
      ) : null}

      {fristen.length ? (
        <>
          <H2>Bald fällig</H2>
          <Group>
            {fristen.map((d) => (
              <Row
                key={d.id}
                icon={d.icon}
                title={d.title}
                sub={`Frist ${dayNum(d.frist!)}. ${MONTHS_SHORT[monthIdx(d.frist!)]} · ${until(d.frist!)}`}
                subColor={tokens.frist}
                right={<Owner who={d.who ?? null} />}
                onPress={d.route ? () => router.push(d.route as any) : undefined}
              />
            ))}
          </Group>
        </>
      ) : null}
    </Screen>
  );
}
