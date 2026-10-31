/**
 * Julian 31.10. 15:42: no live text from the phone (it guessed English, then jumped to German, and everyone
 * thinks it heard wrong). Like the Claude app the field shows a calm wave while it listens, moving with the
 * voice from right to left; the real text comes from the cloud ears when the person taps stop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { tokens } from '../theme';

const BAR = 3;
const GAP = 3;
const TICK = 90;

export default function VoiceWaves({ level, height = 26 }: { level: SharedValue<number>; height?: number }) {
  const [w, setW] = useState(0);
  const n = Math.max(0, Math.floor((w + GAP) / (BAR + GAP)));
  const [vals, setVals] = useState<number[]>([]);
  const nRef = useRef(n);
  nRef.current = n;
  useEffect(() => {
    const id = setInterval(() => {
      // A little breath even in silence, so it never looks frozen.
      const v = Math.max(0.06, Math.min(1, level.value));
      setVals((a) => {
        const next = [...a, v];
        return next.length > nRef.current ? next.slice(next.length - nRef.current) : next;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [level]);
  // New bars come in from the right; the empty left part stays as quiet dots.
  const pad = Math.max(0, n - vals.length);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, flexDirection: 'row', alignItems: 'center', gap: GAP, overflow: 'hidden' }}>
      {Array.from({ length: pad }, (_, i) => <View key={`p${i}`} style={{ width: BAR, height: BAR, borderRadius: BAR, backgroundColor: tokens.hair }} />)}
      {vals.map((v, i) => (
        <View key={i} style={{ width: BAR, height: Math.max(BAR, Math.round(v * height)), borderRadius: BAR, backgroundColor: tokens.ink, opacity: 0.35 + 0.65 * ((i + 1) / vals.length) }} />
      ))}
    </View>
  );
}
