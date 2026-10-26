/**
 * Listen: the only place with content tabs (Julian 26.10.). Clay tabs on top:
 * Aufgaben, Einkauf, own lists (Kliniktasche, Geschenke), + Neu.
 */
import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
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
import { tokens } from '../../src/theme';
import { useStore, actions } from '../../src/state/store';
import { itemMeta, itemText } from '../../src/data/sample';
import { haptics } from '../../src/lib/haptics';
import type { List, Task } from '../../src/state/types';
import type { ClayName } from '../../src/lib/clayIcons';

export default function Listen() {
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const active = useStore((s) => s.activeList);
  const list = lists.find((l) => l.id === active);

  const sub = useMemo(() => {
    if (active === 'aufgaben') {
      const mine = tasks.filter((t) => t.who);
      return `${mine.filter((t) => !t.done).length} offen, ${mine.filter((t) => t.done).length} erledigt`;
    }
    if (!list) return '';
    const items = list.sections.flatMap((s) => s.items);
    if (list.kind === 'shopping') return `${list.name} · ${items.filter((i) => !i.done).length} Dinge`;
    return `${list.name} · ${items.filter((i) => i.done).length} von ${items.length} gepackt`;
  }, [active, tasks, list]);

  return (
    <Screen tab gap={12}>
      <H1 sub={sub} right={<Pressable accessibilityLabel="Familie und Einstellungen" onPress={() => router.push('/einstellungen')}><Pair /></Pressable>}>Listen</H1>
      <ClayTabs lists={lists} active={active} />
      {active === 'aufgaben' ? <Aufgaben tasks={tasks} /> : list?.kind === 'shopping' ? <Einkauf list={list} /> : list ? <Packliste list={list} /> : null}
    </Screen>
  );
}

function ClayTabs({ lists, active }: { lists: List[]; active: string }) {
  const tabs: { id: string; name: string; icon: ClayName }[] = [{ id: 'aufgaben', name: 'Aufgaben', icon: 'erledigt' }, ...lists.map((l) => ({ id: l.id, name: l.name, icon: l.icon }))];
  return (
    <View style={{ marginHorizontal: -18, borderBottomWidth: 1, borderBottomColor: tokens.hair }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 2, flexGrow: 1 }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => { if (!on) { haptics.select(); actions.setActiveList(t.id); } }}
              style={{ minWidth: 74, flexGrow: 1, alignItems: 'center', gap: 2, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: on ? tokens.ink : 'transparent' }}
            >
              <View style={{ opacity: on ? 1 : 0.75 }}><ClayIcon name={t.icon} size={46} /></View>
              <Txt size={12.5} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.sub} numberOfLines={1}>{t.name}</Txt>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Neue Liste"
          onPress={() => router.push('/liste-neu')}
          style={{ width: 56, alignItems: 'center', gap: 2, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' }}
        >
          <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}><LineIcon name="plus" size={24} color={tokens.sub} /></View>
          <Txt size={12.5} color={tokens.sub}>Neu</Txt>
        </Pressable>
      </ScrollView>
    </View>
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
        <HintCard
          icon="reise"
          tile
          kicker="Neu im Kalender: Ostsee, 20.–27. März"
          title="Packliste für Urlaub mit Baby anlegen?"
          body="24 Dinge als Vorlage, ihr streicht, was ihr nicht braucht."
          yes="Ansehen"
          no="Später"
          onYes={() => router.push({ pathname: '/liste-neu', params: { vorschlag: 'urlaub' } })}
          onNo={() => actions.dismissHint('urlaub')}
        />
      ) : null}
      {nobody.length ? (
        <PressScale scale={0.985} onPress={() => router.push('/aufteilen')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: tokens.row }}>
          <ClayIcon name="hand-nimmt" size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={17} weight={600}>{`${nobody.length} ohne Zuständigen`}</Txt>
            <Meta>Gemeinsam aufteilen</Meta>
          </View>
          <LineIcon name="chev" size={18} color={tokens.mute} />
        </PressScale>
      ) : null}
      <Group>
        {[...open, ...done].map((t) => (
          <ItemRow
            key={t.id}
            icon={t.icon}
            title={t.title}
            meta={t.done ? `erledigt von ${t.doneBy === 'T' ? 'Tom' : 'Julia'}` : t.dueLabel}
            metaColor={t.frist && !t.done ? tokens.frist : undefined}
            done={t.done}
            who={t.who}
            onToggle={() => actions.toggleTask(t.id)}
            onEdit={(txt) => actions.renameTask(t.id, txt)}
            onCycleWho={() => actions.cycleTaskWho(t.id)}
            onDelete={() => actions.deleteTask(t.id)}
            editHint="Text antippen ändert den Titel"
          />
        ))}
      </Group>
      <AddInline placeholder="Aufgabe hinzufügen …" onAdd={actions.addTask} />
      <Txt size={13.5} line={19} color={tokens.sub}>Neue Aufgaben ohne Person landen im Stapel „ohne Zuständigen“. Ihr entscheidet, wer sie übernimmt.</Txt>
    </>
  );
}

function Einkauf({ list }: { list: List }) {
  const hints = useStore((s) => s.hints);
  return (
    <>
      <AddInline placeholder="Hinzufügen …" mic onPress={() => router.push('/einkauf-neu')} />
      {hints.abo ? (
        <HintCard
          icon="windeln"
          kicker="Aufgefallen"
          title="Windeln und Feuchttücher kauft ihr etwa alle 12 Tage."
          body="Soll ich ein Abo für euch aufsetzen? Dann kommen sie von selbst, meist etwas günstiger. Ihr bestätigt vorher."
          yes="Ja, aufsetzen"
          no="Nein, danke"
          onYes={() => router.push('/abo')}
          onNo={() => actions.dismissHint('abo')}
        />
      ) : null}
      <Sections list={list} />
      <Txt size={13.5} line={19} color={tokens.sub}>Haken antippen: erledigt. Text antippen: bearbeiten. Nach links wischen: löschen.</Txt>
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
      <AddInline placeholder="Hinzufügen …" onAdd={(t) => actions.addItem(list.id, t)} />
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
        const right = counts ? `${done.length} von ${sec.items.length}` : String(open.length);
        const ordered = list.kind === 'shopping' ? [...open, ...done] : sec.items;
        return (
          <View key={sec.id} style={{ gap: 12 }}>
            <H2 right={right}>{sec.title}</H2>
            {ordered.length ? (
              <Group>
                {ordered.map((i) => (
                  <ItemRow
                    key={i.id}
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
                ))}
              </Group>
            ) : (
              <Meta>Noch leer.</Meta>
            )}
          </View>
        );
      })}
    </>
  );
}
