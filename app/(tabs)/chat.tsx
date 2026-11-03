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
import { ExampleLines } from '../../src/components/Examples';
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
  const shown = feed.slice(-(SHOWN + more));
  let lastDay = '';
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {simple ? null : <Jumps />}
      {/* The title stays put while the messages scroll under it (Julian 30.10. 22:15). */}
      <Head>
        <H1 right={<HeaderRight />}>Chat</H1>
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
              {head ? <View style={{ alignSelf: 'center', backgroundColor: tokens.segBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}><Txt size={12.5} color={tokens.sub}>{head}</Txt></View> : null}
              <Entry f={f} mine={f.by === me} me={me} answer={f.ask ? feed.find((x) => x.answer?.ask === f.id) : undefined} />
            </React.Fragment>
          );
        }) : (
          // Empty chat (Julian 03.11.): no mascot, headline or helper text. Three real sentences right above the field.
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 4 }}>
            <ExampleLines />
          </View>
        )}
        <Thinking by={me} />
      </ScrollView>
    </View>
  );
}
