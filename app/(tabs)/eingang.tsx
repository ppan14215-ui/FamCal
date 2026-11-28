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

export function InboxCard({ item }: { item: InboxItem }) {
  // Brand (27.11.): what waits for a yes lies on the soft grey on top of the chat, with one dark and one white pill.
  const ok = item.state === 'ok';
  return (
    <Animated.View layout={LinearTransition.duration(200)} entering={FadeIn.duration(160)}>
      <View style={{ backgroundColor: tokens.group, borderRadius: 16, padding: 18, gap: 4 }}>
        <Txt size={13.5} line={18} weight={500} color={tokens.sub}>{ok ? tx('Eingetragen', 'Added') : tx('Zu bestätigen', 'To confirm')}</Txt>
        <Txt size={17} line={22} weight={700} tracking={-0.25}>{item.title}</Txt>
        <Txt size={13.5} line={18} color={tokens.sub}>{[item.src, item.made].filter(Boolean).join(' · ')}</Txt>
        {ok ? null : (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <PressScale scale={0.96} accessibilityRole="button" onPress={() => actions.confirmInbox(item.id, true)} style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: tokens.ink, justifyContent: 'center' }}>
              <Txt size={15} line={20} weight={600} color="#FFFFFF">{tx('Eintragen', 'Add')}</Txt>
            </PressScale>
            <PressScale scale={0.96} accessibilityRole="button" onPress={() => actions.confirmInbox(item.id, false)} style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
              <Txt size={15} line={20} weight={500}>{tx('Nein', 'No')}</Txt>
            </PressScale>
          </View>
        )}
      </View>
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
