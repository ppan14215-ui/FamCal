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
import { Pair, Avatar } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import ItemRow from '../../src/components/ItemRow';
import AddInline from '../../src/components/AddInline';
import HintCard from '../../src/components/HintCard';
import { tokens, springs, swapIn, persons } from '../../src/theme';
import { useStore, actions, toast } from '../../src/state/store';
import { itemMeta, itemText, aisleOf } from '../../src/data/sample';
import { haptics } from '../../src/lib/haptics';
import Fresh from '../../src/components/Fresh';
import { Cover, Stars, Score, SeenPill, FactChips, factLine, hasBlock } from '../../src/components/Blocks';
import { myRole } from '../../src/lib/sync';
import type { List, Task, Item, Blueprint } from '../../src/state/types';
import type { ClayName } from '../../src/lib/clayIcons';
import { isPoints, players, roundsOf, total } from '../../src/lib/points';
import HeaderRight from '../../src/components/ui/HeaderRight';
import { tx } from '../../src/i18n/lang';
import { HIDDEN } from '../../src/lib/core';

export default function Listen() {
  const all = useStore((s) => s.lists);
  const lists = useMemo(() => (HIDDEN.points ? all.filter((l) => !isPoints(l)) : all), [all]);
  const tasks = useStore((s) => s.tasks);
  const chosen = useStore((s) => s.activeList);
  // Without the Aufgaben tab (Julian 30.10.) a hidden or missing choice opens the first list.
  const active = (HIDDEN.tasks && chosen === 'aufgaben') || (chosen !== 'aufgaben' && !lists.some((l) => l.id === chosen)) ? lists[0]?.id ?? 'aufgaben' : chosen;
  const list = lists.find((l) => l.id === active);

  const sub = useMemo(() => {
    if (active === 'aufgaben') {
      const mine = tasks.filter((t) => t.who);
      return tx(`${mine.filter((t) => !t.done).length} offen, ${mine.filter((t) => t.done).length} erledigt`, `${mine.filter((t) => !t.done).length} open, ${mine.filter((t) => t.done).length} done`);
    }
    if (!list) return '';
    const items = list.sections.flatMap((s) => s.items);
    if (list.blueprint && list.blueprint.blocks.includes('seen')) { const n = items.filter((i) => i.data?.seen).length; return tx(`${list.name} · ${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'}, ${n} ${(list.blueprint.seenLabel ?? 'erledigt').toLowerCase()}`, `${list.name} · ${items.length} ${items.length === 1 ? 'entry' : 'entries'}, ${n} ${(list.blueprint.seenLabel ?? 'done').toLowerCase()}`); }
    if (list.kind === 'collection' || list.blueprint) return tx(`${list.name} · ${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'}`, `${list.name} · ${items.length} ${items.length === 1 ? 'entry' : 'entries'}`);
    if (list.kind === 'shopping') return tx(`${list.name} · ${items.filter((i) => !i.done).length} Dinge`, `${list.name} · ${items.filter((i) => !i.done).length} items`);
    return tx(`${list.name} · ${items.filter((i) => i.done).length} von ${items.length} gepackt`, `${list.name} · ${items.filter((i) => i.done).length} of ${items.length} packed`);
  }, [active, tasks, list]);

  return (
    <Screen tab gap={12} head={<><H1 sub={sub} right={<HeaderRight />}>{tx('Listen', 'Lists')}</H1><ClayTabs lists={lists} active={active} /></>}>
      <Animated.View key={active} entering={swapIn} style={{ gap: 12 }}>
        {active === 'aufgaben' ? <Aufgaben tasks={tasks} /> : list?.kind === 'shopping' ? <Einkauf list={list} /> : list ? <Packliste list={list} /> : null}
      </Animated.View>
    </Screen>
  );
}

const HOP = 28;

function ClayTabs({ lists, active }: { lists: List[]; active: string }) {
  const tabs: { id: string; name: string; icon: ClayName }[] = [...(HIDDEN.tasks ? [] : [{ id: 'aufgaben', name: tx('Aufgaben', 'Tasks'), icon: 'erledigt' as ClayName }]), ...lists.map((l) => ({ id: l.id, name: l.name, icon: l.icon }))];
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
              // Hold a tab to rename the list or change its icon (Julian 30.10.).
              onLongPress={t.id === 'aufgaben' ? undefined : () => { haptics.tap(); router.push({ pathname: '/liste-bearbeiten', params: { id: t.id } }); }}
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
      <Balance tasks={tasks} />
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

/**
 * Wer macht's (Julian 29.10.): who did how much this week and who has what open,
 * so the invisible work is seen and split fairly. Shows only once tasks have people.
 */
function Balance({ tasks }: { tasks: Task[] }) {
  const week = Date.now() - 7 * 864e5;
  const row = (p: 'J' | 'T') => ({
    p,
    done: tasks.filter((t) => t.done && t.doneBy === p && (!t.doneAt || Date.parse(t.doneAt) >= week)).length,
    open: tasks.filter((t) => !t.done && (t.who === p || t.who === 'both')).length,
  });
  const rows = [row('J'), row('T')];
  const total = rows[0].done + rows[1].done;
  if (!total && !rows[0].open && !rows[1].open) return null;
  const share = total ? rows[0].done / total : 0.5;
  return (
    <View style={{ gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: tokens.row }}>
      <Txt size={15} weight={600}>{tx('Wer macht was, diese Woche', 'Who does what, this week')}</Txt>
      <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: tokens.chipBg }}>
        {total ? (
          <>
            <View style={{ flex: share, backgroundColor: persons.J.ink }} />
            <View style={{ flex: 1 - share, backgroundColor: persons.T.ink }} />
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {rows.map((r) => (
          <View key={r.p} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar p={r.p} size={26} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14.5} weight={600} numberOfLines={1}>{persons[r.p].name}</Txt>
              <Meta>{tx(`${r.done} erledigt · ${r.open} offen`, `${r.done} done · ${r.open} open`)}</Meta>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Einkauf({ list }: { list: List }) {
  const hints = useStore((s) => s.hints);
  // Twins from before the merge rule (Julian 30.10.: "Mais" twice, "Zwiebel" and "Zwiebeln") fold once, with an undo.
  useEffect(() => { actions.mergeTwins(list.id); }, [list.id]);
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
  const plain = list.kind === 'collection' || !!list.blueprint;
  return (
    <>
      {items.length && !plain ? (
        <View style={{ height: 6, borderRadius: 999, backgroundColor: tokens.hair, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: tokens.done }} />
        </View>
      ) : null}
      {isPoints(list) ? <Scoreboard list={list} /> : null}
      <Sections list={list} counts={!plain} />
      <AddInline placeholder={isPoints(list) ? tx('Spieler hinzufügen …', 'Add player …') : tx('Hinzufügen …', 'Add …')} onAdd={(t) => actions.addItem(list.id, t)} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28 }}>
        <PressScale
          accessibilityLabel={tx(`Liste ${list.name} bearbeiten`, `Edit list ${list.name}`)}
          onPress={() => { haptics.select(); router.push({ pathname: '/liste-bearbeiten', params: { id: list.id } }); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 }}
        >
          <Txt size={15} weight={600} color={tokens.sub}>✎</Txt>
          <Txt size={15} weight={600} color={tokens.sub}>{tx('Bearbeiten', 'Edit')}</Txt>
        </PressScale>
        <PressScale
          accessibilityLabel={tx(`Liste ${list.name} löschen`, `Delete list ${list.name}`)}
          onPress={() => { haptics.tap(); actions.deleteList(list.id); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 }}
        >
          <LineIcon name="x" size={16} color={tokens.frist} />
          <Txt size={15} weight={600} color={tokens.frist}>{tx('Liste löschen', 'Delete list')}</Txt>
        </PressScale>
      </View>
    </>
  );
}

/**
 * The table of a points list (Julian 30.10.: Rommé): who leads, how many rounds, and the
 * sentence to say next. A new game keeps the players and clears the points.
 */
function Scoreboard({ list }: { list: List }) {
  const ps = players(list);
  const n = roundsOf(list);
  const low = !!list.blueprint?.points?.lowWins;
  const sorted = [...ps].sort((a, b) => (low ? total(a) - total(b) : total(b) - total(a)));
  const lead = n ? sorted[0] : undefined;
  const example = ps.length ? ps.slice(0, 2).map((p, i) => `${p.name} ${i ? 12 : 35}`).join(', ') : tx('Julian 35, Sophia 12', 'Julian 35, Sophia 12');
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 22, backgroundColor: tokens.row }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt size={13} weight={600} color={tokens.sub}>{n ? tx(`Nach ${n} ${n === 1 ? 'Runde' : 'Runden'}`, `After ${n} ${n === 1 ? 'round' : 'rounds'}`) : tx('Noch keine Runde', 'No round yet')}</Txt>
        {n ? (
          <PressScale hitSlop={8} onPress={() => { haptics.tap(); const before = ps.map((p) => [p.id, p.data?.rounds ?? []] as const); ps.forEach((p) => actions.setItemData(list.id, p.id, { rounds: [] })); toast(tx('Neue Partie, Punkte auf null', 'New game, points reset'), () => before.forEach(([id, r]) => actions.setItemData(list.id, id, { rounds: [...r] }))); }}>
            <Txt size={13} weight={600} color={tokens.sub}>{tx('Neue Partie', 'New game')}</Txt>
          </PressScale>
        ) : null}
      </View>
      {lead ? <Txt size={22} line={28} weight={700} tracking={-0.4}>{tx(`${lead.name} führt mit ${total(lead)}`, `${lead.name} leads with ${total(lead)}`)}</Txt> : null}
      {n ? (
        <View style={{ gap: 6 }}>
          {sorted.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt size={15} weight={700} color={tokens.sub} style={{ width: 18 }}>{i + 1}</Txt>
              <Txt size={15.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>{p.name}</Txt>
              <Txt size={13} color={tokens.mute} numberOfLines={1}>{(p.data?.rounds ?? []).slice(-4).join(' · ')}</Txt>
              <Txt size={17} weight={700} style={{ minWidth: 44, textAlign: 'right' }}>{total(p)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      <Txt size={13.5} line={19} color={tokens.sub}>{tx(`Sag einfach „${example}“. ${list.blueprint?.points?.doubleWord ? '„Hand“ oder „auf einmal raus“ zählt die Runde doppelt. ' : ''}${low ? 'Wenig Punkte gewinnt.' : 'Viele Punkte gewinnt.'}`, `Just say “${example}”. ${list.blueprint?.points?.doubleWord ? '“Hand” or “all at once” doubles the round. ' : ''}${low ? 'Fewest points win.' : 'Most points win.'}`)}</Txt>
    </View>
  );
}

function Sections({ list, counts }: { list: List; counts?: boolean }) {
  return (
    <>
      {list.sections.map((sec) => {
        const open = sec.items.filter((i) => !i.done);
        const done = sec.items.filter((i) => i.done);
        if (!sec.items.length && list.kind === 'shopping') return null;
        const plain = list.kind === 'collection' || !!list.blueprint;
        const bp = list.blueprint;
        const right = plain ? String(sec.items.length) : counts ? tx(`${done.length} von ${sec.items.length}`, `${done.length} of ${sec.items.length}`) : String(open.length);
        // The shop's own order: vegetables together, then bread, fridge, meat, shelves (Julian 30.10.).
        const ordered = list.kind === 'shopping' ? [...open.map((i, k) => ({ i, k, a: aisleOf(i.name) })).sort((x, y) => x.a - y.a || x.k - y.k).map((x) => x.i), ...done] : sec.items;
        return (
          <View key={sec.id} style={{ gap: 12 }}>
            {plain && list.sections.length === 1 ? null : <H2 right={right}>{sec.title}</H2>}
            {ordered.length ? (
              <Group>
                {ordered.map((i) => (
                  <Fresh key={i.id} id={i.id}>
                  <ItemRow
                    title={i.name}
                    editText={itemText(i)}
                    meta={bp ? factLine(bp, i.data) : itemMeta(i)}
                    done={plain ? false : i.done}
                    noCheck={plain}
                    dim={bp ? !!i.data?.seen : false}
                    lead={bp && hasBlock(bp, 'cover') ? <Cover title={i.name} data={i.data} onPress={bp.source ? () => router.push({ pathname: '/titel', params: { l: list.id, i: i.id } }) : undefined} /> : undefined}
                    below={bp ? <BlockBelow listId={list.id} bp={bp} item={i} /> : undefined}
                    trailing={bp && hasBlock(bp, 'seen') ? <SeenPill label={bp.seenLabel ?? tx('Erledigt', 'Done')} seen={i.data?.seen} onToggle={() => actions.setItemData(list.id, i.id, { seen: !i.data?.seen })} /> : undefined}
                    who={i.who}
                    onToggle={() => actions.toggleItem(list.id, i.id)}
                    onEdit={(t) => actions.editItem(list.id, i.id, t)}
                    onCycleWho={plain ? undefined : () => actions.cycleItemWho(list.id, i.id)}
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

/** Stars and short facts under the title of a row in a list that adapts. */
function BlockBelow({ listId, bp, item }: { listId: string; bp: Blueprint; item: Item }) {
  // Films and series get a score out of 10 instead of stars (Julian 29.10.).
  const me = myRole();
  const stars = HIDDEN.ratings ? null : bp.source === 'movies'
    ? <Score scores={item.data?.scores} me={me} onChange={(n) => actions.setItemData(listId, item.id, { scores: { ...item.data?.scores, [me]: n } })} />
    : hasBlock(bp, 'stars') ? <Stars value={item.data?.stars} onChange={(n) => actions.setItemData(listId, item.id, { stars: n })} /> : null;
  const chips = <FactChips bp={bp} data={item.data} note={item.note} />;
  if (!stars && !chips) return null;
  return <View style={{ gap: 6 }}>{stars}{chips}</View>;
}
