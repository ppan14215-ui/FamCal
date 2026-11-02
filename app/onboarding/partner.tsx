/**
 * Zu zweit (storyboard 01.11.2026, step 7): two phones, Memo hops from yours
 * to your partner's, lands and blinks. Then the invite. Colours and photos
 * moved out of onboarding (each picks their own later in Einstellungen).
 */
import React, { useEffect, useState } from 'react';
import { View, Share } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { isPreview, previewNames } from '../../src/lib/vorschau';
import { movedDentist } from '../../src/components/showcase/chapters';
import { short, hm } from '../../src/lib/dates';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, withSequence, Easing, useReducedMotion, runOnJS } from 'react-native-reanimated';
import { Btn, Chip, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Avatar } from '../../src/components/ui/Person';
import { Tile } from '../../src/components/ui/Clay';
import Step, { stepOf } from '../../src/components/onboarding/Step';
import Memo from '../../src/components/onboarding/Memo';
import { toast, useStore } from '../../src/state/store';
import { haptics } from '../../src/lib/haptics';
import { getFamily } from '../../src/lib/sync';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const LINK = 'familie.app/j/huber-7Q2';
/** The real app invites with the family's six letter code (Julian 27.10.); the test link keeps the sample link. */
const invite = () => {
  const code = getFamily()?.invite_code;
  return code
    ? { shown: `Code ${code}`, copy: code, message: (from: string) => tx(`${from} lädt dich in euren Familienkalender ein. Lade FamCal, melde dich an und gib den Code ${code} ein.`, `${from} invites you to your family calendar. Get FamCal, sign in and enter the code ${code}.`) }
    : { shown: LINK, copy: `https://${LINK}`, message: (from: string) => tx(`${from} lädt dich in euren Familienkalender ein: https://${LINK}`, `${from} invites you to your family calendar: https://${LINK}`) };
};

export default function Partner() {
  const stored = useStore((s) => s.names);
  const preview = isPreview();
  const names = preview ? previewNames() : stored;
  const you = names.T || tx('dein Partner', 'your partner');
  // Preview ends back in Einstellungen, where it was opened, with everything as it was.
  // Memo festkleben comes last; the preview ends there too.
  const done = () => router.push('/onboarding/fertig');
  return (
    <Step
      step={stepOf('partner')}
      memo={null}
      title={tx(`Ab jetzt weiß ${names.T || 'ihr beide'} alles sofort`, `From now on ${names.T || 'you both'} know${names.T ? 's' : ''} right away`)}
      lead={tx(`Was du sagst, sieht ${you} sofort, und umgekehrt. Die App läuft auf iPhone und Android.`, `What you say, ${you} sees right away, and the other way round. Works on iPhone and Android.`)}
      footer={<>
        <Btn label={tx('Einladung senden', 'Send invite')} icon="send" onPress={async () => { if (!preview) await Share.share({ message: invite().message(names.J) }).catch(() => {}); done(); }} />
        <TextLink label={tx('Später einladen', 'Invite later')} weight={400} onPress={done} />
      </>}
    >
      <Phones me={names.J} you={names.T} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 16, paddingRight: 10, borderRadius: 18, backgroundColor: tokens.row }}>
        <Txt size={15} color={tokens.sub} style={{ flex: 1 }} numberOfLines={1}>{invite().shown}</Txt>
        <Chip icon={<LineIcon name="copy" size={16} />} onPress={async () => { if (preview) return toast(tx('Vorschau: nichts kopiert', 'Preview: nothing copied')); await Clipboard.setStringAsync(invite().copy).catch(() => {}); haptics.select(); toast(getFamily() ? tx('Code kopiert', 'Code copied') : tx('Link kopiert', 'Link copied')); }}>{tx('Kopieren', 'Copy')}</Chip>
      </View>
    </Step>
  );
}

const PHONE_W = 118;
const GAP = 40;
const M = 54;

/** Two phones; Memo carries the Termin from one to the other in an arc. */
function Phones({ me, you }: { me: string; you: string }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [arrived, setArrived] = useState(reduced);
  const [beat, setBeat] = useState(0);
  const land = () => { setArrived(true); setBeat((b) => b + 1); haptics.success(); };

  useEffect(() => {
    if (reduced) { x.value = PHONE_W + GAP; return; }
    const D = 620;
    x.value = withDelay(900, withTiming(PHONE_W + GAP, { duration: D, easing: Easing.inOut(Easing.cubic) }, (ok) => { if (ok) runOnJS(land)(); }));
    y.value = withDelay(900, withSequence(
      withTiming(-58, { duration: D / 2, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: D / 2, easing: Easing.in(Easing.quad) }),
    ));
  }, []);
  const hop = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] as any }));

  return (
    <View style={{ alignItems: 'center', paddingTop: 34 }}>
      <View style={{ width: PHONE_W * 2 + GAP }}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          <Phone name={me || tx('Du', 'You')} p="J" show />
          <Phone name={you || tx('Partner', 'Partner')} p="T" show={arrived} />
        </View>
        <Animated.View style={[{ position: 'absolute', top: -M + 6, left: (PHONE_W - M) / 2 }, hop]}>
          <Memo act={beat ? 'blink' : 'idle'} beat={beat} size={M} shadow={false} />
        </Animated.View>
      </View>
    </View>
  );
}

function Phone({ name, p, show }: { name: string; p: 'J' | 'T'; show: boolean }) {
  // The Termin the showcase made, where chapter 3 left it, as the partner will see it (v3, 02.11.).
  // Titled without the demo child's name: this is the real family's screen.
  const tried = movedDentist();
  return (
    <View style={{ width: PHONE_W, height: 200, borderRadius: 26, borderWidth: 5, borderColor: tokens.ink, backgroundColor: tokens.row, padding: 8, gap: 8 }}>
      <View style={{ alignSelf: 'center', width: 34, height: 6, borderRadius: 3, backgroundColor: tokens.hair }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Avatar p={p} size={20} letter={name[0]?.toUpperCase()} />
        <Txt size={11} weight={600} numberOfLines={1} style={{ flex: 1 }}>{name}</Txt>
      </View>
      {show ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 5, borderRadius: 10, backgroundColor: tokens.bg }}>
          <Tile name={tried.icon} size={22} radius={7} />
          <View style={{ flex: 1 }}>
            <Txt size={9.5} weight={700} numberOfLines={1}>{tx('Zahnarzt', 'Dentist')}</Txt>
            <Txt size={8.5} color={tokens.sub} numberOfLines={1}>{`${short(tried.date)} · ${hm(tried.start)}`}</Txt>
          </View>
        </View>
      ) : <View style={{ height: 34 }} />}
      {[0.9, 0.7, 0.8].map((w, k) => <View key={k} style={{ height: 22, width: `${w * 100}%`, borderRadius: 7, backgroundColor: tokens.bg }} />)}
    </View>
  );
}
