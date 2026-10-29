/**
 * Chat, the start tab (Julian 29.10.: "Einmal sagen. Beide wissen's."). The
 * whole family in one log: each sentence shows who said it and when, and
 * under it the card of what it made. Cards read the live calendar and lists,
 * so a tick or a changed time shows here too. Questions never land here;
 * they stay in the card above the field, seen only by whoever asked.
 */
import React, { useEffect, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { H1, Check } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Avatar, Pair } from '../../src/components/ui/Person';
import { Tile } from '../../src/components/ui/Clay';
import PressScale from '../../src/components/ui/PressScale';
import { tokens, persons } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { useDockSpace } from '../../src/lib/dockSpace';
import { useFeed, canUndo, undoEntry, type FeedEntry, type EventSnap } from '../../src/lib/feed';
import { getFamily, myRole } from '../../src/lib/sync';
import { hm, short, TODAY } from '../../src/lib/dates';
import { tx } from '../../src/i18n/lang';
import { useVeil, Step } from '../../src/components/Veil';

const at = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const dayOf = (s: string) => { const d = new Date(s); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Termine({ ids, snap }: { ids: string[]; snap?: EventSnap[] }) {
  const events = useStore((s) => s.events);
  // Live from the calendar; the snapshot only if the Termin never reached this phone.
  const live = ids.map((id) => events.find((e) => e.id === id) ?? (events.length ? undefined : snap?.find((x) => x.id === id))).filter(Boolean) as (EventSnap & { who?: typeof events[number]['who'] })[];
  if (!live.length) return <Txt size={13.5} color={tokens.mute} style={{ padding: 14 }}>{tx('Nicht mehr im Kalender.', 'No longer in the calendar.')}</Txt>;
  return (
    <>
      {live.map((e) => (
        <PressScale key={e.id} scale={0.99} onPress={() => router.push(`/termin/${e.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 12 }}>
          <Tile name={e.icon} size={48} radius={14} />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Txt size={16} line={21} weight={600} numberOfLines={2}>{e.title}</Txt>
            <Txt size={13.5} color={tokens.sub} numberOfLines={1}>{[short(e.date), e.allDay ? tx('ganztägig', 'all day') : e.end ? tx(`${hm(e.start)} bis ${hm(e.end)}`, `${hm(e.start)} to ${hm(e.end)}`) : hm(e.start), e.place].filter(Boolean).join(' · ')}</Txt>
          </View>
          {e.who === 'J' || e.who === 'T' ? <Avatar p={e.who} size={26} /> : e.who === 'both' ? <Pair size={22} ring={tokens.row} /> : null}
        </PressScale>
      ))}
    </>
  );
}

function Items({ list, ids, name, names }: { list: string; ids: string[]; name?: string; names?: string[] }) {
  const l = useStore((s) => s.lists.find((x) => x.id === list));
  // Lists still live on each phone: on the partner's phone the card shows what was added.
  if (!l || !ids.some((id) => l.sections.some((sec) => sec.items.some((i) => i.id === id)))) return (
    <>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{name ?? l?.name ?? tx('Liste', 'List')}</Txt>
      {(names ?? []).map((n, k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={false} />
          <Txt size={15} style={{ flex: 1 }}>{n}</Txt>
        </View>
      ))}
      <View style={{ height: 6 }} />
    </>
  );
  const all = l.sections.flatMap((s) => s.items);
  const live = ids.map((id) => all.find((i) => i.id === id)).filter(Boolean) as typeof all;
  return (
    <>
      <PressScale scale={0.99} onPress={() => { actions.setActiveList(l.id); router.navigate('/listen'); }} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
        <Txt size={15} weight={600}>{l.name}</Txt>
      </PressScale>
      {live.map((i) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={i.done} onPress={() => actions.toggleItem(l.id, i.id)} />
          <Txt size={15} style={{ flex: 1 }} color={i.done ? tokens.mute : tokens.ink}>{i.qty ? `${i.qty} ` : ''}{i.name}</Txt>
        </View>
      ))}
      {live.length < ids.length ? <Txt size={13} color={tokens.mute} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>{tx('Ein Teil ist nicht mehr auf der Liste.', 'Some are no longer on the list.')}</Txt> : null}
      <View style={{ height: 6 }} />
    </>
  );
}

function Tasks({ ids, titles }: { ids: string[]; titles?: string[] }) {
  const tasks = useStore((s) => s.tasks);
  const found = ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;
  const live = found.length ? found : (titles ?? []).map((title, k) => ({ id: `snap${k}`, title, done: false, who: null } as unknown as typeof tasks[number]));
  return (
    <>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{tx('Aufgaben', 'Tasks')}</Txt>
      {live.map((t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={t.done} onPress={t.id.startsWith('snap') ? undefined : () => actions.toggleTask(t.id)} />
          <Txt size={15} style={{ flex: 1 }} color={t.done ? tokens.mute : tokens.ink}>{t.title}</Txt>
          {t.who === 'J' || t.who === 'T' ? <Avatar p={t.who} size={22} /> : null}
        </View>
      ))}
      <View style={{ height: 6 }} />
    </>
  );
}

function Entry({ f, mine }: { f: FeedEntry; mine: boolean }) {
  const p = persons[f.by];
  const name = mine ? tx('Du', 'You') : p.name || f.by;
  const bubble = f.kind === 'msg'
    ? { backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }
    : { backgroundColor: p.tint };
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {mine ? null : <View style={{ marginTop: 20 }}><Avatar p={f.by} size={28} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <Txt size={12.5} color={tokens.sub}>{[name, f.kind === 'msg' ? tx('Nachricht', 'Message') : null, at(f.at)].filter(Boolean).join(' · ')}</Txt>
        <View style={[{ maxWidth: '86%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 }, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }, bubble]}>
          <Txt size={15} line={21}>{f.said}</Txt>
        </View>
        {f.kind === 'made' ? (
          <View style={{ alignSelf: 'stretch', borderRadius: 18, overflow: 'hidden', backgroundColor: tokens.row, opacity: f.undone ? 0.55 : 1 }}>
            {f.undone ? null : f.events ? <Termine ids={f.events} snap={f.snap?.events} /> : null}
            {f.undone ? null : f.items ? <Items list={f.items.list} ids={f.items.ids} name={f.snap?.list} names={f.snap?.items} /> : null}
            {f.undone ? null : f.tasks ? <Tasks ids={f.tasks} titles={f.snap?.tasks} /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: f.undone ? 0 : 1, borderTopColor: tokens.hair }}>
              <Txt size={13} weight={600} color={f.undone ? tokens.sub : tokens.done}>{f.undone ? tx('Rückgängig gemacht', 'Undone') : `✓ ${f.events ? tx('Im Kalender', 'In the calendar') : f.tasks ? tx('Bei den Aufgaben', 'On your tasks') : tx('Auf der Liste', 'On the list')}`}</Txt>
              {!f.undone && canUndo(f.id) ? (
                <PressScale hitSlop={8} onPress={() => undoEntry(f.id)}><Txt size={13} color={tokens.sub}>{tx('Rückgängig', 'Undo')}</Txt></PressScale>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** What the full screen shows elsewhere, as a card in the log (Julian 29.10.): the sentence, the plan, each step ticking off, and Halt. */
function Thinking({ by }: { by: 'J' | 'T' }) {
  const v = useVeil();
  if (!v.inline || v.phase === 'off') return null;
  return (
    <View style={{ gap: 6, alignItems: 'flex-end' }}>
      {v.said ? (
        <View style={{ maxWidth: '86%', borderRadius: 18, borderBottomRightRadius: 6, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: persons[by].tint }}>
          <Txt size={15} line={21}>{v.said}</Txt>
        </View>
      ) : null}
      <View style={{ alignSelf: 'stretch', borderRadius: 18, padding: 14, gap: 10, backgroundColor: tokens.row }}>
        {v.head ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{v.head.toUpperCase()}</Txt> : null}
        {v.lines.length ? v.lines.map((l, i) => <Step key={i} label={l} state={i < v.shown ? 'done' : i === v.shown ? 'now' : 'next'} />) : <Step label={tx('Denke nach …', 'Thinking …')} state="now" />}
        {v.head && v.onCancel && v.phase === 'think' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt size={13} color={tokens.sub}>{tx('Passiert gleich von selbst', 'Happens in a moment')}</Txt>
            <PressScale onPress={v.onCancel} hitSlop={8} accessibilityLabel={tx('Halt, nicht ausführen', "Stop, don't do it")} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={14} weight={600}>{tx('Halt, anders', 'Stop')}</Txt>
            </PressScale>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const feed = useFeed();
  const people = useStore((s) => s.people.length);
  const scroller = useRef<ScrollView>(null);
  const me = getFamily() ? myRole() : 'J';
  const veil = useVeil();
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60); }, [feed.length]);
  let lastDay = '';
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: dock + insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <H1 sub={tx(`Familie · ${2 + people} Personen`, `Family · ${2 + people} people`)} right={<PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>}>Chat</H1>
        {feed.length || veil.inline && veil.phase !== 'off' ? feed.map((f) => {
          const d = dayOf(f.at);
          const head = d !== lastDay ? (lastDay = d, d === TODAY ? tx('Heute', 'Today') : short(d)) : null;
          return (
            <React.Fragment key={f.id}>
              {head ? <View style={{ alignSelf: 'center', backgroundColor: tokens.segBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}><Txt size={12.5} color={tokens.sub}>{head}</Txt></View> : null}
              <Entry f={f} mine={f.by === me} />
            </React.Fragment>
          );
        }) : (
          <View style={{ flex: 1, justifyContent: 'center', gap: 8, paddingHorizontal: 8 }}>
            <Txt size={22} line={28} weight={700} tracking={-0.5}>{tx('Einmal sagen. Beide wissen’s.', 'Say it once. You both know.')}</Txt>
            <Txt size={15} line={22} color={tokens.sub}>{tx('Sprich oder schreib, was ansteht: „Montag 17 Uhr Essen mit Mama“ oder „Milch und Mehl“. Hier siehst du dann, was daraus wurde, und die Familie auch.', 'Say or type what’s up: “Dinner with mum Monday 5 pm” or “milk and flour”. Here you see what it became, and so does the family.')}</Txt>
          </View>
        )}
        <Thinking by={me} />
      </ScrollView>
    </View>
  );
}
