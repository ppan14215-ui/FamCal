/**
 * The klar input of the app, standing alone in the onboarding (Julian 02.11.2026: the try step must "showcase the
 * app in its final form"; 14.11.: the klar look). The very same pieces as on the tabs: the glass pill with Memo
 * (NavBar), the typing card (TalkBar) and the dark Sprechkarte with the big live words (SpeakCard). Only the wiring
 * differs: what is said goes to `onSend` and nowhere else, no assistant and no network. On the tabs Dock.tsx does
 * this wiring.
 *
 * Lies over its parent, which must reach down to the bottom edge of the screen.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TalkBar from '../TalkBar';
import SpeakCard from '../SpeakCard';
import { KlarPill, navH, klarFoot } from '../NavBar';
import { useBarMode, setBarMode } from '../../lib/navStyle';
import { useSpeak, speakOpen } from '../../lib/speak';
import { useBuddyTalk, useBuddyKeys, getBuddy } from '../../lib/buddy';
import { useTyping, useKeyboardInset } from '../../lib/keyboard';
import { tokens } from '../../theme';
import { tx } from '../../i18n/lang';

const OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function KlarTalk({ onSend, spoken, placeholder, tab = 'kalender' }: {
  onSend: (text: string) => void;
  /** What the mic "hears" in the test link, one after the other. */
  spoken: string[];
  placeholder?: string;
  /** The tab the pill shows as open. */
  tab?: string;
}) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const typing = useTyping();
  const mode = useBarMode();
  const cardOpen = speakOpen(useSpeak());
  const [listenKey, setListenKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);

  // A tap on Memo listens, a long press goes to the keyboard. Taps from before this bar existed do not count.
  const talkN = useBuddyTalk(), keysN = useBuddyKeys();
  const seen = useRef({ talkN, keysN });
  useEffect(() => { if (talkN === seen.current.talkN) return; seen.current.talkN = talkN; setBarMode('input'); setListenKey(Date.now()); }, [talkN]);
  useEffect(() => { if (keysN === seen.current.keysN) return; seen.current.keysN = keysN; setBarMode('input'); setFocusKey((k) => k + 1); }, [keysN]);
  // The pill starts at rest and is left at rest for whoever shows it next.
  useEffect(() => { setBarMode('rest'); return () => { setBarMode('rest'); }; }, []);

  // The typing card lies over the pill while the input is open and the Sprechkarte is not.
  const show = (typing || mode === 'input') && !cardOpen;
  const a = useSharedValue(0);
  useEffect(() => { a.value = withTiming(show ? 1 : 0, { duration: show ? 240 : 140, easing: OUT }); }, [show]);
  const card = useAnimatedStyle((): any => ({ opacity: a.value, transform: [{ scale: 0.92 + 0.08 * a.value }] }));
  const bottom = kb > 0 ? kb + 8 : klarFoot(insets.bottom);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <KlarPill current={tab} />
      {/* A tap beside the open input puts it away; words already typed stay in it. */}
      {show ? <Pressable accessibilityLabel={tx('Eingabe schließen', 'Close input')} onPress={() => { Keyboard.dismiss(); const b = getBuddy(); if (!b.typed && !b.listening) setBarMode('rest'); }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom }}>
        <View pointerEvents={show ? 'box-none' : 'none'} style={{ minHeight: navH(), justifyContent: 'flex-end' }}>
          <Animated.View style={[{ transformOrigin: '82% 100%' } as any, card]}>
            <TalkBar
              key="tabs"
              split
              card
              klar
              speakCard
              onIdle={() => setBarMode('rest')}
              onBusy={() => setBarMode('input')}
              // Here the result is the point: the keyboard goes, so the new line is seen landing.
              onSend={(t) => { Keyboard.dismiss(); setBarMode('rest'); onSend(t); }}
              spoken={spoken}
              listenKey={listenKey}
              focusKey={focusKey}
              placeholder={placeholder}
            />
          </Animated.View>
        </View>
        <SpeakCard klar barH={52} from={tokens.row} />
      </View>
    </View>
  );
}
