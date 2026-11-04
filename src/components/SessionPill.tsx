/**
 * Julian 04.11.: like the "5/5 tasks" pill in the Claude app. A small pill above the field says what
 * this session put in the calendar; a tap opens the list, a tap on a row opens that Termin.
 */
import React from 'react';
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
  // Julian 04.11.: centred, smaller, only the latest entry; a tap opens it.
  const e = [...ids].reverse().map((id) => events.find((x) => x.id === id)).find(Boolean);
  if (!e) return null;
  const when = `${short(e.date)}${e.allDay ? '' : ` · ${e.start}`}`;
  return (
    <Animated.View key={e.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} layout={MORPH}
      style={{ alignSelf: 'center', maxWidth: '80%', borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
      <PressScale scale={0.97} accessibilityLabel={`${e.title}, ${when}`} onPress={() => { haptics.select(); router.push(`/termin/${e.id}`); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingLeft: 7, paddingRight: 11 }}>
        <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="check" size={9} color={tokens.onInk} stroke={2.8} />
        </View>
        <Txt size={12.5} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>{e.title}</Txt>
        <Txt size={12} color={tokens.sub}>{when}</Txt>
      </PressScale>
    </Animated.View>
  );
}
