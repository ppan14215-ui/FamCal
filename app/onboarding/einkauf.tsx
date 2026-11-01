/**
 * Probier's: Einkauf (concept 01.11.2026). Say what is missing, the items drop onto the list one by one,
 * tick one off. Only a try: nothing lands on the real list (Julian 01.11.2026).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Btn, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import PressScale from '../../src/components/ui/PressScale';
import LineIcon from '../../src/components/ui/LineIcon';
import Step from '../../src/components/onboarding/Step';
import TryField from '../../src/components/onboarding/TryField';
import type { MemoAct } from '../../src/components/onboarding/Memo';
import { splitItems } from '../../src/lib/act';
import { haptics } from '../../src/lib/haptics';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

type Row = { key: string; name: string; done: boolean };

export default function Einkauf() {
  const [rows, setRows] = useState<Row[]>([]);
  const [beat, setBeat] = useState(0);
  const [ticked, setTicked] = useState(false);
  const [act, setAct] = useState<MemoAct>('idle');

  const send = (said: string) => {
    const names = splitItems(said).filter(Boolean);
    if (!names.length) return;
    names.forEach((name, i) => setTimeout(() => {
      setRows((r) => [...r, { key: `${Date.now()}-${i}`, name: name[0].toUpperCase() + name.slice(1), done: false }]);
      setAct('happy'); setBeat((b) => b + 1);
      haptics.select();
    }, 160 * i));
  };
  const tick = (row: Row) => {
    setRows((r) => r.map((x) => (x.key === row.key ? { ...x, done: !x.done } : x)));
    if (!row.done) { haptics.success(); setTicked(true); setAct('cheer'); setBeat((b) => b + 1); }
  };

  const title = ticked ? tx('So einfach', 'That simple') : rows.length ? tx('Tipp einen an, wenn er im Korb ist', 'Tap one once it’s in the basket') : tx('Was fehlt im Kühlschrank?', 'What’s missing in the fridge?');
  return (
    <Step
      step={2}
      memo={act}
      memoBeat={beat}
      title={title}
      lead={rows.length ? tx('So landet es später auf eurer gemeinsamen Liste. Hier ist es nur ein Test.', 'This is how it lands on your shared list later. Here it is only a test.') : tx('Sag oder schreib, was ihr braucht. Nur zum Ausprobieren.', 'Say or write what you need. Just to try.')}
      footer={<>
        <Btn label={tx('Weiter', 'Next')} onPress={() => router.push('/onboarding/kalender')} />
        {rows.length ? null : <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => router.push('/onboarding/kalender')} />}
      </>}
    >
      {rows.length ? (
        <View style={{ borderRadius: 22, backgroundColor: tokens.row, paddingVertical: 4 }}>
          {rows.map((r, i) => (
            <Animated.View key={r.key} entering={FadeInDown.springify().damping(16).stiffness(200)}>
              <PressScale onPress={() => tick(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: tokens.hair }}>
                <View style={{ width: 26, height: 26, borderRadius: 999, borderWidth: r.done ? 0 : 1.5, borderColor: tokens.dotOff, backgroundColor: r.done ? tokens.done : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {r.done ? <LineIcon name="check" size={16} color={tokens.onInk} stroke={2.4} /> : null}
                </View>
                <Txt size={16} color={r.done ? tokens.mute : tokens.ink} style={r.done ? { textDecorationLine: 'line-through' } : undefined}>{r.name}</Txt>
              </PressScale>
            </Animated.View>
          ))}
        </View>
      ) : null}
      <TryField examples={rows.length ? [tx('Brot und Eier', 'Bread and eggs')] : [tx('Milch und Windeln', 'Milk and diapers'), tx('Brot, Eier und Bananen', 'Bread, eggs and bananas')]} placeholder={tx('Was fehlt? …', 'What’s missing? …')} onSend={send} />
    </Step>
  );
}
