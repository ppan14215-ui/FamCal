/**
 * Chat, the start tab (Julian 29.10.: "Einmal sagen. Beide wissen's."). The
 * whole family in one log: each sentence shows who said it and when, and
 * under it the card of what it made. Cards read the live calendar and lists,
 * so a tick or a changed time shows here too. Questions never land here;
 * they stay in the card above the field, seen only by whoever asked.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { H1, Check, Head } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Avatar, Pair } from '../../src/components/ui/Person';
import { Tile } from '../../src/components/ui/Clay';
import PressScale from '../../src/components/ui/PressScale';
import LineIcon from '../../src/components/ui/LineIcon';
import { tokens, persons } from '../../src/theme';
import { swapIn, rowLayout } from '../../src/theme/motion';
import { useStore, actions } from '../../src/state/store';
import { useDockSpace } from '../../src/lib/dockSpace';
import { useKeyboardInset } from '../../src/lib/keyboard';
import { useFeed, canUndo, undoEntry, answerAsk, type FeedEntry, type EventSnap } from '../../src/lib/feed';
import { getFamily, myRole } from '../../src/lib/sync';
import { hm, short, TODAY } from '../../src/lib/dates';
import { useScroller } from '../../src/lib/landing';
import HeaderRight from '../../src/components/ui/HeaderRight';
import { tx } from '../../src/i18n/lang';
import { useVeil, Step, Dots } from '../../src/components/Veil';
import { isTrip, makePackList, kidsOn, ageText } from '../../src/lib/pack';
import { isVacation, leftLine } from '../../src/lib/urlaub';
import { useSimple } from '../../src/lib/simple';
import ExampleCards from '../../src/components/Examples';
import { HIDDEN } from '../../src/lib/core';
import WhenField from '../../src/components/WhenField';
import type { When } from '../../src/lib/when';
import type { CalEvent } from '../../src/state/types';
import { haptics } from '../../src/lib/haptics';

import { Entry, Thinking, Jumps, at, dayOf, useSettled } from '../../src/components/ChatCards';

const SHOWN = 30;

export default function Chat() {
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const feed = useFeed();
  const people = useStore((s) => s.people.length);
  const scroller = useRef<ScrollView>(null);
  const trackY = useScroller(scroller);
  const me = getFamily() ? myRole() : 'J';
  const veil = useVeil();
  const simple = useSimple();
  const kb = useKeyboardInset();
  // The newest message is always in view (Julian 29.10.): after sending, while thinking, and when the keyboard opens.
  const thinking = veil.inline && veil.phase !== 'off';
  useEffect(() => { const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80); return () => clearTimeout(t); }, [feed.length, kb, dock, thinking, veil.shown]);
  // Julian 30.10.: "jeder Klick dauert zu lange". Up to 300 entries each read the store; the chat draws the
  // newest ones and the rest on request.
  const [more, setMore] = useState(0);
  const openQ = useOpenQuestion(feed, me);
  const qY = useRef(0);
  const shown = feed.slice(-(SHOWN + more));
  let lastDay = '';
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {simple ? null : <Jumps />}
      {/* The title stays put while the messages scroll under it (Julian 30.10. 22:15). */}
      <Head>
        <H1 sub={tx(`Familie · ${2 + people} Personen`, `Family · ${2 + people} people`)} right={<HeaderRight />}>Chat</H1>
      </Head>
      <ScrollView ref={scroller} onScroll={(e) => trackY(e.nativeEvent.contentOffset.y)} scrollEventThrottle={32} onContentSizeChange={() => { if (!more) scroller.current?.scrollToEnd({ animated: false }); }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: dock + (kb > 0 ? kb : insets.bottom) + 40, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {feed.length > shown.length ? (
          <PressScale onPress={() => setMore((m) => m + SHOWN)} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 }}>
            <Txt size={13.5} weight={600} color={tokens.sub}>{tx('Ältere zeigen', 'Show older')}</Txt>
          </PressScale>
        ) : null}
        {feed.length || veil.inline && veil.phase !== 'off' ? shown.map((f) => {
          // An answer shows on its question, not as a bubble of its own.
          if (f.answer && feed.some((x) => x.id === f.answer!.ask)) return null;
          const d = dayOf(f.at);
          const head = d !== lastDay ? (lastDay = d, d === TODAY ? tx('Heute', 'Today') : short(d)) : null;
          return (
            <React.Fragment key={f.id}>
              {f.id === openQ?.id ? <View onLayout={(e) => { qY.current = e.nativeEvent.layout.y; }} /> : null}
              {head ? <View style={{ alignSelf: 'center', backgroundColor: tokens.segBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}><Txt size={12.5} color={tokens.sub}>{head}</Txt></View> : null}
              <Entry f={f} mine={f.by === me} me={me} answer={f.ask ? feed.find((x) => x.answer?.ask === f.id) : undefined} />
            </React.Fragment>
          );
        }) : (
          <View style={{ flex: 1, justifyContent: 'center', gap: 8, paddingHorizontal: 8 }}>
            <Txt size={22} line={28} weight={700} tracking={-0.5}>{tx('Einmal sagen. Beide wissen’s.', 'Say it once. You both know.')}</Txt>
            {simple ? (
              <>
                <Txt size={15} line={22} color={tokens.sub}>{tx('Sag oder schreib es einfach. Tippe auf ein Beispiel, um es auszuprobieren.', 'Just say or type it. Tap an example to try it.')}</Txt>
                <View style={{ height: 6 }} />
                <ExampleCards />
              </>
            ) : <Txt size={15} line={22} color={tokens.sub}>{tx('Sprich oder schreib, was ansteht: „Montag 17 Uhr Essen mit Mama“ oder „Milch und Mehl“. Hier siehst du dann, was daraus wurde, und die Familie auch.', 'Say or type what’s up: “Dinner with mum Monday 5 pm” or “milk and flour”. Here you see what it became, and so does the family.')}</Txt>}
          </View>
        )}
        <Thinking by={me} />
      </ScrollView>
      {/* Only what still waits for me, like the status pills over Claude's field (Julian 30.10., "Nur offene Fragen"). */}
      {openQ && !thinking ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: dock + (kb > 0 ? kb : insets.bottom) + 8, alignItems: 'center' }}>
          <PressScale onPress={() => { haptics.select(); scroller.current?.scrollTo({ y: Math.max(0, qY.current - 12), animated: true }); }} accessibilityLabel={openQ.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.row, maxWidth: '90%', boxShadow: `0 0 0 1px ${tokens.hair}, 0 6px 16px rgba(22,35,42,0.10)` } as any}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.done }} />
            <Txt size={13.5} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>{openQ.label}</Txt>
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}

/** The newest thing that still waits for me: a question from my partner, or a time or who the assistant asked about. */
function useOpenQuestion(feed: FeedEntry[], me: 'J' | 'T'): { id: string; label: string } | null {
  const events = useStore((s) => s.events);
  const done = useSettled();
  return useMemo(() => {
    for (let i = feed.length - 1; i >= 0 && i >= feed.length - 30; i--) {
      const f = feed[i];
      if (f.ask && f.ask.to === me && !feed.some((x) => x.answer?.ask === f.id)) return { id: f.id, label: tx(`${persons[f.by].name} fragt: ${f.ask.q}`, `${persons[f.by].name} asks: ${f.ask.q}`) };
      if (f.by !== me || f.undone || !f.events || f.events.length !== 1 || Date.now() - Date.parse(f.at) > 15 * 60000) continue;
      const e = events.find((x) => x.id === f.events![0]);
      if (!e) continue;
      if (f.timeQ && e.allDay && !done.has(e.id)) return { id: f.id, label: tx(`Uhrzeit für ${e.title}?`, `Time for ${e.title}?`) };
      if (!e.who) return { id: f.id, label: tx(`Wer geht zu ${e.title}?`, `Who goes to ${e.title}?`) };
    }
    return null;
  }, [feed, me, events, done.size]);
}
