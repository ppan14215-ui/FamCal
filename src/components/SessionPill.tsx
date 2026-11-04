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
import { Tile } from './ui/Clay';
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
  const list = ids.map((id) => events.find((e) => e.id === id)).filter(Boolean) as typeof events;
  if (!list.length) return null;
  const label = tx(`${list.length} ${list.length === 1 ? 'Termin' : 'Termine'} eingetragen`, `${list.length} ${list.length === 1 ? 'event' : 'events'} added`);
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} layout={MORPH}
      style={{ alignSelf: open ? 'stretch' : 'flex-start', marginLeft: open ? 0 : 6, borderRadius: open ? 20 : 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, overflow: 'hidden' }}>
      <PressScale scale={0.97} accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => { haptics.select(); setOpen((o) => !o); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 10, paddingRight: 12 }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="check" size={11} color={tokens.onInk} stroke={2.6} />
        </View>
        <Txt size={13.5} weight={600}>{label}</Txt>
        <View style={{ flex: open ? 1 : 0 }} />
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={13} color={tokens.mute} stroke={2.2} /></View>
      </PressScale>
      {open ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {list.slice(-6).map((e) => (
            <PressScale key={e.id} scale={0.98} onPress={() => { haptics.select(); setOpen(false); router.push(`/termin/${e.id}`); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 4 }}>
              <Tile name={e.icon} bg="transparent" size={26} />
              <Txt size={14.5} weight={500} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
              <Txt size={13} color={tokens.sub}>{short(e.date)}{e.allDay ? '' : ` · ${e.start}`}</Txt>
            </PressScale>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
