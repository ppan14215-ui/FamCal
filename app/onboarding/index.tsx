/**
 * Hallo (storyboard 01.11.2026, step 1): the first thing anyone sees. It opens with Memo's story in
 * three short beats (Julian 01.11.2026: "Heute checkt die Metapher ja keiner"):
 *   1. Memo on a real fridge door, holding a note: that is where it lived.
 *   2. Memo rolls off the fridge into the phone: now it is digital and you can talk to it.
 *   3. The promise and the start button.
 * Tap anywhere or "Weiter" moves on. The real app signs in next; the test link goes to the family step.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { Screen, Btn, TextLink } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import Memo from '../../src/components/onboarding/Memo';
import { actions, toast } from '../../src/state/store';
import { LIVE } from '../../src/lib/live';
import { isPreview } from '../../src/lib/vorschau';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const after = (ms: number) => FadeInDown.duration(420).delay(ms);

/** A fridge door: tall rounded panel with a handle and an older note beside Memo. */
function Fridge({ children, phone }: { children: React.ReactNode; phone?: boolean }) {
  return (
    <Animated.View key={phone ? 'phone' : 'fridge'} entering={FadeIn.duration(360)} exiting={FadeOut.duration(200)}
      style={phone
        ? { width: 190, height: 300, borderRadius: 38, borderWidth: 3, borderColor: tokens.ink, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center' }
        : { width: 210, height: 300, borderRadius: 26, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.hair }}>
      {phone
        ? <View style={{ position: 'absolute', top: 12, width: 56, height: 6, borderRadius: 3, backgroundColor: tokens.hair }} />
        : <>
            <View style={{ position: 'absolute', left: 14, top: 70, width: 6, height: 70, borderRadius: 3, backgroundColor: tokens.hair }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: 104, height: 1, backgroundColor: tokens.hair }} />
            <View style={{ position: 'absolute', right: 22, bottom: 34, width: 46, height: 42, borderRadius: 4, backgroundColor: '#F6DDE2', transform: [{ rotate: '7deg' }] }} />
          </>}
      {children}
    </Animated.View>
  );
}

const STORY = [
  {
    title: () => tx('Hallo, ich bin Memo', 'Hi, I’m Memo'),
    lead: () => tx('Bisher hing ich bei euch am Kühlschrank und hab eure Zettel festgehalten.', 'Until now I lived on your fridge and held on to your notes.'),
  },
  {
    title: () => tx('Jetzt bin ich digital', 'Now I’m digital'),
    lead: () => tx('Und so schlau, dass ihr einfach mit mir reden könnt. Ich trage ein, erinnere und denke mit.', 'And smart enough that you can just talk to me. I add things, remind you and think ahead.'),
  },
  {
    title: () => tx('Einmal sagen, beide wissen’s', 'Say it once, you both know'),
    lead: () => tx('Termine, Einkauf, alles, was ansteht. Für eure ganze Familie.', 'Plans, shopping, everything coming up. For your whole family.'),
  },
];

export default function Hallo() {
  const [beat, setBeat] = useState(0);
  const last = beat === STORY.length - 1;
  const next = () => setBeat((b) => Math.min(STORY.length - 1, b + 1));
  const start = () => {
    if (isPreview()) return router.push('/onboarding/eltern');
    if (LIVE) return router.push('/anmelden');
    actions.reset();
    router.push('/onboarding/eltern');
  };
  const invited = () => {
    if (isPreview()) return toast(tx('Vorschau: hier ginge es zur Anmeldung', 'Preview: this would go to sign in'));
    if (LIVE) return router.push('/anmelden');
    actions.loadDemo();
    router.replace('/chat');
  };
  const story = STORY[beat];
  return (
    <Screen
      scroll={false}
      footer={last ? (
        <Animated.View entering={after(300)} style={{ gap: 8 }}>
          <Txt size={13} color={tokens.mute} center>{tx('Dauert etwa 2 Minuten', 'Takes about 2 minutes')}</Txt>
          <Btn label={tx('Los geht’s', 'Let’s go')} onPress={start} />
          <TextLink label={tx('Ich habe eine Einladung', 'I was invited')} weight={400} onPress={invited} />
        </Animated.View>
      ) : (
        <Animated.View entering={after(1100)} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }}>
            {STORY.map((_, k) => <View key={k} style={{ width: k === beat ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === beat ? tokens.ink : tokens.dotOff }} />)}
          </View>
          <Btn label={tx('Weiter', 'Next')} onPress={next} />
          <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => setBeat(STORY.length - 1)} />
        </Animated.View>
      )}
    >
      <Pressable onPress={last ? undefined : next} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28, paddingBottom: 24 }} accessible={false}>
        {beat === 0 ? (
          <Fridge><Memo act="note" size={104} delay={500} shadow={false} style={{ marginTop: 40 }} /></Fridge>
        ) : beat === 1 ? (
          <Fridge phone>
            <Memo act="roll" size={104} delay={150} shadow={false} style={{ marginTop: -30 }} />
            <Animated.View entering={FadeInDown.duration(320).delay(1300)} style={{ position: 'absolute', right: 14, bottom: 26, maxWidth: 150, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderBottomRightRadius: 5, backgroundColor: tokens.ink }}>
              <Txt size={13} line={17} color={tokens.onInk}>{tx('Freitag 15 Uhr Zahnarzt', 'Friday 3pm dentist')}</Txt>
            </Animated.View>
          </Fridge>
        ) : (
          <Memo act="land" size={148} delay={150} />
        )}
        <Animated.View key={beat} entering={FadeInDown.duration(420).delay(beat ? 250 : 800)} style={{ alignItems: 'center', gap: 12, paddingHorizontal: 8 }}>
          <Txt size={beat === 2 ? 34 : 32} line={40} weight={700} tracking={-1.1} center>{story.title()}<Dot /></Txt>
          <Txt size={18} line={26} color={tokens.sub} center>{story.lead()}</Txt>
        </Animated.View>
      </Pressable>
    </Screen>
  );
}
