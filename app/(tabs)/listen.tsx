/**
 * Listen: the only place with content tabs (Julian 26.10.). Clay tabs on top:
 * Aufgaben, Einkauf, own lists (Kliniktasche, Geschenke), + Neu.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen, H1, H2, Group, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import { Pair } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import ItemRow from '../../src/components/ItemRow';
import AddInline from '../../src/components/AddInline';
import HintCard from '../../src/components/HintCard';
import { tokens, springs, swapIn, persons } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { itemMeta, itemText } from '../../src/data/sample';
import { haptics } from '../../src/lib/haptics';
import Fresh from '../../src/components/Fresh';
import type { List, Task } from '../../src/state/types';
import type { ClayName } from '../../src/lib/clayIcons';
import { tx } from '../../src/i18n/lang';

export default function Listen() {
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const active = useStore((s) => s.activeList);
  const list = lists.find((l) => l.id === active);

  const sub = useMemo(() => {
    if (active === 'aufgaben') {
      const mine = tasks.filter((t) => t.who);
      return tx(`${mine.filter((t) => !t.done).length} offen, ${mine.filter((t) => t.done).length} erledigt`, `${mine.filter((t) => !t.done).length} open, ${mine.filter((t) => t.done).length} done`);
    }
    if (!list) return '';
    const items = list.sections.flatMap((s) => s.items);
    if (list.kind === 'shopping') return tx(`${list.name} · ${items.filter((i) => !i.done).length} Dinge`, `${list.name} · ${items.filter((i) => !i.done).length} items`);
    return tx(`${list.name} · ${items.filter((i) => i.done).length} von ${items.length} gepackt`, `${list.name} · ${items.filter((i) => i.done).length} of ${items.length} packed`);
  }, [active, tasks, list]);

  return (
    <Screen tab gap={12}>
      <H1 sub={sub} right={<PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>}>{tx('Listen', 'Lists')}</H1>
      <ClayTabs lists={lists} active={active} />
      <Animated.View key={active} entering={swapIn} style={{ gap: 12 }}>
        {active === 'aufgaben' ? <Aufgaben tasks={tasks} /> : list?.kind === 'shopping' ? <Einkauf list={list} /> : list ? <Packliste list={list} /> : null}
      </Animated.View>
    </Screen>
  );
}

const HOP = 28;

function ClayTabs({ lists, active }: { lists: List[]; active: string }) {
  const tabs: { id: string; name: string; icon: ClayName }[] = [{ id: 'aufgaben', name: tx('Aufgaben', 'Tasks'), icon: 'erledigt' }, ...lists.map((l) => ({ id: l.id, name: l.name, icon: l.icon }))];
  // Every tab is as wide as its name; more lists than fit scroll sideways and
  // the chosen one slides into view (Julian 26.10.: "Schrift überlappt").
  const scroller = useRef<ScrollView>(null);
  const xs = useRef<Record<string, { x: number; w: number }>>({});
  const width = useRef(0);
  const reveal = (id: string) => {
    const t = xs.current[id];
    if (t && width.current) scroller.current?.scrollTo({ x: Math.max(0, t.x + t.w / 2 - width.current / 2), animated: true });
  };
  useEffect(() => reveal(active), [active, lists.length]);
  return (
    // A scroll view clips its content, so it gets headroom above the icons for
    // their hops and pulls itself up by the same amount (Julian 27.10.).
    <View style={{ marginHorizontal: -18, marginTop: -HOP, borderBottomWidth: 1, borderBottomColor: tokens.hair, zIndex: 2 }} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingTop: HOP, gap: 2, flexGrow: 1 }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <PressScale
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => { if (!on) { haptics.select(); actions.setActiveList(t.id); } }}
              onLayout={(e) => { xs.current[t.id] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }; if (on) reveal(t.id); }}
              style={{ minWidth: 74, flexGrow: 1, flexShrink: 0, paddingHorizontal: 8, alignItems: 'center', gap: 2, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: on ? tokens.ink : 'transparent' }}
            >
              <TabIcon icon={t.icon} on={on} />
              <Txt size={12.5} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.sub} numberOfLines={1} style={{ flexShrink: 0 }}>{t.name}</Txt>
            </PressScale>
          );
        })}
        <PressScale
          accessibilityLabel={tx('Neue Liste', 'New list')}
          onPress={() => router.push('/liste-neu')}
          style={{ width: 56, alignItems: 'center', gap: 2, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' }}
        >
          <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}><LineIcon name="plus" size={24} color={tokens.sub} /></View>
          <Txt size={12.5} color={tokens.sub}>{tx('Neu', 'New')}</Txt>
        </PressScale>
      </ScrollView>
    </View>
  );
}

/** The chosen tab lifts and its clay icon plays its story (Julian 26.10.: "bringt Leben rein"). */
function TabIcon({ icon, on }: { icon: ClayName; on: boolean }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => { v.value = withSpring(on ? 1 : 0, on ? springs.reveal : springs.smooth); }, [on]);
  const st = useAnimatedStyle((): any => ({ opacity: 0.75 + 0.25 * v.value, transform: [{ translateY: -3 * v.value }, { scale: 1 + 0.06 * v.value }] }));
  return <Animated.View style={st}><ClayIcon name={icon} size={54} celebrate={on} /></Animated.View>;
}

function Aufgaben({ tasks }: { tasks: Task[] }) {
  const hints = useStore((s) => s.hints);
  const open = tasks.filter((t) => t.who && !t.done);
  const done = tasks.filter((t) => t.who && t.done);
  const nobody = tasks.filter((t) => !t.who && !t.done);
  return (
    <>
      {hints.urlaub ? (
        <HintCard
          icon="reise"
          tile
          kicker={tx('Neu im Kalender: Ostsee, 20.–27. März', 'New in the calendar: Baltic Sea, March 20 to 27')}
          title={tx('Packliste für Urlaub mit Baby anlegen?', 'Make a packing list for a trip with the baby?')}
          body={tx('24 Dinge als Vorlage, ihr streicht, was ihr nicht braucht.', '24 things to start with, you cross out what you don\'t need.')}
          yes={tx('Ansehen', 'View')}
          no={tx('Später', 'Later')}
          onYes={() => router.push({ pathname: '/liste-neu', params: { vorschlag: 'urlaub' } })}
          onNo={() => actions.dismissHint('urlaub')}
        />
      ) : null}
      {nobody.length ? (
        <PressScale scale={0.985} onPress={() => router.push('/aufteilen')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: tokens.row }}>
          <ClayIcon name="hand-nimmt" size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={17} weight={600}>{tx(`${nobody.length} ohne Zuständigen`, `${nobody.length} with nobody on it`)}</Txt>
            <Meta>{tx('Gemeinsam aufteilen', 'Split them together')}</Meta>
          </View>
          <LineIcon name="chev" size={18} color={tokens.mute} />
        </PressScale>
      ) : null}
      <Group>
        {[...open, ...done].map((t) => (
          <Fresh key={t.id} id={t.id}>
          <ItemRow
            icon={t.icon}
            title={t.title}
            meta={t.done ? tx(`erledigt von ${persons[t.doneBy ?? 'J'].name}`, `done by ${persons[t.doneBy ?? 'J'].name}`) : t.dueLabel}
            metaColor={t.frist && !t.done ? tokens.frist : undefined}
            done={t.done}
            who={t.who}
            onToggle={() => actions.toggleTask(t.id)}
            onEdit={(txt) => actions.renameTask(t.id, txt)}
            onCycleWho={() => actions.cycleTaskWho(t.id)}
            onDelete={() => actions.deleteTask(t.id)}
            editHint={tx('Text antippen ändert den Titel', 'Tap the text to change the title')}
          />
          </Fresh>
        ))}
      </Group>
      <AddInline placeholder={tx('Aufgabe hinzufügen …', 'Add a task …')} onAdd={actions.addTask} />
      <Txt size={13.5} line={19} color={tokens.sub}>{tx('Neue Aufgaben ohne Person landen im Stapel „ohne Zuständigen“. Ihr entscheidet, wer sie übernimmt.', 'New tasks without a person go to the “nobody on it” pile. You decide who takes them.')}</Txt>
    </>
  );
}

function Einkauf({ list }: { list: List }) {
  const hints = useStore((s) => s.hints);
  return (
    <>
      <AddInline placeholder={tx('Hinzufügen …', 'Add …')} mic onPress={() => router.push('/einkauf-neu')} />
      {hints.abo ? (
        <HintCard
          icon="windeln"
          kicker={tx('Aufgefallen', 'Noticed')}
          title={tx('Windeln und Feuchttücher kauft ihr etwa alle 12 Tage.', 'You buy diapers and wipes about every 12 days.')}
          body={tx('Soll ich ein Abo für euch aufsetzen? Dann kommen sie von selbst, meist etwas günstiger. Ihr bestätigt vorher.', 'Should I set up a subscription? Then they arrive on their own, usually a bit cheaper. You confirm first.')}
          yes={tx('Ja, aufsetzen', 'Yes, set it up')}
          no={tx('Nein, danke', 'No, thanks')}
          onYes={() => router.push('/abo')}
          onNo={() => actions.dismissHint('abo')}
        />
      ) : null}
      <Sections list={list} />
      <Txt size={13.5} line={19} color={tokens.sub}>{tx('Haken antippen: erledigt. Text antippen: bearbeiten. Nach links wischen: löschen.', 'Tap the check: done. Tap the text: edit. Swipe left: delete.')}</Txt>
    </>
  );
}

function Packliste({ list }: { list: List }) {
  const items = list.sections.flatMap((s) => s.items);
  const pct = items.length ? items.filter((i) => i.done).length / items.length : 0;
  return (
    <>
      {items.length ? (
        <View style={{ height: 6, borderRadius: 999, backgroundColor: tokens.hair, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: tokens.done }} />
        </View>
      ) : null}
      <Sections list={list} counts />
      <AddInline placeholder={tx('Hinzufügen …', 'Add …')} onAdd={(t) => actions.addItem(list.id, t)} />
      <PressScale
        accessibilityLabel={tx(`Liste ${list.name} löschen`, `Delete list ${list.name}`)}
        onPress={() => { haptics.tap(); actions.deleteList(list.id); }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
      >
        <LineIcon name="x" size={16} color={tokens.frist} />
        <Txt size={15} weight={600} color={tokens.frist}>{tx('Liste löschen', 'Delete list')}</Txt>
      </PressScale>
    </>
  );
}

function Sections({ list, counts }: { list: List; counts?: boolean }) {
  return (
    <>
      {list.sections.map((sec) => {
        const open = sec.items.filter((i) => !i.done);
        const done = sec.items.filter((i) => i.done);
        if (!sec.items.length && list.kind === 'shopping') return null;
        const right = counts ? tx(`${done.length} von ${sec.items.length}`, `${done.length} of ${sec.items.length}`) : String(open.length);
        const ordered = list.kind === 'shopping' ? [...open, ...done] : sec.items;
        return (
          <View key={sec.id} style={{ gap: 12 }}>
            <H2 right={right}>{sec.title}</H2>
            {ordered.length ? (
              <Group>
                {ordered.map((i) => (
                  <Fresh key={i.id} id={i.id}>
                  <ItemRow
                    title={i.name}
                    editText={itemText(i)}
                    meta={itemMeta(i)}
                    done={i.done}
                    who={i.who}
                    onToggle={() => actions.toggleItem(list.id, i.id)}
                    onEdit={(t) => actions.editItem(list.id, i.id, t)}
                    onCycleWho={() => actions.cycleItemWho(list.id, i.id)}
                    onDelete={() => actions.deleteItem(list.id, i.id)}
                  />
                  </Fresh>
                ))}
              </Group>
            ) : (
              <Meta>{tx('Noch leer.', 'Still empty.')}</Meta>
            )}
          </View>
        );
      })}
    </>
  );
}
