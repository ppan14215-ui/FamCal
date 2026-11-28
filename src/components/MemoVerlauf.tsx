/**
 * Memo as a half sheet over the page (Julian 19.11., built 23.11.; brand 28.11. after the Amie split view in the
 * handover, section 7): the nav moves up and becomes the line between page and talk. Its tabs still switch the page
 * above, the conversation stays below; the page stays scrollable and tappable while Memo works. Pull the line up and
 * it becomes the full Chat; pull it down, tap the open tab again or press back and it closes. The entries are the Chat tab's own.
 */
import React, { useEffect, useRef } from 'react';
import { View, ScrollView, PanResponder, Keyboard, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { router, usePathname } from 'expo-router';
import Txt from './ui/Txt';
import LineIcon, { type LineName } from './ui/LineIcon';
import MemoMic from './buddy/MemoMic';
import { buddyTalk } from '../lib/buddy';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { useFeed } from '../lib/feed';
import { getFamily, myRole } from '../lib/sync';
import { short, TODAY } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';
import { setBarMode } from '../lib/navStyle';
import { Thinking, dayOf, Entry } from './ChatCards';

const SHOWN = 20;
const OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TABS: { name: string; icon: LineName; label: () => string }[] = [
  { name: 'kalender', icon: 'cal', label: () => tx('Kalender', 'Calendar') },
  { name: 'listen', icon: 'list', label: () => tx('Listen', 'Lists') },
  { name: 'chat', icon: 'chat', label: () => 'Chat' },
  { name: 'einstellungen', icon: 'person', label: () => tx('Profil', 'Profile') },
];

export default function MemoVerlauf({ foot, onClose }: { foot: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const feed = useFeed();
  const path = usePathname();
  const me = getFamily() ? myRole() : 'J';
  const scroller = useRef<ScrollView>(null);
  // In from below, the same way it goes back (MOTION.md: one place, one path). Transform and opacity only.
  const y = useSharedValue(40);
  const a = useSharedValue(0);
  useEffect(() => { y.value = withTiming(0, { duration: 260, easing: OUT }); a.value = withTiming(1, { duration: 200, easing: OUT }); }, []);
  const style = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ translateY: y.value }] }));
  const close = () => onClose();
  // The whole Chat has its own field above the nav, so the sheet's open input is let go on the way.
  const go = (name: string) => { haptics.select(); if (name === 'chat') { Keyboard.dismiss(); setBarMode('rest'); } router.navigate(('/' + name) as any); };
  const full = () => go('chat');
  // The line goes with the finger: down far or fast closes, up far or fast opens the whole Chat.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { y.value = g.dy > 0 ? g.dy : Math.max(-60, g.dy * 0.5); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 90 || g.vy > 0.8) { y.value = withTiming(height, { duration: 220, easing: OUT }, () => runOnJS(close)()); }
      else if (g.dy < -70 || g.vy < -0.8) { y.value = withTiming(0, { duration: 200, easing: OUT }); full(); }
      else y.value = withTiming(0, { duration: 200, easing: OUT });
    },
  })).current;
  const shown = feed.slice(-SHOWN).filter((f) => !(f.answer && feed.some((x) => x.id === f.answer!.ask)));
  const here = TABS.find((t) => path.startsWith('/' + t.name))?.name;
  const slot = (t: typeof TABS[number]) => {
    const on = t.name === here;
    return (
      <PressScale key={t.name} scale={0.94} accessibilityRole="tab" accessibilityLabel={t.label()} accessibilityState={{ selected: on }}
        onPress={() => { if (on) close(); else go(t.name); }} style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <LineIcon name={t.icon} size={22} color={on ? tokens.ink : tokens.mute} stroke={on ? 2 : undefined} />
        <Txt size={11} line={13} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.mute} numberOfLines={1}>{t.label()}</Txt>
      </PressScale>
    );
  };
  let lastDay = '';
  return (
    <Animated.View exiting={FadeOut.duration(150)} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, top: Math.round(height * 0.46), /* opaque: Android has no backdrop blur (Julian 24.11. 23:12) */ backgroundColor: tokens.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: `0 -1px 0 ${tokens.groupLine}, 0 -8px 24px rgba(20,48,47,0.08)` } as any, style]}>
      {/* The nav, moved up: the same five columns as the bar below, Memo big in the middle, now the line between the
          page and the talk (the draft "Memo halbes Blatt", 27.11.). */}
      <View {...pan.panHandlers} style={{ paddingHorizontal: 6, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 56 }}>
          {slot(TABS[0])}{slot(TABS[1])}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ marginTop: -30, width: 68, height: 68, borderRadius: 34, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
              <MemoMic box={58} size={58 / 0.8} ground={tokens.bg} onPress={() => buddyTalk()} label={tx('Mit Memo sprechen', 'Talk to Memo')} />
            </View>
          </View>
          {slot(TABS[2])}{slot(TABS[3])}
        </View>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: tokens.groupLine, marginTop: 6, marginBottom: 4 }} />
      </View>
      <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 10, paddingBottom: foot + 14, gap: 20 }}>
        {shown.length ? shown.map((f) => {
          const d = dayOf(f.at);
          const head = d !== lastDay ? (lastDay = d, d === TODAY ? tx('Heute', 'Today') : short(d)) : null;
          return (
            <React.Fragment key={f.id}>
              {head ? <Txt size={12.5} line={16} weight={600} color={tokens.mute} style={{ alignSelf: 'center' }}>{head}</Txt> : null}
              <Entry f={f} mine={f.by === me} me={me} answer={f.ask ? feed.find((x) => x.answer?.ask === f.id) : undefined} />
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
