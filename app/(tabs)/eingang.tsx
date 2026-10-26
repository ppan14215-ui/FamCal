/**
 * Eingang: "Neu" (what the assistant read, waiting for a yes) and
 * "Dokumente" (Infozettel, deadlines on top). A deadline is a document's date
 * and shows up in Heute and Kalender automatically.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { LinearTransition, FadeIn } from 'react-native-reanimated';
import { Screen, H1, H2, Seg, Card, Chip, Meta, Group, Row, Chevron } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Tile } from '../../src/components/ui/Clay';
import { Pair, Avatar } from '../../src/components/ui/Person';
import { tokens, persons } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { upcomingFristen } from '../../src/lib/selectors';
import { dayNum, MONTHS_SHORT, monthIdx, until } from '../../src/lib/dates';
import type { InboxItem } from '../../src/state/types';
import PressScale from '../../src/components/ui/PressScale';

export default function Eingang() {
  const inbox = useStore((s) => s.inbox);
  const [tab, setTab] = useState<'neu' | 'docs'>('neu');
  const ask = inbox.filter((i) => i.state === 'ask');
  const ok = inbox.filter((i) => i.state === 'ok');
  return (
    <Screen tab gap={12}>
      <H1 right={<PressScale accessibilityLabel="Familie und Einstellungen" onPress={() => router.push('/einstellungen')}><Pair /></PressScale>}>Eingang</H1>
      <Seg items={[{ key: 'neu', label: ask.length ? `Neu · ${ask.length}` : 'Neu' }, { key: 'docs', label: 'Dokumente' }]} value={tab} onChange={(k) => setTab(k as 'neu' | 'docs')} />
      {tab === 'neu' ? (
        <>
          <Txt size={15} line={22} color={tokens.sub} style={{ marginTop: -2 }}>Was der Assistent gelesen hat. Ihr bestätigt, er trägt ein.</Txt>
          {ask.length ? (
            <>
              <H2 right={String(ask.length)}>Zu bestätigen</H2>
              {ask.map((i) => <InboxCard key={i.id} item={i} />)}
            </>
          ) : (
            <Card pad={18}><Txt size={15} color={tokens.sub}>{ok.length ? 'Alles bestätigt.' : 'Noch nichts eingegangen.'} Neues kommt per Foto, Mail an huber-7q2@familie.app oder über Teilen.</Txt></Card>
          )}
          {ok.length ? <H2 right="diese Woche">Eingetragen</H2> : null}
          {ok.map((i) => <InboxCard key={i.id} item={i} />)}
        </>
      ) : (
        <Dokumente />
      )}
    </Screen>
  );
}

function InboxCard({ item }: { item: InboxItem }) {
  return (
    <Animated.View layout={LinearTransition.duration(200)} entering={FadeIn.duration(160)}>
      <Card pad={14} gap={10}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tile name={item.icon} size={48} radius={14} />
          <View style={{ flex: 1 }}>
            <Meta>{item.src}</Meta>
            <Txt size={16} weight={600}>{item.title}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}><Meta>{item.made}</Meta></View>
          {item.state === 'ok' ? (
            <Chip bg={tokens.doneSoft} color={tokens.done} icon={<LineIcon name="check" size={14} color={tokens.done} stroke={2.4} />}>Eingetragen</Chip>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip onPress={() => actions.confirmInbox(item.id, false)}>Nein</Chip>
              <Chip bg={tokens.doneSoft} color={tokens.done} onPress={() => actions.confirmInbox(item.id, true)}>Ja</Chip>
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

function Dokumente() {
  const docs = useStore((s) => s.docs);
  const fristen = useMemo(() => upcomingFristen(docs, 100), [docs]);
  const ben = docs.filter((d) => d.group === 'ben');
  return (
    <>
      <H2 right="nächste 3 Monate">Fristen</H2>
      <Group>
        {fristen.map((d) => (
          <Row
            key={d.id}
            icon={d.icon}
            title={d.title}
            sub={d.sub || `${dayNum(d.frist!)}. ${MONTHS_SHORT[monthIdx(d.frist!)]} · ${until(d.frist!)}`}
            subColor={d.sub ? undefined : tokens.frist}
            right={<Chevron />}
            onPress={d.route ? () => router.push(d.route as any) : undefined}
          />
        ))}
      </Group>
      <H2>Ben</H2>
      <Group>
        {ben.map((d) => (
          <Row
            key={d.id}
            icon={d.icon}
            title={d.title}
            sub={d.missing && d.who ? `fehlt · ${persons[d.who === 'J' ? 'J' : 'T'].name} kümmert sich` : d.sub}
            right={
              d.missing ? (
                d.who && d.who !== 'both' ? (
                  <PressScale onPress={() => actions.assignDoc(d.id)}><Avatar p={d.who} size={26} /></PressScale>
                ) : (
                  <Chip onPress={() => actions.assignDoc(d.id)}>Wer?</Chip>
                )
              ) : <Chevron />
            }
          />
        ))}
      </Group>
    </>
  );
}
