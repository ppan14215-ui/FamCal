/**
 * One notification on the lock screen, as iOS draws it on a tinted wallpaper (moved from
 * app/demo/sperrbildschirm.tsx 02.11. so the onboarding showcase can reuse it). Pure view:
 * without onPress and actions it is a still picture.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Txt from '../../ui/Txt';
import PressScale from '../../ui/PressScale';
import { ClayIcon } from '../../ui/Clay';
import type { ClayName } from '../../../lib/clayIcons';
import { tx } from '../../../i18n/lang';

const WHITE = '#FFFFFF';

export type LockNotifProps = {
  title: string;
  body: string;
  /** "jetzt", "So 18:00". */
  when: string;
  actions?: { label: string; onPress: () => void }[];
  onPress?: () => void;
  /** App line above the title; the app's name by default. */
  app?: string;
  icon?: ClayName;
  /** A small pill beside the app line, e.g. "Vorschau" for a notification the app does not send yet. */
  tag?: string;
};

export default function LockNotif({ title, body, when, actions, onPress, app, icon = 'kalender', tag }: LockNotifProps) {
  return (
    <PressScale disabled={!onPress} onPress={onPress} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: actions ? 0 : 12, borderRadius: 22, backgroundColor: 'rgba(245,245,244,0.22)', gap: 4, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon name={icon} size={18} />
        </View>
        <Txt size={13} weight={600} color={WHITE} style={{ flex: 1, opacity: 0.85 }}>{app ?? tx('FAMILIENASSISTENT', 'FAMILY ASSISTANT')}</Txt>
        {tag ? (
          <View style={{ height: 18, paddingHorizontal: 7, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}>
            <Txt size={11} weight={600} color={WHITE}>{tag}</Txt>
          </View>
        ) : null}
        <Txt size={13} color={WHITE} style={{ opacity: 0.7 }}>{when}</Txt>
      </View>
      <Txt size={15.5} weight={600} color={WHITE}>{title}</Txt>
      <Txt size={15} line={21} color={WHITE} style={{ opacity: 0.92 }}>{body}</Txt>
      {actions ? (
        <View style={{ flexDirection: 'row', marginTop: 10, marginHorizontal: -14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.25)' }}>
          {actions.map((a, i) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => ({ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'transparent', borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: 'rgba(255,255,255,0.25)' })}
            >
              <Txt size={14} weight={600} color={WHITE}>{a.label}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </PressScale>
  );
}
