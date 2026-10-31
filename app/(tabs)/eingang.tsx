/**
 * Eingang: tx('Neu', 'New') (what the assistant read, waiting for a yes) and
 * tx('Dokumente', 'Documents') (Infozettel, deadlines on top). A deadline is a document's date
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
import { dayNum, MONTHS_SHORT, monthIdx, until, dmShort } from '../../src/lib/dates';
import type { InboxItem } from '../../src/state/types';
import PressScale from '../../src/components/ui/PressScale';
import { tx } from '../../src/i18n/lang';

export default function Eingang() {
  const inbox = useStore((s) => s.inbox);
  const [tab, setTab] = useState<'neu' | 'docs'>('neu');
  const ask = inbox.filter((i) => i.state === 'ask');
  const ok = inbox.filter((i) => i.state === 'ok');
  return (
    <Screen tab gap={12}>
      <H1 right={<PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>}>{tx('Eingang', 'Inbox')}</H1>
      <Seg items={[{ key: 'neu', label: ask.length ? tx(`Neu · ${ask.length}`, `New · ${ask.length}`) : tx('Neu', 'New') }, { key: 'docs', label: tx('Dokumente', 'Documents') }]} value={tab} onChange={(k) => setTab(k as 'neu' | 'docs')} />
      {tab === 'neu' ? (
        <>
          <Txt size={15} line={22} color={tokens.sub} style={{ marginTop: -2 }}>{tx('Was der Assistent gelesen hat. Ihr bestätigt, er trägt ein.', 'What the assistant has read. You confirm, it adds it.')}</Txt>
          {ask.length ? (
            <>
              <H2 right={String(ask.length)}>{tx('Zu bestätigen', 'To confirm')}</H2>
              {ask.map((i) => <InboxCard key={i.id} item={i} />)}
            </>
          ) : (
            <Card pad={18}><Txt size={15} color={tokens.sub}>{ok.length ? tx('Alles bestätigt.', 'All confirmed.') : tx('Noch nichts eingegangen.', 'Nothing in yet.')} {tx('Neues kommt per Foto, Mail an huber-7q2@familie.app oder über Teilen.', 'New things come by photo, mail to huber-7q2@familie.app or by sharing.')}</Txt></Card>
          )}
          {ok.length ? <H2 right={tx('diese Woche', 'this week')}>{tx('Eingetragen', 'Added')}</H2> : null}
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
            <Chip bg={tokens.doneSoft} color={tokens.done} icon={<LineIcon name="check" size={14} color={tokens.done} stroke={2.4} />}>{tx('Eingetragen', 'Added')}</Chip>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip onPress={() => actions.confirmInbox(item.id, false)}>{tx('Nein', 'No')}</Chip>
              <Chip bg={tokens.doneSoft} color={tokens.done} onPress={() => actions.confirmInbox(item.id, true)}>{tx('Ja', 'Yes')}</Chip>
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
      <H2 right={tx('nächste 3 Monate', 'next 3 months')}>{tx('Fristen', 'Deadlines')}</H2>
      <Group>
        {fristen.map((d) => (
          <Row
            key={d.id}
            icon={d.icon}
            title={d.title}
            sub={d.sub || `${dmShort(d.frist!)} · ${until(d.frist!)}`}
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
            sub={d.missing && d.who ? tx(`fehlt · ${persons[d.who === 'J' ? 'J' : 'T'].name} kümmert sich`, `missing · ${persons[d.who === 'J' ? 'J' : 'T'].name} is on it`) : d.sub}
            right={
              d.missing ? (
                d.who && d.who !== 'both' ? (
                  <PressScale onPress={() => actions.assignDoc(d.id)}><Avatar p={d.who} size={26} /></PressScale>
                ) : (
                  <Chip onPress={() => actions.assignDoc(d.id)}>{tx('Wer?', 'Who?')}</Chip>
                )
              ) : <Chevron />
            }
          />
        ))}
      </Group>
    </>
  );
}
