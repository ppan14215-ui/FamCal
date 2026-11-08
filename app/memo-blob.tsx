/** All of Memo's moods side by side, for checking the blob (Julian 07.11.). Not linked in the app. */
import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Blob from '../src/components/buddy/Blob';
import Txt from '../src/components/ui/Txt';
import { tokens } from '../src/theme';
import type { Mood } from '../src/lib/buddy';

const MOODS: Mood[] = ['idle', 'type', 'listen', 'think', 'happy', 'sleep'];

export default function MemoBlob() {
  const lvl = useSharedValue(0);
  const [joy, setJoy] = useState(0);
  useEffect(() => { lvl.value = withRepeat(withSequence(withTiming(0.9, { duration: 140 }), withTiming(0.2, { duration: 180 }), withTiming(0.7, { duration: 120 }), withTiming(0.05, { duration: 300 })), -1); }, []);
  useEffect(() => { const id = setInterval(() => setJoy((j) => j + 1), 2600); return () => clearInterval(id); }, []);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ padding: 24, gap: 18, flexDirection: 'row', flexWrap: 'wrap' }}>
      <View style={{ width: '100%', alignItems: 'center', paddingVertical: 20 }}><Blob size={180} mood="idle" /></View>
      {MOODS.map((m) => (
        <View key={m} style={{ width: 150, alignItems: 'center', gap: 6 }}>
          <Blob size={110} mood={m} level={m === 'listen' ? lvl : undefined} joy={m === 'idle' ? joy : 0} />
          <Txt size={13} color={tokens.sub}>{m}</Txt>
        </View>
      ))}
      <View style={{ width: '100%', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Blob size={24} mood="idle" shadow={false} still /><Blob size={24} mood="happy" shadow={false} still /><Blob size={38} mood="idle" />
      </View>
    </ScrollView>
  );
}
