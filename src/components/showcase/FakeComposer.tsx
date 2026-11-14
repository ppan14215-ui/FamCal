/**
 * The chat field for the onboarding showcase: a picture of TalkBar's `split` pill (radius 30, hair
 * border, plus on the left, the grey mic, the black send arrow once there is text), measured from
 * TalkBar.tsx so it looks the same. It holds no input and never focuses: the chapter types the text
 * in from outside. The real TalkBar is never mounted here (fillField would open the keyboard).
 *
 * - `pulse`: a new value makes the send arrow swell once, gently (chapter 1: "tap send").
 * - `press`: a new value presses the arrow in, as a finger would.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import Txt from '../ui/Txt';
import LineIcon from '../ui/LineIcon';
import { tokens, motion, easing } from '../../theme';
import { tx } from '../../i18n/lang';

// TalkBar.tsx: LINE 22, PAD 11, MIN_H 44.
const LINE = 22;
const PAD = 11;

export default function FakeComposer({ text, pulse = 0, press = 0, placeholder = tx('Sag oder schreib, was ansteht …', 'Say or type what\'s coming up …') }: { text: string; pulse?: number; press?: number; placeholder?: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (!pulse) return;
    s.value = withSequence(withTiming(1.09, { duration: 280, easing: easing.out }), withTiming(1, { duration: 360, easing: easing.inOut }));
  }, [pulse]);
  useEffect(() => {
    if (!press) return;
    s.value = withSequence(withTiming(0.9, { duration: motion.press, easing: easing.out }), withTiming(1, { duration: motion.micro, easing: easing.out }));
  }, [press]);
  const arrow = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 6, borderRadius: 30, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
      <View style={{ width: 36, height: 36, marginBottom: 6, marginLeft: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
        <LineIcon name="plus" size={24} color={tokens.ink} stroke={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0, minHeight: LINE + PAD * 2, marginBottom: 2, paddingVertical: PAD, paddingHorizontal: 3, justifyContent: 'center' }}>
        <Txt size={16} line={LINE} color={text ? tokens.ink : tokens.mute} numberOfLines={3}>{text || placeholder}</Txt>
      </View>
      <View style={{ width: 36, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
        <LineIcon name="mic" size={22} color={tokens.ink} />
      </View>
      {text ? (
        <Animated.View style={[{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }, arrow]}>
          <LineIcon name="send" size={20} color={tokens.onInk} />
        </Animated.View>
      ) : null}
    </View>
  );
}
