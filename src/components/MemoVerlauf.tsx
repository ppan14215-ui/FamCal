/**
 * Memo's history over the page (Julian 19.11., built 23.11. after "4 bauen"): a tap on Memo opens one sheet over
 * whatever screen you are on. The calendar stays visible above it; inside is the conversation (what was said and what
 * Memo made of it, the same entries as the Chat tab) and at its foot the input. Nothing stacks as extra cards, the
 * answer lands in this history. It closes with the X, the back key or a swipe down on its head.
 */
import React, { useEffect, useRef } from 'react';
import { View, ScrollView, PanResponder, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens, persons } from '../theme';
import { useFeed, type FeedEntry } from '../lib/feed';
import { useStore } from '../state/store';
import { getFamily, myRole } from '../lib/sync';
import { short, hm, TODAY } from '../lib/dates';
import { tx } from '../i18n/lang';
import { Thinking, dayOf } from './ChatCards';

const SHOWN = 20;
const OUT = Easing.bezier(0.23, 1, 0.32, 1);
const YESTERDAY = (() => { const d = new Date(TODAY + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();

export default function MemoVerlauf({ foot, onClose }: { foot: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const feed = useFeed();
  const me = getFamily() ? myRole() : 'J';
  const scroller = useRef<ScrollView>(null);
  // In from below, the same way it goes back (MOTION.md: one place, one path). Transform and opacity only.
  const y = useSharedValue(40);
  const a = useSharedValue(0);
  useEffect(() => { y.value = withTiming(0, { duration: 260, easing: OUT }); a.value = withTiming(1, { duration: 200, easing: OUT }); }, []);
  const style = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ translateY: Math.max(0, y.value) }] }));
  const close = () => onClose();
  // A swipe down on the head takes the sheet with the finger; far enough or fast enough and it closes.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { y.value = Math.max(0, g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 90 || g.vy > 0.8) { y.value = withTiming(height, { duration: 220, easing: OUT }, () => runOnJS(close)()); }
      else y.value = withTiming(0, { duration: 200, easing: OUT });
    },
  })).current;
  useEffect(() => { const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60); return () => clearTimeout(t); }, [feed.length]);
  const shown = feed.slice(-SHOWN).filter((f) => !(f.answer && feed.some((x) => x.id === f.answer!.ask)));
  let lastDay = '';
  return (
    // The page shows faintly through the top of the sheet, so you still see where you are (the board, 23.11.).
    <Animated.View exiting={FadeOut.duration(150)} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, top: Math.round(height * 0.44), backgroundColor: tokens.bg + 'F0', borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: '0 -10px 32px rgba(22,35,42,0.14)', backdropFilter: 'blur(14px)' } as any, style]}>
      <View {...pan.panHandlers} style={{ paddingTop: 8, paddingHorizontal: 18, paddingBottom: 4 }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: tokens.hair }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Txt size={18} weight={700} tracking={-0.3} style={{ flex: 1 }}>Memo</Txt>
          <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={8} onPress={close}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}, 0 4px 10px rgba(22,35,42,0.08)` } as any}>
            <LineIcon name="x" size={18} color={tokens.ink} stroke={2.2} />
          </PressScale>
        </View>
      </View>
      <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 6, paddingBottom: foot + 14, gap: 10 }}>
        {shown.length ? shown.map((f) => {
          const d = dayOf(f.at);
          const head = d !== lastDay ? (lastDay = d, d === TODAY ? tx('heute', 'today') : d === YESTERDAY ? tx('gestern', 'yesterday') : short(d)) : null;
          return (
            <React.Fragment key={f.id}>
              {head ? <Txt size={12.5} color={tokens.sub} style={{ alignSelf: 'center', marginTop: 4 }}>{head}</Txt> : null}
              <Said f={f} mine={f.by === me} />
              <Made f={f} />
            </React.Fragment>
          );
        }) : (
          <Txt size={15} line={21} color={tokens.sub} style={{ alignSelf: 'center', textAlign: 'center', paddingHorizontal: 20 }}>{tx('Sag oder schreib Memo, was ansteht.', 'Tell or type Memo what’s coming up.')}</Txt>
        )}
        <Thinking by={me} />
      </ScrollView>
    </Animated.View>
  );
}

/** What was said: mine dark on the right, the partner's light on the left with the name above. */
function Said({ f, mine }: { f: FeedEntry; mine: boolean }) {
  if (!f.said.trim()) return null;
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', gap: 3 }}>
      {mine ? null : <Txt size={12} color={tokens.sub} style={{ paddingLeft: 4 }}>{persons[f.by].name}</Txt>}
      <View style={{ borderRadius: 20, paddingVertical: 9, paddingHorizontal: 15, backgroundColor: mine ? tokens.ink : tokens.row, boxShadow: mine ? undefined : `0 0 0 1px ${tokens.hair}` } as any}>
        <Txt size={15.5} line={21} color={mine ? tokens.onInk : tokens.ink}>{f.said}</Txt>
      </View>
    </View>
  );
}

/** What Memo made of it: one white card per Termin or list, and what Memo said back in a white bubble. */
function Made({ f }: { f: FeedEntry }) {
  const events = useStore((s) => s.events);
  if (f.kind === 'msg') return null;
  const cards: { k: string; title: string; sub: string }[] = [];
  if (!f.undone) {
    for (const id of f.events ?? []) {
      const e = events.find((x) => x.id === id) ?? f.snap?.events?.find((x) => x.id === id);
      if (!e) continue;
      const when = e.allDay ? tx('ganztägig', 'all day') : hm(e.start);
      cards.push({ k: id, title: e.title, sub: `${short(e.date)} · ${when} · ${tx('im Kalender', 'in the calendar')}` });
    }
    if (f.items?.ids.length && f.snap?.items?.length) cards.push({ k: 'items', title: f.snap.items.join(', '), sub: f.snap.list ? tx(`auf ${f.snap.list}`, `on ${f.snap.list}`) : tx('auf der Liste', 'on the list') });
    if (f.snap?.tasks?.length) cards.push({ k: 'tasks', title: f.snap.tasks.join(', '), sub: tx('bei den Aufgaben', 'in the tasks') });
  }
  const line = f.undone ? tx('Rückgängig gemacht.', 'Undone.') : f.say?.trim() || (!cards.length ? f.text?.trim() : '');
  return (
    <>
      {cards.map((c) => (
        <View key={c.k} style={{ alignSelf: 'stretch', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 15, gap: 2, backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}, 0 4px 12px rgba(22,35,42,0.05)` } as any}>
          <Txt size={16} weight={700} tracking={-0.2} numberOfLines={2}>{c.title}</Txt>
          <Txt size={14} color={tokens.sub} numberOfLines={1}>{c.sub}</Txt>
        </View>
      ))}
      {line ? (
        <View style={{ alignSelf: 'flex-start', maxWidth: '86%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}` } as any}>
          <Txt size={15.5} line={21} color={f.undone ? tokens.sub : tokens.ink}>{line}</Txt>
        </View>
      ) : null}
    </>
  );
}
