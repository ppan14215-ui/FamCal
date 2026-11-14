/**
 * Memo in the bar, where the mic was (Julian 08.11. 23:19: "bring the mascot where the phone record icon is,
 * so only one exist"). Tap him and the field listens, exactly like the mic did; typing stays in the field.
 * He shows what the app does (listen, think, type, sleep), jiggles when something lands, and wears a "?"
 * while a question waits. The floating Memo above the field steps aside while he sits here.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Pin from './Pin';
import LineIcon from '../ui/LineIcon';
import { useMascot } from '../../lib/mascot';
import Txt from '../ui/Txt';
import { useBuddy, setBuddy, dockIn, dockOut, voiceLevel, isNight, type Mood } from '../../lib/buddy';
import { useTyping } from '../../lib/keyboard';
import { useVeil } from '../Veil';
import { useMemoOut } from '../../lib/memoOut';
import { tokens } from '../../theme';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';

export default function MemoMic({ onPress, onLongPress, box = 34, size = 40, label, ground }: { onPress: () => void; onLongPress?: () => void; box?: number; size?: number; label?: string; ground?: string }) {
  const b = useBuddy();
  const minimal = useMascot() === 'minimal';
  const typing = useTyping();
  const veil = useVeil();
  // Klar: while he is out on the Sprechkarte or as the thinking bubble, he is not drawn here (never two).
  const out = useMemoOut().out;
  const [night, setNight] = useState(isNight());
  useEffect(() => { const id = setInterval(() => setNight(isNight()), 60000); return () => clearInterval(id); }, []);
  useEffect(() => { dockIn(); return () => { dockOut(); }; }, []);
  const me = useRef<View>(null);
  // Tell the floating Memo where to glide on start and where to glance from.
  const measure = () => me.current?.measureInWindow?.((x, y, w, h) => { if (w) setBuddy({ dockAt: { x: x + w / 2, y: y + h / 2 }, dockS: size }); });
  useEffect(() => { const t = [setTimeout(measure, 60), setTimeout(measure, 700)]; return () => t.forEach(clearTimeout); }, []);
  const mood: Mood = b.listening ? 'listen' : veil.phase === 'think' || b.thinking ? 'think' : typing ? 'type' : night ? 'sleep' : 'idle';
  const glance = React.useMemo(() => {
    if (!b.touch || !b.dockAt) return undefined;
    const c = (v: number) => Math.max(-1, Math.min(1, v));
    return { x: c((b.touch.x - b.dockAt.x) / 140), y: c((b.touch.y - b.dockAt.y) / 140), n: b.touch.n };
  }, [b.touch?.n]);
  // Typing: the text sits left of him on one line, above him once it grows into the card; his eyes follow it as it gets longer.
  const typeAt = { x: Math.round((-1 + 0.5 * Math.min(1, b.typed / 40)) * 10) / 10, y: b.typed > 0 ? -0.85 : -0.15 };
  const ask = b.waiting && mood !== 'listen' && mood !== 'think';
  // Tapped: he squints for a moment, then listens.
  const [tap, setTap] = useState(0);
  // Minimal (Julian 11.11.): the plain mic as before, no mascot.
  if (minimal) return (
    <Pressable onPress={() => { haptics.select(); onPress(); }} hitSlop={6} accessibilityRole="button" accessibilityLabel={tx('Sprechen', 'Speak')}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <LineIcon name="mic" size={Math.round(box * 0.6)} color={tokens.ink} />
    </Pressable>
  );
  return (
    <Pressable ref={me as any} onLayout={measure} onPress={() => { haptics.select(); setTap((n) => n + 1); onPress(); }} onLongPress={onLongPress ? () => { haptics.select(); onLongPress(); } : undefined} hitSlop={6}
      accessibilityRole="button" accessibilityLabel={label ?? tx('Memo, tippen zum Sprechen', 'Memo, tap to talk')}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      <View pointerEvents="none" style={{ width: size, height: size, marginTop: -(0.08 * size - 0.4), opacity: b.landed && !b.dockHidden && !out ? 1 : 0 }}>
        <Pin size={size} mood={mood} joy={b.joy} joyKind={b.joyKind} poke={b.poke} tap={tap} sad={b.sad} wink={b.wink} level={voiceLevel} glance={glance} typeAt={typeAt} ground={ground} />
      </View>
      {ask ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: -5, top: -5, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}` } as any}>
          <Txt size={10.5} weight={700} color={tokens.done} style={{ lineHeight: 12 }}>?</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}
