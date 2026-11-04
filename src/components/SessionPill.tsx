/**
 * Julian 04.11.: like the "5/5 tasks" pill in the Claude app. A small pill above the field says what
 * this session put in the calendar; a tap opens the list, a tap on a row opens that Termin.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
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
  const [open, setOpen] = useState(false);
  const list = ids.map((id) => events.find((x) => x.id === id)).filter(Boolean).reverse() as typeof events;
  if (!list.length) return null;
  // Julian 04.11.: centred, small, the copy is just "1 recent", no chevron. A tap shows what it was.
  const label = tx(`${list.length} neu`, `${list.length} recent`);
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} layout={MORPH} style={{ alignSelf: 'center', alignItems: 'center', gap: 6, maxWidth: '86%' }}>
      {open ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} layout={MORPH}
          style={{ borderRadius: 18, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, paddingVertical: 4, paddingHorizontal: 6 }}>
          {list.slice(0, 5).map((e) => (
            <PressScale key={e.id} scale={0.98} onPress={() => { haptics.select(); setOpen(false); router.push(`/termin/${e.id}`); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34, paddingHorizontal: 6 }}>
              <Txt size={13.5} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>{e.title}</Txt>
              <Txt size={12.5} color={tokens.sub}>{short(e.date)}{e.allDay ? '' : ` · ${e.start}`}</Txt>
            </PressScale>
          ))}
        </Animated.View>
      ) : null}
      <PressScale scale={0.96} accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => { haptics.select(); setOpen((o) => !o); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingLeft: 6, paddingRight: 10, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="check" size={8.5} color={tokens.onInk} stroke={2.8} />
        </View>
        <Txt size={12} weight={600}>{label}</Txt>
      </PressScale>
    </Animated.View>
  );
}
