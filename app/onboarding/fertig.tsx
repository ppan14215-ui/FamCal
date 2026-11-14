/**
 * Memo festkleben (concept + collection 01.11.2026: a tactile close, then the widget). Hold Memo
 * until the ring is full; Memo sticks to the fridge with a squash and a blink. Then the Heute widget
 * is offered, Memo winks, and the chat opens. Nothing tried earlier was saved.
 */
import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS, FadeInDown, cancelAnimation } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Btn } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import Step, { stepOf } from '../../src/components/onboarding/Step';
import Memo from '../../src/components/onboarding/Memo';
import { isPreview, endPreview } from '../../src/lib/vorschau';
import { haptics } from '../../src/lib/haptics';
import { toast } from '../../src/state/store';
import { tokens } from '../../src/theme';
import { stepViewed, onboardingDone, inviteSent, calendarConnected } from '../../src/lib/funnel';
import { tx } from '../../src/i18n/lang';

const HOLD_MS = 900;
const SIZE = 150;

export default function Fertig() {
  stepViewed('fertig');
  const [stuck, setStuck] = useState(false);
  const [winked, setWinked] = useState(false);
  const p = useSharedValue(0);
  const stick = () => { setStuck(true); haptics.success(); };
  const hold = Gesture.LongPress()
    .minDuration(HOLD_MS)
    .maxDistance(40)
    .enabled(!stuck)
    .onBegin(() => { p.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }); })
    .onStart(() => { runOnJS(stick)(); })
    .onFinalize((_, ok) => { if (!ok) { cancelAnimation(p); p.value = withTiming(0, { duration: 200 }); } });
  // Memo presses into the fridge while held.
  const press = useAnimatedStyle(() => ({ transform: [{ scale: 1 - p.value * 0.08 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: p.value > 0 && p.value < 1 ? 1 : 0, transform: [{ scale: 0.9 + p.value * 0.25 }] }));

  const go = () => {
    if (isPreview()) { endPreview(); router.dismissTo('/einstellungen'); toast(tx('Vorschau beendet, nichts geändert', 'Preview ended, nothing changed')); return; }
    onboardingDone();
    router.replace('/chat');
  };
  return (
    <Step
      step={stepOf('fertig')}
      memo={null}
      title={stuck ? tx('Ich bin da', 'I’m here') : tx('Kleb mich an den Kühlschrank', 'Stick me on the fridge')}
      lead={stuck ? tx('Ab jetzt einfach sagen, was ansteht. Ich merke es mir für euch beide.', 'From now on just tell me what’s coming up. I’ll keep it for both of you.') : tx('Halte mich gedrückt.', 'Press and hold me.')}
      footer={stuck ? <Btn label={tx('Los geht’s', 'Let’s go')} onPress={go} /> : <View style={{ height: 52 }} />}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: SIZE + 40, height: SIZE + 40, borderRadius: 999, borderWidth: 3, borderColor: tokens.done }, ring]} />
        <GestureDetector gesture={hold}>
          <Animated.View style={press} accessibilityRole="button" accessibilityLabel={tx('Memo gedrückt halten', 'Press and hold Memo')}>
            <Memo act={winked ? 'wink' : stuck ? 'land' : 'idle'} beat={stuck ? 1 : 0} size={SIZE} onDone={() => { if (stuck && !winked) setTimeout(() => setWinked(true), 700); }} />
          </Animated.View>
        </GestureDetector>
      </View>
      {stuck && Platform.OS === 'android' ? (
        <Animated.View entering={FadeInDown.duration(300).delay(500)} style={{ padding: 14, borderRadius: 18, backgroundColor: tokens.row, gap: 4 }}>
          <Txt size={15} weight={600}>{tx('Tipp: Heute auf dem Startbildschirm', 'Tip: today on your home screen')}</Txt>
          <Txt size={14} line={20} color={tokens.sub}>{tx('Lange auf den Startbildschirm drücken, Widgets, FamCal. Dann siehst du den Tag, ohne die App zu öffnen.', 'Long-press your home screen, Widgets, FamCal. Then you see the day without opening the app.')}</Txt>
        </Animated.View>
      ) : null}
    </Step>
  );
}
