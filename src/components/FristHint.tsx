/**
 * Once a day Memo points at the next deadline of the first year, on top of Heute (Julian 28.11. okayed: the calendar
 * stays the start, the positioning still shows at once). A tap opens Erstes Jahr; the x hides it until tomorrow.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeOut } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import Pin from './buddy/Pin';
import { tokens } from '../theme';
import { useStore } from '../state/store';
import { TODAY, daysBetween } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const KEY = 'famcal.fristHint';

export default function FristHint() {
  const next = useStore((s) => s.milestones.filter((m) => m.frist && !m.done && m.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1))[0]);
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => setSeen(v), () => setSeen(null)); }, []);
  if (!next || seen === undefined || seen === TODAY) return null;
  const d = daysBetween(TODAY, next.date);
  const left = d === 0 ? tx('heute', 'today') : d === 1 ? tx('morgen', 'tomorrow') : tx(`noch ${d} Tage`, `${d} days left`);
  const done = () => { setSeen(TODAY); AsyncStorage.setItem(KEY, TODAY).catch(() => {}); };
  return (
    <Animated.View exiting={FadeOut.duration(160)} style={{ marginBottom: 12 }}>
      <PressScale scale={0.98} accessibilityLabel={`${next.title}, ${left}`} onPress={() => { haptics.select(); done(); router.navigate('/jahr' as any); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tokens.group, borderRadius: 16, paddingVertical: 10, paddingLeft: 10, paddingRight: 6 }}>
        <Pin size={30} mood="idle" ground={tokens.group} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={15} line={20} weight={600} numberOfLines={1}>{next.title}</Txt>
          <Txt size={13} line={17} weight={500} color={d <= 45 ? tokens.frist : tokens.sub}>{left}</Txt>
        </View>
        <PressScale accessibilityLabel={tx('Bis morgen ausblenden', 'Hide until tomorrow')} hitSlop={8} onPress={() => { haptics.select(); done(); }}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="x" size={16} color={tokens.mute} stroke={2} />
        </PressScale>
      </PressScale>
    </Animated.View>
  );
}
