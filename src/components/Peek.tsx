/**
 * The chat card outside the chat (Julian 31.10.: "Könnte das nicht einfach wie
 * im Chat eine Card sein die sich über den content legt den ich eh schon
 * anschaue"). A sentence said on Kalender or Listen thinks in the same card as
 * in the chat, right above the field, and what it made shows there as the chat
 * card. The entry itself sits in the chat log, so the log stays complete.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens } from '../theme';
import { useVeil } from './Veil';
import { Entry, Thinking } from './ChatCards';
import { useFeed } from '../lib/feed';
import { getFamily, myRole } from '../lib/sync';
import { tx } from '../i18n/lang';

/** How long a finished card stays before it goes by itself. */
const STAY_MS = 9000;

let since = 0;
const subs = new Set<() => void>();
/** A sentence starts outside the chat: its card shows from now on. 0 closes it. */
export function openPeek(at = Date.now()) { since = at; subs.forEach((l) => l()); }
const useSince = () => React.useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => since, () => since);

export default function Peek() {
  const from = useSince();
  const v = useVeil();
  const feed = useFeed();
  const { height: H } = useWindowDimensions();
  const me = getFamily() ? myRole() : 'J';
  const thinking = !!from && v.inline && v.phase !== 'off';
  // The newest entry of mine since the sentence: what it made, or what the assistant said.
  let made = null as (typeof feed)[number] | null;
  if (from) for (let i = feed.length - 1; i >= 0; i--) { const f = feed[i]; if (Date.parse(f.at) < from - 2000) break; if (f.by === me && f.kind === 'made') { made = f; break; } }
  const [held, setHeld] = useState(false);
  useEffect(() => { setHeld(false); }, [from]);
  // It goes by itself, unless a finger is on it.
  useEffect(() => {
    if (!made || thinking || held) return;
    const t = setTimeout(() => openPeek(0), STAY_MS);
    return () => clearTimeout(t);
  }, [made?.id, thinking, held]);
  if (!from || (!thinking && !made)) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} onTouchStart={() => setHeld(true)}
      style={{ maxHeight: H * 0.55, borderRadius: 24, backgroundColor: tokens.bg, boxShadow: `0 0 0 1px ${tokens.hair}, 0 12px 32px rgba(22,35,42,0.16)` } as any}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingTop: 10, gap: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={10} onPress={() => openPeek(0)} style={{ position: 'absolute', top: 10, left: 12, zIndex: 2 }}>
          <LineIcon name="x" size={18} color={tokens.mute} />
        </PressScale>
        {thinking ? <Thinking by={me} /> : made ? <Entry f={made} mine me={me} /> : null}
      </ScrollView>
    </Animated.View>
  );
}
