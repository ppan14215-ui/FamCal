/**
 * Julian 04.11.: like the "5/5 tasks" pill in the Claude app. A small pill above the field says what
 * this session put in the calendar; a tap opens the list, a tap on a row opens that Termin.
 */
import React, { useState } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tile } from './ui/Clay';
import Animated, { FadeInDown, FadeOut, LinearTransition, Easing } from 'react-native-reanimated';
import { router } from 'expo-router';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { useStore } from '../state/store';
import { useSessionMade } from '../lib/session';
import { short } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const MORPH = LinearTransition.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1));

export default function SessionPill() {
  const ids = useSessionMade();
  const events = useStore((s) => s.events);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const list = ids.map((id) => events.find((x) => x.id === id)).filter(Boolean).reverse() as typeof events;
  if (!list.length) return null;
  // Julian 04.11.: centred, small, the copy is just "1 recent", no chevron.
  // A tap opens a sheet from below like the Claude app; the list scrolls, a tap outside or a swipe down closes it.
  const label = tx(`${list.length} neu`, `${list.length} recent`);
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
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%', backgroundColor: tokens.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: tokens.hair, marginBottom: 10 }} />
          <Txt size={17} weight={600} style={{ paddingHorizontal: 20, paddingBottom: 6 }}>{label}</Txt>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            {list.map((e) => (
              <PressScale key={e.id} scale={0.98} onPress={() => { haptics.select(); setOpen(false); router.push(`/termin/${e.id}`); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 8 }}>
                <Tile name={e.icon} bg="transparent" size={30} />
                <Txt size={15.5} weight={500} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
                <Txt size={13.5} color={tokens.sub}>{short(e.date)}{e.allDay ? '' : ` · ${e.start}`}</Txt>
              </PressScale>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
