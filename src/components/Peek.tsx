/**
 * The chat card outside the chat (Julian 31.10.: "Könnte das nicht einfach wie
 * im Chat eine Card sein die sich über den content legt den ich eh schon
 * anschaue"). A sentence said on Kalender or Listen thinks in the same card as
 * in the chat, right above the field, and what it made shows there as the chat
 * card. The entry itself sits in the chat log, so the log stays complete.
 *
 * Kalender and Listen in the klar look (Julian 14.11.: "if I edit something in the calendar I don't want to jump to
 * the chat tab but just stay where I am at and watch the change happen", "Chat is just the log for what happened the
 * calendar is the basis of what we work on"): what was made arrives where I am looking and lights up there, Memo
 * thinks in the bar, and no chat card lies over it. The card still comes when words are the answer, when it needs me
 * (the time question), or when what changed is no longer there to look at.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens } from '../theme';
import { useVeil } from './Veil';
import { Entry, Thinking } from './ChatCards';
import { useFeed } from '../lib/feed';
import { getFamily, myRole } from '../lib/sync';
import { useStore } from '../state/store';
import { navStyle } from '../lib/navStyle';
import { tx } from '../i18n/lang';

/** How long a finished card stays before it goes by itself. */
const STAY_MS = 4500;

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
  const path = usePathname();
  const events = useStore((x) => x.events);
  const quiet = navStyle() === 'klar' && (path === '/kalender' || path === '/listen');
  // It landed on the page I am on: Termine in the calendar, items and tasks on the lists.
  const landed = !!made && !made.timeQ && !made.undone && (path === '/kalender'
    ? !!made.events?.length && made.events.every((id) => events.some((e) => e.id === id))
    : !!(made.items?.ids.length || made.tasks?.length));
  const thinks = thinking && !quiet;
  const card = made && !(quiet && landed) ? made : null;
  if (!from || (!thinks && !card)) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} onTouchStart={() => setHeld(true)}
      style={{ maxHeight: H * 0.55, borderRadius: 24, backgroundColor: tokens.bg, boxShadow: '0 1px 2px rgba(22,35,42,0.06), 0 4px 14px rgba(22,35,42,0.08)' } as any}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingTop: 10, gap: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={10} onPress={() => openPeek(0)} style={{ position: 'absolute', top: 10, left: 12, zIndex: 2 }}>
          <LineIcon name="x" size={18} color={tokens.mute} />
        </PressScale>
        {thinks ? <Thinking by={me} /> : card ? <Entry f={card} mine me={me} /> : null}
      </ScrollView>
    </Animated.View>
  );
}
