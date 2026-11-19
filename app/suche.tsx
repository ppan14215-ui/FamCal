/**
 * Suche: the round button beside the plus, as in the klar draft Julian approved (14.11.). One field over everything
 * the family has: Termine, what is on the lists, and tasks. It only reads what is already on the phone; nothing is
 * sent anywhere. A tap opens the Termin or the list the hit is on.
 */
import React, { useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { H2, RoundButton } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import PressScale from '../src/components/ui/PressScale';
import { tokens, fonts } from '../src/theme';
import { useStore, actions } from '../src/state/store';
import { goBack } from '../src/lib/nav';
import { TODAY, short, hm } from '../src/lib/dates';
import { isInfoDay } from '../src/lib/feiertage';
import { itemIcon } from '../src/lib/itemIcon';
import { listIcon } from '../src/lib/points';
import { isWissen } from '../src/lib/wissen';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';
import { HIDDEN } from '../src/lib/core';
import type { ClayName } from '../src/lib/clayIcons';

type Hit = { key: string; icon: ClayName; title: string; note: string; dim?: boolean; go: () => void };
const MAX = 12;

/** Letters only, lower case, so "Zahnärztin" finds "zahnarzt" typed without the dots. */
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

function Line({ h, last }: { h: Hit; last: boolean }) {
  return (
    <PressScale scale={0.985} onPress={() => { haptics.select(); h.go(); }} accessibilityLabel={`${h.title}, ${h.note}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair, opacity: h.dim ? 0.5 : 1 }}>
      <ClayIcon name={h.icon} size={26} />
      <Txt size={17} line={22} numberOfLines={1} style={{ flex: 1 }}>
        {h.title}
        {h.note ? <Txt size={14.5} line={22} color={tokens.sub}>{`  ${h.note}`}</Txt> : null}
      </Txt>
      <LineIcon name="chev" size={16} color={tokens.mute} />
    </PressScale>
  );
}

export default function Suche() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const events = useStore((s) => s.events);
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const needle = plain(q.trim());

  const { termine, dinge, aufgaben } = useMemo(() => {
    if (needle.length < 2) return { termine: [] as Hit[], dinge: [] as Hit[], aufgaben: [] as Hit[] };
    const has = (...parts: (string | undefined)[]) => parts.some((p) => !!p && plain(p).includes(needle));
    // What is coming first, nearest on top; then what has been, newest on top.
    const found = events.filter((e) => !isInfoDay(e) && has(e.title, e.place, e.sub));
    const ahead = found.filter((e) => (e.endDate ?? e.date) >= TODAY).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const past = found.filter((e) => (e.endDate ?? e.date) < TODAY).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const termine: Hit[] = [...ahead, ...past].slice(0, MAX).map((e) => ({
      key: e.id, icon: e.icon, title: e.title, dim: (e.endDate ?? e.date) < TODAY,
      note: `${e.date === TODAY ? tx('Heute', 'Today') : short(e.date)}${e.allDay ? '' : ` ${hm(e.start)}`}`,
      go: () => router.push(`/termin/${e.id}`),
    }));
    const dinge: Hit[] = [];
    for (const l of lists) {
      if (isWissen(l)) continue;
      for (const sec of l.sections) for (const i of sec.items) {
        if (dinge.length >= MAX) break;
        if (has(i.name, i.note)) dinge.push({ key: `${l.id}:${i.id}`, icon: itemIcon(i.name) ?? listIcon(l), title: i.name, note: l.name, dim: i.done, go: () => { actions.setActiveList(l.id); router.dismissTo('/listen'); } });
      }
    }
    const aufgaben: Hit[] = (HIDDEN.tasks ? [] : tasks).filter((t) => has(t.title, t.sub)).slice(0, MAX).map((t) => ({
      key: t.id, icon: t.icon, title: t.title, note: t.done ? tx('erledigt', 'done') : t.dueLabel ?? '', dim: t.done,
      go: () => { actions.setActiveList('aufgaben'); router.dismissTo('/listen'); },
    }));
    return { termine, dinge, aufgaben };
  }, [needle, events, lists, tasks]);

  const none = needle.length >= 2 && !termine.length && !dinge.length && !aufgaben.length;
  const group = (title: string, hits: Hit[]) => hits.length ? (
    <View style={{ gap: 6 }}>
      <H2 right={String(hits.length)}>{title}</H2>
      <View>{hits.map((h, i) => <Line key={h.key} h={h} last={i === hits.length - 1} />)}</View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 }}>
        <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={goBack} size={40} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.chipBg }}>
          <LineIcon name="search" size={18} color={tokens.sub} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={tx('Suchen', 'Search')}
            placeholder={HIDDEN.tasks ? tx('Termine und Listen', 'Events and lists') : tx('Termine, Listen, Aufgaben', 'Events, lists, tasks')}
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.select} cursorColor={tokens.ink}
            style={[{ flex: 1, minWidth: 0, fontFamily: fonts[400], fontSize: 17, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
          {q ? (
            <PressScale scale={0.9} hitSlop={10} accessibilityLabel={tx('Leeren', 'Clear')} onPress={() => setQ('')}>
              <LineIcon name="x" size={15} color={tokens.sub} />
            </PressScale>
          ) : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: insets.bottom + 34, gap: 12 }}>
        {needle.length < 2 ? (
          <Txt size={15.5} line={22} color={tokens.sub}>{HIDDEN.tasks ? tx('Such nach einem Termin oder etwas von einer Liste.', 'Search for an event or something on a list.') : tx('Such nach einem Termin, etwas von einer Liste oder einer Aufgabe.', 'Search for an event, something on a list or a task.')}</Txt>
        ) : none ? (
          <Txt size={15.5} line={22} color={tokens.sub}>{tx(`Nichts zu „${q.trim()}“ gefunden.`, `Nothing found for “${q.trim()}”.`)}</Txt>
        ) : (
          <>
            {group(tx('Termine', 'Events'), termine)}
            {group(tx('Listen', 'Lists'), dinge)}
            {group(tx('Aufgaben', 'Tasks'), aufgaben)}
          </>
        )}
      </ScrollView>
    </View>
  );
}
