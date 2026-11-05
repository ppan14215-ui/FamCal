/**
 * Kalender · Heute (Julian 27.10.: the home page was too full, "man weiß
 * nicht wo man hinschauen soll"; he picked design A "Heute zuerst"). One
 * card for what comes next, a quiet line for the rest of today, then the
 * coming week as short rows. Free days are left out. "Alles zeigen" opens
 * the endless list of days.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import { Tile } from '../../components/ui/Clay';
import { Owner } from '../../components/ui/Person';
import { Check, Meta } from '../../components/ui/kit';
import LineIcon from '../../components/ui/LineIcon';
import PressScale from '../../components/ui/PressScale';
import Fresh from '../../components/Fresh';
import { tokens, persons } from '../../theme';
import { LIVE } from '../../lib/live';
import { useStore, actions } from '../../state/store';
import { useScroller } from '../../lib/landing';
import { useDockSpace } from '../../lib/dockSpace';
import { upcomingFristen } from '../../lib/selectors';
import { TODAY, NOW, minutes, hm, WD_SHORT, weekday, dmShort, daysBetween, until, addDays } from '../../lib/dates';
import { daysTo } from '../../components/TerminDetails';
import { haptics } from '../../lib/haptics';
import type { CalEvent } from '../../state/types';
import { tx } from '../../i18n/lang';
import { useCalEvents } from '../../lib/useEvents';
import { isInfoDay } from '../../lib/feiertage';
import DueOffer from '../../components/DueOffer';
import { weekBriefing } from '../../lib/briefing';
import { HIDDEN } from '../../lib/core';
import { dueItems, kidsOf, useHandled } from '../../lib/mitdenken';

/** The family's to-do list, whatever it was called ("Zu erledigen", "Aufgaben", "Task"). */
const TODO_NAME = /^(zu erledigen|erledigen|aufgaben|to-?dos?|tasks?)$/i;

/** How many days "Diese Woche" looks ahead. */
export const WEEK_AHEAD = 7;

const byStart = (a: CalEvent, b: CalEvent) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start));

function Label({ children, color = tokens.sub, right }: { children: string; color?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Txt size={12} weight={600} tracking={0.6} color={color}>{children.toUpperCase()}</Txt>
      {right}
    </View>
  );
}

/** Minutes since midnight, ticking once a minute in the real app (the test link keeps its fixed time). */
function useNowMin(): number {
  const read = () => (LIVE ? new Date().getHours() * 60 + new Date().getMinutes() : minutes(NOW));
  const [m, setM] = useState(read);
  useEffect(() => {
    if (!LIVE) return;
    const t = setInterval(() => setM(read()), 30000);
    return () => clearInterval(t);
  }, []);
  return m;
}

/** "in 45 Min", "in 2 Std 10", "läuft noch 20 Min", "morgen", "Do 30." */
function when(e: CalEvent, now: number): string {
  if (e.date !== TODAY) return daysBetween(TODAY, e.date) === 1 ? tx('morgen', 'tomorrow') : `${WD_SHORT[weekday(e.date)]} ${dmShort(e.date)}`;
  if (e.allDay) return tx('heute', 'today');
  const d = minutes(e.start) - now;
  if (d <= 0) {
    const left = e.end ? minutes(e.end) - now : 0;
    return left > 0 ? tx(`läuft noch ${left} Min`, `${left} min left`) : tx('jetzt', 'now');
  }
  if (d < 60) return tx(`in ${d} Min`, `in ${d} min`);
  const h = Math.floor(d / 60), r = d % 60;
  if (h >= 3 || r < 5) return tx(`in ${Math.round(d / 60)} Std`, `in ${Math.round(d / 60)} h`);
  return tx(`in ${h} Std ${r}`, `in ${h} h ${r}`);
}

/** The small dot before "Als Nächstes" breathes when it starts within 15 minutes or runs. */
function Pulse({ on }: { on: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = on ? withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), -1) : withTiming(1);
  }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.done }, st]} />;
}

const span = (e: CalEvent) => (e.allDay ? tx('ganztägig', 'all day') : e.end ? tx(`${hm(e.start)} bis ${hm(e.end)}`, `${hm(e.start)} to ${hm(e.end)}`) : hm(e.start));

/** The one thing to look at: the next Termin, big. */
function Next({ e }: { e: CalEvent }) {
  const now = useNowMin();
  const open = (e.bring ?? []).filter((b) => !b.done);
  const today = e.date === TODAY && !e.allDay;
  const toGo = today ? minutes(e.start) - now : 999;
  const running = today && toGo <= 0 && !!e.end && minutes(e.end) > now;
  // A trip that already started is going on, not coming up (Julian 31.10.: "sollte eher heißen currently on").
  const on = !!e.endDate && e.endDate > e.date && e.date <= TODAY && TODAY <= e.endDate;
  const head = on ? tx(`Gerade · Tag ${daysBetween(e.date, TODAY) + 1} von ${daysBetween(e.date, e.endDate!) + 1}`, `Currently on · day ${daysBetween(e.date, TODAY) + 1} of ${daysBetween(e.date, e.endDate!) + 1}`)
    : when(e, now); // "in 40 Min" says it is next; no "Als Nächstes" label (Julian 03.11.)
  // While it runs a thin bar fills up to its end.
  const done = running ? Math.min(1, (now - minutes(e.start)) / Math.max(1, minutes(e.end!) - minutes(e.start))) : 0;
  const who = e.who === 'both' ? tx('Beide', 'Both') : e.who ? persons[e.who].name : null;
  return (
    <Fresh id={e.id} radius={24}>
      <PressScale scale={0.985} onPress={() => router.push(`/termin/${e.id}`)} style={{ backgroundColor: tokens.row, borderRadius: 24, padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pulse on={toGo <= 15 && !on} />
          <Label color={tokens.done}>{head}</Label>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt size={24} line={29} weight={600} tracking={-0.4} numberOfLines={2}>{e.title}</Txt>
            <Meta numberOfLines={1}>{[on ? tx(`bis ${WD_SHORT[weekday(e.endDate!)]} ${dmShort(e.endDate!)}`, `until ${WD_SHORT[weekday(e.endDate!)]} ${dmShort(e.endDate!)}`) : span(e), e.place ?? e.sub].filter(Boolean).join(' · ')}</Meta>
          </View>
          <Tile name={e.icon} bg="transparent" size={56} radius={16} />
        </View>
        {who || open.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {who ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Owner who={e.who} size={22} />
                <Txt size={13.5} weight={600} color={tokens.sub}>{who}</Txt>
              </View>
            ) : null}
            {open.length ? <Txt size={13.5} color={tokens.sub} numberOfLines={1} style={{ flex: 1 }}>{`${who ? '· ' : ''}${tx('Mitbringen', 'Bring')}: ${open.map((b) => b.t).join(', ')}`}</Txt> : null}
          </View>
        ) : null}
        {running ? (
          <View style={{ height: 4, borderRadius: 2, backgroundColor: tokens.doneSoft, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(done * 100)}%`, height: 4, backgroundColor: tokens.done }} />
          </View>
        ) : null}
      </PressScale>
    </Fresh>
  );
}

/** One short row: time or weekday, title, who. */
function Row({ e, lead, showTime }: { e: CalEvent; lead: string; showTime?: boolean }) {
  return (
    <Fresh id={e.id} radius={14} bleed={12}>
      <PressScale scale={0.985} onPress={() => router.push(`/termin/${e.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
        <Txt size={14} color={tokens.sub} style={{ width: 56 }}>{lead}</Txt>
        <Txt size={16} weight={500} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
        {showTime && !e.allDay ? <Txt size={13} color={tokens.mute}>{hm(e.start)}</Txt> : null}
        <Owner who={e.who} size={22} />
      </PressScale>
    </Fresh>
  );
}

export default function TodayView({ header }: { header: React.ReactNode }) {
  const events = useCalEvents();
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);
  // Julian 31.10. 16:11: Heute is the personal hub, Termine and what is still open. Reminders live on the list "Zu erledigen".
  const todoList = useStore((s) => s.lists.find((l) => l.id === 'aufgaben') ?? s.lists.find((l) => TODO_NAME.test(l.name)));
  const open = (todoList?.sections ?? []).flatMap((x) => x.items).filter((i) => !i.done);
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const ref = useRef<ScrollView>(null);
  const track = useScroller(ref);

  const people = useStore((s) => s.people);
  const kid = useStore((s) => s.kid);
  const country = useStore((s) => s.country);
  const lists = useStore((s) => s.lists);
  const handled = useHandled();
  // Julian 31.10.: Wochenbriefing (the coming week from Sunday on, else the next seven days), Mitdenken nach Alter whenever something is due.
  const brief = useMemo(() => weekBriefing(events, lists, kidsOf(people, kid), country), [events, lists, people, kid, country, handled]);
  const due = useMemo(() => dueItems(kidsOf(people, kid), country, 30), [people, kid, country, handled]);
  const { next, later, week, todo, fristen, soon, info } = useMemo(() => {
    const real = events.filter((e) => !e.work && !isInfoDay(e));
    const today = real.filter((e) => e.date === TODAY || (!!e.endDate && e.date < TODAY && TODAY <= e.endDate)).sort(byStart);
    // Still to come today; a running Termin counts until it ends.
    const left = today.filter((e) => e.allDay || minutes(e.end ?? e.start) > minutes(NOW));
    const ahead = real
      .filter((e) => e.date > TODAY && daysBetween(TODAY, e.date) <= WEEK_AHEAD)
      .sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b));
    const timed = left.filter((e) => !e.allDay);
    const next = timed[0] ?? left[0] ?? ahead[0];
    return {
      next,
      // Holidays and Halloween: one quiet line each, no person (Julian 30.10.).
      info: events.filter((e) => isInfoDay(e) && e.date >= TODAY && daysBetween(TODAY, e.date) <= WEEK_AHEAD)
        .sort((a, b) => a.date.localeCompare(b.date)),
      later: left.filter((e) => e !== next),
      week: ahead.filter((e) => e !== next),
      todo: tasks.filter((t) => !t.done && t.due && t.due <= TODAY),
      fristen: upcomingFristen(docs, 14),
      // Countdown (Julian 28.10.): the next three Termine that asked for "Tage bis".
      // A series counts once, with its next date.
      // Never repeat the Termin already shown big on top (Julian 05.11.).
      soon: real.filter((e) => e.countdown && e.date > TODAY && daysBetween(TODAY, e.date) <= 365 && e.id !== next?.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((e, i, l) => l.findIndex((x) => x.id.split('~')[0] === e.id.split('~')[0]) === i)
        .slice(0, 3),
    };
  }, [events, tasks, docs]);

  const all = () => { haptics.select(); actions.setCalDay(TODAY); actions.setCalView('tag'); };

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => track(e.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 + insets.bottom + dock, gap: 28 }}
    >
      {header}
      {next ? <Next e={next} /> : (
        <View style={{ backgroundColor: tokens.row, borderRadius: 24, padding: 20, gap: 6 }}>
          <Txt size={20} weight={600}>{tx('Nichts geplant', 'Nothing planned')}</Txt>
        </View>
      )}

      {brief && !HIDDEN.briefing ? (
        <PressScale scale={0.985} onPress={() => { haptics.select(); router.push('/woche'); }} style={{ backgroundColor: tokens.doneSoft, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt size={16} line={22} weight={600} style={{ flex: 1 }}>
            {[tx(`Diese Woche ${brief.count} ${brief.count === 1 ? 'Termin' : 'Termine'}`, `This week ${brief.count} ${brief.count === 1 ? 'event' : 'events'}`),
              brief.clashes.length ? tx(`${brief.clashes.length} ${brief.clashes.length === 1 ? 'Überschneidung' : 'Überschneidungen'}`, `${brief.clashes.length} ${brief.clashes.length === 1 ? 'clash' : 'clashes'}`) : '',
              brief.unassigned.length ? tx(`${brief.unassigned.length} ohne Zuständigen`, `${brief.unassigned.length} unassigned`) : ''].filter(Boolean).join(', ')}
          </Txt>
          <LineIcon name="chev" size={14} color={tokens.done} stroke={2.2} />
          </View>
        </PressScale>
      ) : null}

      {due.length ? (
        // Thought ahead shows by its soft teal, not by a label (Julian 03.11.).
        <View style={{ gap: 2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: tokens.doneSoft }}>
          {due.slice(0, 3).map((d) => <DueOffer key={d.key} d={d} />)}
        </View>
      ) : null}

      {soon.length ? (
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          {soon.map((e) => (
            <PressScale key={e.id} onPress={() => { haptics.select(); router.push(`/termin/${e.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
              <View style={{ width: 56 }}><Tile name={e.icon} bg="transparent" size={36} /></View>
              <Txt size={16} weight={500} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
              <Txt size={14} weight={600} color={tokens.done}>{daysTo(e.date)}</Txt>
            </PressScale>
          ))}
        </View>
      ) : null}

      {later.length || todo.length ? (
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          {later.map((e) => <Row key={e.id} e={e} lead={e.allDay ? tx('Tag', 'Day') : hm(e.start)} />)}
          {todo.map((t) => (
            <Fresh key={t.id} id={t.id} radius={14} bleed={12}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
                <View style={{ width: 56 }}><Check done={t.done} onPress={() => actions.toggleTask(t.id)} /></View>
                <Txt size={16} weight={500} numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt>
                {t.due! < TODAY ? <Txt size={13} color={tokens.frist}>{tx('überfällig', 'overdue')}</Txt> : null}
                <Owner who={t.who} size={22} />
              </View>
            </Fresh>
          ))}
        </View>
      ) : null}

      {todoList && open.length ? (
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <Label right={
            <PressScale onPress={() => { haptics.select(); actions.setActiveList(todoList.id); router.navigate('/listen'); }} hitSlop={10} scale={0.94} accessibilityLabel={tx('Ganze Liste zeigen', 'Show the whole list')}>
              <Txt size={14} weight={600} color={tokens.done}>{open.length > 5 ? tx(`Alle ${open.length}`, `All ${open.length}`) : tx('Liste', 'List')}</Txt>
            </PressScale>
          }>{tx('Offen', 'Open')}</Label>
          {open.length ? open.slice(0, 5).map((i) => (
            <Fresh key={i.id} id={i.id} radius={14} bleed={12}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
                <View style={{ width: 56 }}><Check done={i.done} onPress={() => { haptics.commit(); actions.toggleItem(todoList.id, i.id); }} /></View>
                <Txt size={16} weight={500} numberOfLines={1} style={{ flex: 1 }}>{i.name}</Txt>
                {i.who ? <Owner who={i.who} size={22} /> : null}
              </View>
            </Fresh>
          )) : null}
        </View>
      ) : null}

      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <Label right={
          <PressScale onPress={all} hitSlop={10} scale={0.94} accessibilityLabel={tx('Alle Tage zeigen', 'Show all days')}>
            <Txt size={14} weight={600} color={tokens.done}>{tx('Alles zeigen', 'Show all')}</Txt>
          </PressScale>
        }>{tx('Diese Woche', 'This week')}</Label>
        {week.map((e) => <Row key={e.id} e={e} showTime lead={daysBetween(TODAY, e.date) === 1 ? tx('Morgen', 'Tmrw') : WD_SHORT[weekday(e.date)]} />)}
        {info.map((e) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 32 }}>
            <Txt size={14} color={tokens.mute} style={{ width: 56 }}>{e.date === TODAY ? tx('Heute', 'Today') : daysBetween(TODAY, e.date) === 1 ? tx('Morgen', 'Tmrw') : WD_SHORT[weekday(e.date)]}</Txt>
            <Txt size={14} color={tokens.mute} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
          </View>
        ))}
        {fristen.map((d) => (
          <PressScale key={d.id} onPress={d.route ? () => router.push(d.route as any) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 }}>
            <View style={{ width: 56 }}><LineIcon name="clock" size={16} color={tokens.frist} /></View>
            <Txt size={16} weight={500} numberOfLines={1} style={{ flex: 1 }}>{d.title}</Txt>
            <Txt size={13} color={tokens.frist}>{`${tx('Frist', 'Due')} ${until(d.frist!)}`}</Txt>
          </PressScale>
        ))}
      </View>
    </ScrollView>
  );
}

/** Whether a Termin on this day shows on the Heute page, so a spoken one can land there. */
export const onToday = (date: string) => date >= TODAY && daysBetween(TODAY, date) <= WEEK_AHEAD;
