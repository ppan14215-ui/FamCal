/**
 * The chat card outside the chat (Julian 31.10.: "Könnte das nicht einfach wie
 * im Chat eine Card sein die sich über den content legt den ich eh schon
 * anschaue"). A sentence said on Kalender or Listen thinks in the same card as
 * in the chat, right above the field, and what it made shows there as the chat
 * card. The entry itself sits in the chat log, so the log stays complete.
 *
 * Kalender and Listen in the klar look (Julian 14.11.: "if I edit something in the calendar I don't want to jump to
 * the chat tab but just stay where I am at and watch the change happen", "Chat is just the log for what happened the
 * calendar is the basis of what we work on"): what was made arrives where I am looking and lights up there, and Memo
 * thinks in the bar. The card comes every time, over the page I am on (Julian 16.11.: "The overlay chat should ...
 * appear on top of where I am always unless in chat"): it says what happened and offers Undo, and nobody is taken to
 * another page for it.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens, glass } from '../theme';
import { useVeil } from './Veil';
import { Entry, Thinking } from './ChatCards';
import { useFeed } from '../lib/feed';
import { getFamily, myRole } from '../lib/sync';
import { navStyle } from '../lib/navStyle';
import { tx } from '../i18n/lang';

/** How long a finished card stays before it goes by itself. */
const STAY_MS = 4500;

let since = 0;
const subs = new Set<() => void>();
/** A sentence starts outside the chat: its card shows from now on. 0 closes it. */
export function openPeek(at = Date.now()) { since = at; subs.forEach((l) => l()); }
const useSince = () => React.useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => since, () => since);

/** `drop`: how far the card sits lower than its place in the dock (klar at rest: down to just above the nav pill). */
export default function Peek({ drop = 0 }: { drop?: number }) {
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
  const path = usePathname();
  // In the calendar and on the lists Memo thinks in the bar; the card comes with what he made.
  const quiet = navStyle() === 'klar' && (path === '/kalender' || path === '/listen');
  const thinks = thinking && !quiet;
  const card = made;
  if (!from || (!thinks && !card)) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} onTouchStart={() => setHeld(true)}
      style={[{ maxHeight: H * 0.55, borderRadius: 26, marginBottom: -drop }, glass.card]}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 12, gap: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={10} onPress={() => openPeek(0)} style={{ position: 'absolute', top: 12, left: 14, zIndex: 2 }}>
          <LineIcon name="x" size={18} color={tokens.mute} />
        </PressScale>
        {thinks ? <Thinking by={me} /> : card ? <Entry f={card} mine me={me} /> : null}
      </ScrollView>
    </Animated.View>
  );
}
