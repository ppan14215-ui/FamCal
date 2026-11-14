/**
 * Top right of every tab, as in the klar draft Julian approved (the look before the Recordings style, 14.11. 09:33):
 * two round white buttons, the search and the plus. Chat shows the family and the settings there instead
 * (`people`). The plus menu grows out of the plus.
 */
import React, { useRef } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import PressScale from './PressScale';
import LineIcon, { type LineName } from './LineIcon';
import { Family } from './Person';
import { tokens } from '../../theme';
import { tx } from '../../i18n/lang';
import { haptics } from '../../lib/haptics';
import { setPlusFrom } from '../../lib/plusFrom';

export const HEAD_BTN = 40;
/** The soft lift of white controls on the ground. */
export const HEAD_SHADOW = '0 0 0 1px rgba(17,20,23,0.06), 0 2px 6px rgba(17,20,23,0.05)';
/** A card that lies on the ground (Julian 14.11.: "cards and shadow like wabi"): soft and low, it lifts a little and never glows. */
export const CARD_SHADOW = '0 1px 2px rgba(17,20,23,0.04), 0 6px 16px rgba(17,20,23,0.06)';

/** One round white button of the head. */
export function HeadBtn({ icon, label, onPress, size = 21 }: { icon: LineName; label: string; onPress: () => void; size?: number }) {
  return (
    <PressScale accessibilityLabel={label} hitSlop={6} scale={0.92} onPress={onPress}
      style={{ width: HEAD_BTN, height: HEAD_BTN, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', boxShadow: HEAD_SHADOW } as any}>
      <LineIcon name={icon} size={size} color={tokens.ink} />
    </PressScale>
  );
}

export default function HeaderRight({ before, people }: { before?: React.ReactNode; /** Chat: the family and the way to the settings instead of search and plus. */ people?: boolean }) {
  // The plus menu grows out of the plus: note where it sits, then open. If the place cannot be read, it opens anyway.
  const plus = useRef<View>(null);
  const openNew = () => {
    haptics.tap();
    let gone = false;
    const go = (f: { x: number; y: number; size: number } | null) => { if (gone) return; gone = true; setPlusFrom(f); router.push('/neu'); };
    const v = plus.current as any;
    if (v?.measureInWindow) v.measureInWindow((x: number, y: number, w: number, h: number) => go(w ? { x: x + w / 2, y: y + h / 2, size: w } : null));
    setTimeout(() => go(null), 150);
  };
  if (people) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {before}
      <PressScale accessibilityLabel={tx('Familie', 'Family')} scale={0.95} onPress={() => { haptics.select(); router.push('/personen'); }}><Family /></PressScale>
      <HeadBtn icon="settings" label={tx('Einstellungen', 'Settings')} onPress={() => { haptics.select(); router.push('/einstellungen'); }} size={20} />
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {before}
      <HeadBtn icon="search" label={tx('Suchen', 'Search')} onPress={() => { haptics.select(); router.push('/suche'); }} />
      <View ref={plus} collapsable={false}>
        <HeadBtn icon="plus" label={tx('Neu', 'New')} onPress={openNew} size={22} />
      </View>
    </View>
  );
}
