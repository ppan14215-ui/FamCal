/**
 * Julian 04.11.: like the "5/5 tasks" pill in the Claude app, a small pill above the field says what this session made.
 * Julian 05.11.: a tap opens this session's conversation as an overlay, like the chat; each thread in it can be
 * picked up again ("Weiterführen"), and the next sentence changes exactly that. A session ends a day after its last entry.
 */
import React, { useRef, useState } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, LinearTransition, Easing } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { useStore } from '../state/store';
import { useFeed } from '../lib/feed';
import { sessionOf, setResume } from '../lib/session';
import { getFamily, myRole } from '../lib/sync';
import { hm } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';
import { Entry } from './ChatCards';

const MORPH = LinearTransition.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1));

export default function SessionPill() {
  const feed = useFeed();
  const events = useStore((s) => s.events);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const me = getFamily() ? myRole() : 'J';
  const session = sessionOf(feed, me);
  const alive = (ids?: string[]) => (ids ?? []).filter((id) => events.some((e) => e.id === id));
  const n = session.reduce((k, f) => k + (f.undone ? 0 : alive(f.events).length), 0);
  if (!n) return null;
  // Julian 04.11.: centred, small, the copy is just "1 recent", no chevron.
  const label = tx(`${n} neu`, `${n} recent`);
  const since = hm(new Date(session[0].at).toTimeString().slice(0, 5));
  return (
    <>
      <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} layout={MORPH} style={{ alignSelf: 'center' }}>
        <PressScale scale={0.96} accessibilityLabel={label} onPress={() => { haptics.select(); setOpen(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingLeft: 6, paddingRight: 10, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
            <LineIcon name="check" size={8.5} color={tokens.onInk} stroke={2.8} />
          </View>
          <Txt size={12} weight={600}>{label}</Txt>
        </PressScale>
      </Animated.View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setOpen(false)} accessibilityLabel={tx('Schließen', 'Close')} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '82%', backgroundColor: tokens.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 }}>
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: tokens.hair, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            <Txt size={17} weight={600}>{tx('Diese Sitzung', 'This session')}</Txt>
            <Txt size={13} color={tokens.sub}>{tx(`seit ${since}`, `since ${since}`)}</Txt>
          </View>
          <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 12 }} showsVerticalScrollIndicator={false}>
            {session.map((f) => {
              const can = !f.undone && !f.changed && alive(f.events).length > 0;
              return (
                <View key={f.id} style={{ gap: 6 }}>
                  <Entry f={f} mine me={me} />
                  {can ? (
                    <PressScale scale={0.96} accessibilityLabel={tx('Weiterführen', 'Continue')}
                      onPress={() => { haptics.select(); setOpen(false); setResume(f); }}
                      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
                      <LineIcon name="chat" size={15} color={tokens.ink} />
                      <Txt size={13} weight={600}>{tx('Weiterführen', 'Continue')}</Txt>
                    </PressScale>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
