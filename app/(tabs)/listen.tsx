/**
 * Listen: the only place with content tabs (Julian 26.10.): Aufgaben, Einkauf, own lists (Kliniktasche,
 * Geschenke), + Neu. Built after the klar draft Julian approved (14.11. 09:33, the look before the Recordings
 * style): the chosen list is a white chip among plain words, the lines lie flat on the ground with a small icon,
 * the note behind the title and who as a dot, and what is done gathers at the end.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen, H1, H2, Group, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import { Pair, Avatar } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import ItemRow from '../../src/components/ItemRow';
import AddInline from '../../src/components/AddInline';
import { HintLine } from '../../src/components/HintCard';
import { tokens, fonts, motion, easing, swapIn, persons, glass } from '../../src/theme';
import { useStore, actions, toast } from '../../src/state/store';
import { itemMeta, itemText, aisleOf } from '../../src/data/sample';
import { haptics } from '../../src/lib/haptics';
import Fresh from '../../src/components/Fresh';
import { Cover, Stars, Score, SeenPill, FactChips, factLine, hasBlock } from '../../src/components/Blocks';
import { myRole } from '../../src/lib/sync';
import type { List, Task, Item, Blueprint } from '../../src/state/types';
import type { ClayName } from '../../src/lib/clayIcons';
import { isPoints, players, roundsOf, total, looksOver, listIcon, ranked, gameOver } from '../../src/lib/points';
import ScoreboardView from '../../src/components/showcase/cards/Scoreboard';
import HeaderRight from '../../src/components/ui/HeaderRight';
import { tx } from '../../src/i18n/lang';
import { HIDDEN } from '../../src/lib/core';
import { isWissen } from '../../src/lib/wissen';
import { itemIcon, listHasIcons } from '../../src/lib/itemIcon';

export default function Listen() {
  const all = useStore((s) => s.lists);
  const lists = useMemo(() => all.filter((l) => !isWissen(l) && !(HIDDEN.points && isPoints(l))), [all]);
  const tasks = useStore((s) => s.tasks);
  const chosen = useStore((s) => s.activeList);
  // Without the Aufgaben tab (Julian 30.10.) a hidden or missing choice opens the first list.
  const active = (HIDDEN.tasks && chosen === 'aufgaben') || (chosen !== 'aufgaben' && !lists.some((l) => l.id === chosen)) ? lists[0]?.id ?? 'aufgaben' : chosen;
  const list = lists.find((l) => l.id === active);

  return (
    <Screen tab gap={12} head={<><H1 right={<HeaderRight />}>{tx('Listen', 'Lists')}</H1><ListChips lists={lists} tasks={tasks} active={active} /></>}>
      <Animated.View key={active} entering={swapIn} style={{ gap: 12 }}>
        {active === 'aufgaben' ? <Aufgaben tasks={tasks} /> : list?.kind === 'shopping' ? <Einkauf list={list} /> : list ? <Packliste list={list} /> : null}
      </Animated.View>
    </Screen>
  );
}

const CHIP_H = 40;

/**
 * The lists in a row: the chosen one is a white chip with a soft lift, the others are plain grey words. Each
 * carries its small icon and how much is still open. More lists than fit scroll sideways and the chosen one slides
 * into view (Julian 26.10.: "Schrift überlappt").
 */
function ListChips({ lists, tasks, active }: { lists: List[]; tasks: Task[]; active: string }) {
  const tabs: { id: string; name: string; icon: ClayName; n: number }[] = [
    ...(HIDDEN.tasks ? [] : [{ id: 'aufgaben', name: tx('Aufgaben', 'Tasks'), icon: 'erledigt' as ClayName, n: tasks.filter((t) => t.who && !t.done).length }]),
    ...lists.map((l) => {
      const items = l.sections.flatMap((sec) => sec.items);
      return { id: l.id, name: l.name, icon: listIcon(l), n: l.kind === 'collection' || l.blueprint ? items.length : items.filter((i) => !i.done).length };
    }),
  ];
  const scroller = useRef<ScrollView>(null);
  const xs = useRef<Record<string, { x: number; w: number }>>({});
  const width = useRef(0);
  const reveal = (id: string) => {
    const t = xs.current[id];
    if (t && width.current) scroller.current?.scrollTo({ x: Math.max(0, t.x + t.w / 2 - width.current / 2), animated: true });
  };
  useEffect(() => reveal(active), [active, lists.length]);
  return (
    // The scroll view clips, so the chips get a little room around for the lift of the chosen one.
    <View style={{ marginHorizontal: -18, marginTop: -4, marginBottom: -8 }} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10, gap: 6, alignItems: 'center' }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <ListChip
              key={t.id}
              on={on}
              name={t.name}
              icon={t.icon}
              n={t.n}
              onPress={() => { if (!on) { haptics.select(); actions.setActiveList(t.id); } }}
              // Hold a chip to rename the list or change its icon (Julian 30.10.).
              onLongPress={t.id === 'aufgaben' ? undefined : () => { haptics.tap(); router.push({ pathname: '/liste-bearbeiten', params: { id: t.id } }); }}
              onLayout={(x, w) => { xs.current[t.id] = { x, w }; if (on) reveal(t.id); }}
            />
          );
        })}
        <PressScale accessibilityLabel={tx('Neue Liste', 'New list')} scale={0.92} hitSlop={6} onPress={() => router.push('/liste-neu')} style={{ width: CHIP_H, height: CHIP_H, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="plus" size={19} color={tokens.sub} />
        </PressScale>
      </ScrollView>
    </View>
  );
}

/** One list in the row. The white chip fades in under the chosen one and its name turns from grey to ink (180 ms). */
function ListChip({ on, name, icon, n, onPress, onLongPress, onLayout }: { on: boolean; name: string; icon: ClayName; n: number; onPress: () => void; onLongPress?: () => void; onLayout: (x: number, w: number) => void }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => { v.value = withTiming(on ? 1 : 0, { duration: motion.micro, easing: easing.out }); }, [on]);
  const ink = tokens.ink, sub = tokens.sub;
  const fill = useAnimatedStyle(() => ({ opacity: v.value }));
  const label = useAnimatedStyle(() => ({ color: interpolateColor(v.value, [0, 1], [sub, ink]) }));
  return (
    <PressScale
      accessibilityRole="tab"
      accessibilityLabel={name}
      accessibilityState={{ selected: on }}
      scale={0.95}
      onPress={onPress}
      onLongPress={onLongPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={{ height: CHIP_H, borderRadius: 999 }}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 999 }, glass.sm, fill]} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 8, paddingRight: 14 }}>
        <ClayIcon name={icon} size={26} />
        <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[{ fontFamily: fonts[on ? 600 : 400], fontSize: 16.5, lineHeight: 21 }, label]}>{name}</Animated.Text>
        {n ? <Txt size={15} line={21} color={tokens.sub} style={{ fontVariant: ['tabular-nums'] }}>{n}</Txt> : null}
      </View>
    </PressScale>
  );
}

function Aufgaben({ tasks }: { tasks: Task[] }) {
  const hints = useStore((s) => s.hints);
  const open = tasks.filter((t) => t.who && !t.done);
  const done = tasks.filter((t) => t.who && t.done);
  const nobody = tasks.filter((t) => !t.who && !t.done);
  return (
    <>
      {hints.urlaub ? (
        <HintLine icon="reise" bold={tx('Ostsee', 'Baltic Sea')} text={tx(' steht im Kalender. Packliste anlegen?', ' is in the calendar. Make a packing list?')} go={tx('Ansehen', 'View')} onGo={() => router.push({ pathname: '/liste-neu', params: { vorschlag: 'urlaub' } })} onNo={() => actions.dismissHint('urlaub')} />
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
            flat
          />
          </Fresh>
        ))}
      </Group>
      <AddInline flat placeholder={tx('Aufgabe hinzufügen …', 'Add a task …')} onAdd={actions.addTask} />
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
  const open = list.sections.some((x) => x.items.some((i) => !i.done));
  return (
    <>
      {hints.abo ? (
        <HintLine icon="windeln" bold={tx('Windeln', 'Diapers')} text={tx(' kauft ihr etwa alle 12 Tage. Abo?', ': you buy them about every 12 days. Subscribe?')} go={tx('Ansehen', 'View')} onGo={() => router.push('/abo')} onNo={() => actions.dismissHint('abo')} />
      ) : null}
      {/* As in the klar draft: the list is only what is on it. New things come by speaking or over the plus; an empty list keeps one line to start with. */}
      <Sections list={list} footer={open ? undefined : <AddInline key="add" flat placeholder={tx('Hinzufügen …', 'Add …')} mic onPress={() => router.push('/einkauf-neu')} />} />
    </>
  );
}

function Packliste({ list }: { list: List }) {
  const items = list.sections.flatMap((s) => s.items);
  const pct = items.length ? items.filter((i) => i.done).length / items.length : 0;
  const plain = list.kind === 'collection' || !!list.blueprint;
  const done = items.filter((i) => i.done).length;
  // "Gepackt" only where something is packed (a trip's list, a bag); every other list is "erledigt".
  const packs = !!list.forEvent || /pack|tasche|koffer|bag|suitcase/i.test(list.name);
  // As in the klar draft, a list you tick off is only what is on it: new things come by speaking or over the plus.
  // The line to write on stays where there is nothing to tick (collections, games) and while nothing is open.
  const add = plain || isPoints(list) || done === items.length ? <AddInline key="add" flat placeholder={isPoints(list) ? tx('Spieler hinzufügen …', 'Add player …') : tx('Hinzufügen …', 'Add …')} onAdd={(t) => actions.addItem(list.id, t)} /> : undefined;
  return (
    <>
      {items.length && !plain ? (
        <View style={{ gap: 8 }}>
          <H2 right={`${Math.round(pct * 100)} %`}>{packs ? tx(`${done} von ${items.length} gepackt`, `${done} of ${items.length} packed`) : tx(`${done} von ${items.length} erledigt`, `${done} of ${items.length} done`)}</H2>
          <View style={{ height: 3, borderRadius: 999, backgroundColor: tokens.hair, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: tokens.accent }} />
          </View>
        </View>
      ) : null}
      {isPoints(list) ? <Scoreboard list={list} /> : null}
      {/* The add row is the next line of the list: what is written there becomes the line above it. */}
      {list.sections.length ? <Sections list={list} footer={add} /> : add}
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
  const lead = n ? ranked(list)[0] : undefined;
  const over = gameOver(list);
  const newGame = (
    <PressScale hitSlop={8} onPress={() => { haptics.tap(); const before = ps.map((p) => [p.id, p.data?.rounds ?? [], p.data?.fields ?? {}] as const); ps.forEach((p) => actions.setItemData(list.id, p.id, { rounds: [], fields: {} })); toast(tx('Neue Partie, Punkte auf null', 'New game, points reset'), () => before.forEach(([id, r, f]) => actions.setItemData(list.id, id, { rounds: [...r], fields: { ...f } }))); }}>
      <Txt size={13} weight={600} color={tokens.sub}>{tx('Neue Partie', 'New game')}</Txt>
    </PressScale>
  );
  const ask = lead && (over || looksOver(list)) ? (
    // Julian 01.11.: a game is a temporary list; hours after the last round we ask whether it is over.
    <View style={{ gap: 10, padding: 12, borderRadius: 16, backgroundColor: tokens.chipBg }}>
      <Txt size={15} line={20} weight={600}>{over ? tx(`Partie vorbei: ${over.name} hat mit ${total(over)} gewonnen.`, `Game over: ${over.name} won with ${total(over)}.`) : tx(`Ist die Partie vorbei? ${lead.name} hat mit ${total(lead)} gewonnen.`, `Is the game over? ${lead.name} won with ${total(lead)}.`)}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <PressScale onPress={() => { haptics.commit(); actions.deleteList(list.id); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.doneSoft }}>
          <Txt size={14} weight={600} color={tokens.done}>{tx('Ja, Liste wegräumen', 'Yes, clear the list')}</Txt>
        </PressScale>
        <PressScale onPress={() => { haptics.select(); if (ps[0]) actions.setItemData(list.id, ps[0].id, { at: new Date().toISOString() }); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.row }}>
          <Txt size={14}>{tx('Wir spielen noch', 'Still playing')}</Txt>
        </PressScale>
      </View>
    </View>
  ) : null;
  // The board itself is a pure view (shared with the onboarding showcase); the buttons stay here.
  return <ScoreboardView list={list} action={newGame} alert={ask} />;
}

function Sections({ list, footer }: { list: List; footer?: React.ReactElement }) {
  const shop = list.kind === 'shopping';
  const plain = list.kind === 'collection' || !!list.blueprint;
  const bp = list.blueprint;
  // Every line starts with a small icon of what it is, when the list is one where most things have one.
  const icons = useMemo(() => !bp && listHasIcons(list.sections.flatMap((x) => x.items.map((i) => i.name))), [list, bp]);
  const line = (i: Item) => (
    <Fresh key={i.id} id={i.id}>
      <ItemRow
        title={i.name}
        editText={itemText(i)}
        meta={bp ? factLine(bp, i.data) : itemMeta(i)}
        done={plain ? false : i.done}
        noCheck={plain}
        dim={bp ? !!i.data?.seen : false}
        icon={icons ? itemIcon(i.name) ?? undefined : undefined}
        iconSlot={icons}
        lead={bp && hasBlock(bp, 'cover') ? <Cover title={i.name} data={i.data} onPress={bp.source ? () => router.push({ pathname: '/titel', params: { l: list.id, i: i.id } }) : undefined} /> : undefined}
        below={bp ? <BlockBelow listId={list.id} bp={bp} item={i} /> : undefined}
        trailing={bp && hasBlock(bp, 'seen') ? <SeenPill label={bp.seenLabel ?? tx('Erledigt', 'Done')} seen={i.data?.seen} onToggle={() => actions.setItemData(list.id, i.id, { seen: !i.data?.seen })} /> : undefined}
        who={i.who}
        onToggle={() => actions.toggleItem(list.id, i.id)}
        onEdit={(t) => actions.editItem(list.id, i.id, t)}
        onCycleWho={plain ? undefined : () => actions.cycleItemWho(list.id, i.id)}
        onDelete={() => actions.deleteItem(list.id, i.id)}
        flat
      />
    </Fresh>
  );
  // Every list you tick off, as in the klar draft: what is done leaves its section and gathers under "Erledigt" at the end.
  const gather = !plain;
  const bought = gather ? list.sections.flatMap((x) => x.items.filter((i) => i.done)) : [];
  return (
    <>
      {list.sections.map((sec, at) => {
        // The add row closes the last section, where new entries land.
        const tail = !gather && footer && at === list.sections.length - 1 ? footer : null;
        const open = sec.items.filter((i) => !i.done);
        if (gather && !open.length) return null;
        const right = String(plain ? sec.items.length : open.length);
        // The shop's own order: vegetables together, then bread, fridge, meat, shelves (Julian 30.10.).
        const ordered = shop ? open.map((i, k) => ({ i, k, a: aisleOf(i.name) })).sort((x, y) => x.a - y.a || x.k - y.k).map((x) => x.i) : gather ? open : sec.items;
        return (
          <View key={sec.id} style={{ gap: 6 }}>
            {plain && list.sections.length === 1 ? null : <H2 right={right}>{sec.title}</H2>}
            {ordered.length || tail ? (
              <Group>
                {ordered.map(line)}
                {tail}
              </Group>
            ) : (
              <Meta>{tx('Noch leer.', 'Still empty.')}</Meta>
            )}
          </View>
        );
      })}
      {gather ? footer : null}
      {bought.length ? (
        <View style={{ gap: 6 }}>
          <H2 right={String(bought.length)}>{tx('Erledigt', 'Done')}</H2>
          <Group>{bought.map(line)}</Group>
        </View>
      ) : null}
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
