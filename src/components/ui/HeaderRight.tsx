/**
 * Top right of every tab, after the "Recordings" reference (Julian 14.11.): a round white button for the family
 * and settings, and the round plus in the one interaction colour. The plus opens "Was kommt dazu".
 */
import React, { useRef } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import PressScale from './PressScale';
import LineIcon from './LineIcon';
import { tokens } from '../../theme';
import { tx } from '../../i18n/lang';
import { haptics } from '../../lib/haptics';
import { setPlusFrom } from '../../lib/plusFrom';

export const HEAD_BTN = 38;
/** The soft lift of white controls on the grey ground. */
export const HEAD_SHADOW = '0 0 0 1px rgba(17,20,23,0.035), 0 2px 8px rgba(17,20,23,0.06)';

export default function HeaderRight({ before }: { before?: React.ReactNode }) {
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {before}
      <PressScale
        accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')}
        hitSlop={6}
        scale={0.92}
        onPress={() => router.push('/einstellungen')}
        style={{ width: HEAD_BTN, height: HEAD_BTN, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', boxShadow: HEAD_SHADOW } as any}
      >
        <LineIcon name="settings" size={19} color={tokens.ink} />
      </PressScale>
      <View ref={plus} collapsable={false}>
        <PressScale
          accessibilityLabel={tx('Neu', 'New')}
          hitSlop={6}
          scale={0.9}
          onPress={openNew}
          style={{ width: HEAD_BTN, height: HEAD_BTN, borderRadius: 999, backgroundColor: tokens.accent, alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${tokens.accentGlow}` } as any}
        >
          <LineIcon name="plus" size={20} color="#FFFFFF" stroke={2.3} />
        </PressScale>
      </View>
    </View>
  );
}

/** Back and forward as one white pill, for views that page (days, weeks, months, years). */
export function HeadArrows({ onStep, prev, next }: { onStep: (dir: 1 | -1) => void; prev: string; next: string }) {
  const half = { width: 33, height: HEAD_BTN - 4, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: HEAD_BTN - 4, borderRadius: 999, backgroundColor: tokens.row, boxShadow: HEAD_SHADOW } as any}>
      <PressScale accessibilityLabel={prev} hitSlop={{ top: 8, bottom: 8, left: 8 }} scale={0.88} onPress={() => { haptics.select(); onStep(-1); }} style={half}>
        <View style={{ transform: [{ rotate: '180deg' }] }}><LineIcon name="chev" size={14} color={tokens.ink} stroke={2.2} /></View>
      </PressScale>
      <View style={{ width: 1, height: 14, backgroundColor: tokens.hair }} />
      <PressScale accessibilityLabel={next} hitSlop={{ top: 8, bottom: 8, right: 8 }} scale={0.88} onPress={() => { haptics.select(); onStep(1); }} style={half}>
        <LineIcon name="chev" size={14} color={tokens.ink} stroke={2.2} />
      </PressScale>
    </View>
  );
}
