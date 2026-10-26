/**
 * Hinweise · Sperrbildschirm (V1-Push). Shows how push looks: at most one
 * hint a day plus the Sunday preview. Actions answer right on the lock screen.
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Txt from '../../src/components/ui/Txt';
import { RoundButton } from '../../src/components/ui/kit';
import { ClayIcon } from '../../src/components/ui/Clay';
import { useStore, toast } from '../../src/state/store';
import { addDays, monday, daysBetween, count, TODAY } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';

const WHITE = '#FFFFFF';

function Notif({ title, body, when, actions, onPress }: { title: string; body: string; when: string; actions?: { label: string; onPress: () => void }[]; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: actions ? 0 : 12, borderRadius: 22, backgroundColor: 'rgba(245,245,244,0.22)', gap: 4, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon name="kalender" size={18} />
        </View>
        <Txt size={13} weight={600} color={WHITE} style={{ flex: 1, opacity: 0.85 }}>FAMILIENASSISTENT</Txt>
        <Txt size={13} color={WHITE} style={{ opacity: 0.7 }}>{when}</Txt>
      </View>
      <Txt size={15.5} weight={600} color={WHITE}>{title}</Txt>
      <Txt size={15} line={21} color={WHITE} style={{ opacity: 0.92 }}>{body}</Txt>
      {actions ? (
        <View style={{ flexDirection: 'row', marginTop: 10, marginHorizontal: -14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.25)' }}>
          {actions.map((a, i) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => ({ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'transparent', borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: 'rgba(255,255,255,0.25)' })}
            >
              <Txt size={14} weight={600} color={WHITE}>{a.label}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Sperrbildschirm() {
  const insets = useSafeAreaInsets();
  const [u6Open, setU6Open] = useState(true);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);

  // Sunday preview, counted from the sample data as of Sunday 25 Oct.
  const preview = useMemo(() => {
    const mon = monday(TODAY);
    const sun = addDays(mon, 6);
    const week = events.filter((e) => !e.work && e.date >= mon && e.date <= sun).length;
    const open = tasks.filter((t) => !t.done && !t.who).length;
    const eg = docs.find((d) => d.id === 'd-eg');
    const weeks = eg?.frist ? Math.round(daysBetween(addDays(mon, -1), eg.frist) / 7) : 7;
    return `${count(week, 'Termin', 'Termine', true)}, ${count(open, 'Ding', 'Dinge')} ohne Zuständigen. Elterngeld-Frist in ${weeks} Wochen.`;
  }, [events, tasks, docs]);

  const answer = (msg: string) => {
    haptics.success();
    setU6Open(false);
    toast(msg);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1E2E35' }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="lock" x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor="#5E7B86" />
            <Stop offset="0.55" stopColor="#2E4650" />
            <Stop offset="1" stopColor="#1E2E35" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lock)" />
      </Svg>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14 }}>
        <RoundButton icon="x" label="Schließen" bg="rgba(255,255,255,0.18)" color={WHITE} onPress={() => (router.canGoBack() ? router.back() : router.replace('/heute'))} />
      </View>
      <View style={{ paddingHorizontal: 14, gap: 10 }}>
        <View style={{ alignItems: 'center', marginBottom: 26 }}>
          <Txt size={17} weight={600} color={WHITE} style={{ opacity: 0.9 }}>Mittwoch, 28. Oktober</Txt>
          <Txt size={84} line={92} weight={600} tracking={-3} color={WHITE}>19:00</Txt>
        </View>
        {u6Open ? (
          <Animated.View exiting={FadeOut.duration(200)}>
            <Notif
              title="Morgen 9:30 U6 mit Ben"
              body="Du bringst ihn. U-Heft und Impfpass liegen im Flur."
              when="jetzt"
              onPress={() => router.push('/termin/e-u6')}
              actions={[
                { label: 'Erledigt', onPress: () => answer('Erledigt. Julia sieht es auch.') },
                { label: 'Ich mach’s', onPress: () => answer('Tom bringt Ben zur U6') },
                { label: 'Später', onPress: () => answer('Wir erinnern dich morgen um 8:00') },
              ]}
            />
          </Animated.View>
        ) : null}
        <Animated.View layout={LinearTransition.duration(240)}>
          <Notif title="Eure Woche" body={preview} when="So 18:00" onPress={() => router.dismissTo('/heute')} />
        </Animated.View>
        <Txt size={13} color={WHITE} center style={{ opacity: 0.75, marginTop: 8 }}>Nur Wichtiges: höchstens 1 Hinweis am Tag plus Sonntags-Vorschau.</Txt>
      </View>
    </View>
  );
}
