/**
 * The opening film (Julian 01.11.2026: "Das ist unsere Chance die Leute zu überzeugen", claim
 * "A digital assistant you both can speak to"). One continuous scene in four beats, no cuts:
 *
 *   0 fridge   A fridge door with paper notes. Memo is the magnet holding the dentist note.
 *   1 digital  The door shrinks into a phone; every note flattens into a card, Memo moves up.
 *   2 talk     Julia speaks, Memo thinks, a card lands. Tom speaks, the next one lands.
 *   3 claim    Julia and Tom on both sides, their voices reach Memo. The claim.
 *
 * It plays on its own; "Weiter" jumps to the next beat. Everything is transforms and opacity on
 * one shared progress value per beat, so it runs on the UI thread and ships by OTA.
 *
 * Motion rules are Namore's motion-design skill (Julian, "could come from Apple"): one subject per
 * moment, critically damped springs (no bounce unless the person threw something), the haptic on the
 * moment the benefit becomes true, no idle loops while text is read, light not particles, paper/ink/
 * teal only, everything enters upwards.
 *
 * Storyboard (ms from the start of each beat):
 *   beat 0     0  door and notes rest, Memo holds the dentist note           caption rises at 700
 *           3600  auto -> beat 1
 *   beat 1     0  door shrinks into the phone (T_MORPH, inOut), notes fly one by one (stagger 12 %)
 *           1150  last card is in place: haptic tap, Memo happy                 auto -> beat 2 at 3400
 *   beat 2   300  Julia's voice bubble rises, waveform plays, Memo looks
 *           1500  Memo thinks
 *           2300  card "Schwimmen" takes the top slot, others make room: haptic success, Memo happy
 *           3500  Tom's bubble, 4600 thinks, 5300 card "Brot": haptic success   auto -> beat 3 at 7200
 *   beat 3     0  phone fades back (T_CLAIM), Memo moves to centre and lands, Julia and Tom rise,
 *                 three voice arcs travel to Memo three times, then everything holds still.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, withDelay,
  interpolate, interpolateColor, Easing, useReducedMotion, FadeIn, FadeInUp, FadeOut, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import Txt from '../ui/Txt';
import { Tile } from '../ui/Clay';
import Memo, { type MemoAct } from './Memo';
import { tokens, persons } from '../../theme';
import { easing } from '../../theme/motion';
import { tx } from '../../i18n/lang';
import { haptics } from '../../lib/haptics';

export const INTRO_BEATS = 4;
const W = 300;
const H = 390;
const EASE = easing.inOut;
const OUT = easing.out;
// Critically damped: damping = 2 * sqrt(stiffness * mass). No overshoot (motion rule 2).
const CRIT = { stiffness: 170, damping: 26, mass: 1 };
const T_MORPH = 1600;
const T_CLAIM = 700;
// The film's couple. Fixed names: before sign-up we don't know yours, and "Ich"/"Partner" reads oddly.
const NAME = { J: 'Julia', T: 'Tom' } as const;

// Fridge door and phone, in stage coordinates.
const FR = { x: 30, y: 6, w: 240, h: 378, r: 28 };
const PH = { x: 50, y: 0, w: 200, h: 390, r: 42 };
// Card slots inside the phone, top to bottom.
const SLOT = (i: number) => ({ x: PH.x + 14, y: 92 + i * 56, w: PH.w - 28, h: 48 });

type Note = { id: string; text: () => string; sub: () => string; icon: any; paper: string; x: number; y: number; w: number; h: number; rot: number };
const NOTES: Note[] = [
  { id: 'zahn', text: () => tx('Zahnarzt', 'Dentist'), sub: () => tx('Fr 15 Uhr', 'Fri 3pm'), icon: 'zahnarzt', paper: '#FFF3D6', x: 62, y: 112, w: 112, h: 92, rot: -5 },
  { id: 'milch', text: () => tx('Milch!', 'Milk!'), sub: () => tx('und Brot', 'and bread'), icon: 'einkauf', paper: '#FBEFE0', x: 168, y: 150, w: 92, h: 84, rot: 6 },
  { id: 'eltern', text: () => tx('Elternabend', 'Parent night'), sub: () => tx('Di 19 Uhr', 'Tue 7pm'), icon: 'elternabend', paper: '#FFF8E8', x: 78, y: 246, w: 132, h: 76, rot: -2 },
];

export default function Intro({ beat }: { beat: number }) {
  const reduced = useReducedMotion();
  const morph = useSharedValue(beat >= 1 ? 1 : 0); // fridge -> phone
  const shift = useSharedValue(0); // cards pushed down by new ones
  const claim = useSharedValue(beat >= 3 ? 1 : 0);
  const sway = useSharedValue(0); // kept at rest: no idle loops while text is read
  const [memo, setMemo] = useState<MemoAct>('idle');
  const [memoBeat, setMemoBeat] = useState(0);
  const [talk, setTalk] = useState(0); // 0 none, 1 Julia speaks, 2 card 1, 3 Tom speaks, 4 card 2
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const at = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, reduced ? 0 : ms)); };
  const act = (a: MemoAct) => { setMemo(a); setMemoBeat((b) => b + 1); };

  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const d = reduced ? 0 : 1;
    if (beat === 0) {
      // Starts moving on the first frame (Julian 02.11.: "schneller starten"): the notes are pinned
      // one by one, then Memo lands on the dentist note and winks.
      morph.value = 0; shift.value = 0; claim.value = 0; setTalk(0); act('idle');
      at(700, () => { act('happy'); haptics.tap(); });
      at(1600, () => act('wink'));
    } else if (beat === 1) {
      setTalk(0); shift.value = 0; claim.value = 0;
      act('idle');
      // The caption is read first, then the door turns into the phone.
      at(250, () => { morph.value = withTiming(1, { duration: T_MORPH * d, easing: EASE }); act('look'); });
      at(250 + 1650, () => { haptics.tap(); act('happy'); });
    } else if (beat === 2) {
      morph.value = 1; claim.value = 0; shift.value = 0; act('idle');
      // Slow enough to read every bubble (Julian 02.11.: the old film was too fast).
      at(350, () => { setTalk(1); act('look'); });
      at(2200, () => act('think'));
      at(3000, () => { shift.value = withSpring(1, CRIT); setTalk(2); act('happy'); haptics.success(); });
      at(4300, () => { setTalk(3); act('look'); });
      at(6100, () => act('think'));
      at(6900, () => { shift.value = withSpring(2, CRIT); setTalk(4); act('happy'); haptics.success(); });
    } else {
      claim.value = withTiming(1, { duration: T_CLAIM * d, easing: EASE });
      act('land');
    }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [beat]);

  // Door -> phone frame.
  const frame = useAnimatedStyle((): any => {
    const m = morph.value;
    return {
      left: interpolate(m, [0, 1], [FR.x, PH.x]),
      top: interpolate(m, [0, 1], [FR.y, PH.y]),
      width: interpolate(m, [0, 1], [FR.w, PH.w]),
      height: interpolate(m, [0, 1], [FR.h, PH.h]),
      borderRadius: interpolate(m, [0, 1], [FR.r, PH.r]),
      borderWidth: interpolate(m, [0, 1], [1, 3]),
      borderColor: interpolateColor(m, [0, 1], [tokens.hair, tokens.ink]),
      opacity: 1 - claim.value,
      transform: [{ scale: 1 - claim.value * 0.12 }],
    };
  });
  const doorBits = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, morph.value * 2.2) }));
  const phoneBits = useAnimatedStyle(() => ({ opacity: Math.max(0, morph.value * 2 - 1) * (1 - claim.value) }));

  // Memo: magnet on the dentist note, then the assistant at the top of the phone, then centre stage.
  const n0 = NOTES[0];
  const memoBox = useAnimatedStyle((): any => {
    const m = morph.value; const c = claim.value;
    const size = interpolate(m, [0, 1], [70, 54]);
    const x = interpolate(m, [0, 1], [n0.x + n0.w / 2 - 35, PH.x + PH.w / 2 - 27]);
    const y = interpolate(m, [0, 1], [n0.y - 40, 26]);
    return {
      transform: [
        { translateX: interpolate(c, [0, 1], [x, W / 2 - 35]) },
        { translateY: interpolate(c, [0, 1], [y, 160]) },
        { scale: interpolate(c, [0, 1], [size / 70, 120 / 70]) },
        { rotate: `${(1 - m) * (n0.rot + sway.value * 1.5)}deg` },
      ],
    };
  });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', backgroundColor: tokens.row, overflow: 'hidden' }, frame]}>
        {/* Fridge: a door gap and a handle. */}
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, doorBits]}>
          {/* Soft top light on enamel, falling off towards the floor (light, not particles). */}
          <Svg width={FR.w} height={FR.h} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="enamel" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="1" stopColor="#ECEAE5" />
              </LinearGradient>
              <RadialGradient id="toplight" cx="0.35" cy="0.08" r="0.7">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={FR.w} height={FR.h} fill="url(#enamel)" />
            <Rect width={FR.w} height={FR.h} fill="url(#toplight)" />
          </Svg>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 96, height: 1.5, backgroundColor: tokens.hair }} />
          <View style={{ position: 'absolute', left: 16, top: 30, width: 7, height: 50, borderRadius: 4, backgroundColor: tokens.hair }} />
          <View style={{ position: 'absolute', left: 16, top: 120, width: 7, height: 96, borderRadius: 4, backgroundColor: tokens.hair }} />
        </Animated.View>
        {/* Phone: the notch and a tiny header. */}
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center' }, phoneBits]}>
          <View style={{ marginTop: 10, width: 64, height: 7, borderRadius: 4, backgroundColor: tokens.hair }} />
        </Animated.View>
      </Animated.View>

      {/* New cards from the talk beat land in the top slot. */}
      {talk >= 4 && beat < 3 ? <NewCard key="c2" title={tx('Brot', 'Bread')} sub={`${tx('Einkaufsliste', 'Shopping list')} · ${NAME.T}`} icon="einkauf" who="T" /> : null}
      {talk >= 2 && beat < 3 ? <NewCard key="c1" title={tx('Schwimmen', 'Swimming')} sub={`${tx('Sa 10:00', 'Sat 10am')} · ${NAME.J}`} icon="schwimmen" who="J" offset={talk >= 4 ? 1 : 0} /> : null}

      {NOTES.map((n, i) => (
        // Each note is pinned up on the first frames, one after the other, entering upwards.
        <Animated.View key={n.id} entering={beat === 0 && !reduced ? FadeInUp.duration(360).delay(i * 110).easing(OUT as any) : undefined} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} pointerEvents="none">
          <NoteCard n={n} i={i} morph={morph} shift={shift} sway={sway} claim={claim} />
        </Animated.View>
      ))}

      {talk === 1 || talk === 3 ? <Speech key={talk} who={talk === 1 ? 'J' : 'T'} text={talk === 1 ? tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming') : tx('Brot noch auf die Liste', 'Add bread to the list')} /> : null}

      {beat >= 3 ? <Claim /> : null}

      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 70, height: 70 }, memoBox]}>
        {/* Memo comes in last on the first frames, upwards, like the notes (never drops in over the caption). */}
        <Animated.View entering={beat === 0 && !reduced ? FadeInUp.duration(360).delay(360).easing(OUT as any) : undefined}>
          <Memo act={memo} beat={memoBeat} size={70} shadow={false} alive={beat !== 2} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** A paper note on the fridge that flattens into a card in the phone. */
function NoteCard({ n, i, morph, shift, sway, claim }: { n: Note; i: number; morph: SharedValue<number>; shift: SharedValue<number>; sway: SharedValue<number>; claim: SharedValue<number> }) {
  const s = SLOT(i);
  const box = useAnimatedStyle((): any => {
    // Staggered: each note starts a little later, so they fly in one by one.
    const m = interpolate(morph.value, [i * 0.12, 0.64 + i * 0.12], [0, 1], 'clamp');
    const lift = Math.sin(m * Math.PI) * -18;
    return {
      left: interpolate(m, [0, 1], [n.x, s.x]),
      top: interpolate(m, [0, 1], [n.y, s.y + shift.value * 56]) + lift,
      width: interpolate(m, [0, 1], [n.w, s.w]),
      height: interpolate(m, [0, 1], [n.h, s.h]),
      borderRadius: interpolate(m, [0, 1], [3, 14]),
      backgroundColor: interpolateColor(m, [0, 1], [n.paper, tokens.bg]),
      opacity: (shift.value + i > 3.4 ? Math.max(0, 1 - (shift.value + i - 3.4) * 3) : 1) * (1 - claim.value),
      transform: [{ rotate: `${(1 - m) * (n.rot + sway.value * (i === 1 ? -1.2 : 0.9))}deg` }],
    };
  });
  const paper = useAnimatedStyle(() => ({ opacity: 1 - interpolate(morph.value, [i * 0.12, 0.4 + i * 0.12], [0, 1], 'clamp') }));
  const card = useAnimatedStyle(() => ({ opacity: interpolate(morph.value, [0.4 + i * 0.12, 0.64 + i * 0.12], [0, 1], 'clamp') }));
  return (
    <Animated.View style={[{ position: 'absolute', overflow: 'hidden', shadowColor: '#16232A', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, borderWidth: 1, borderColor: 'rgba(22,35,42,0.06)' }, box]}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 12, gap: 2 }, paper]}>
        {i ? <View style={{ position: 'absolute', top: -4, alignSelf: 'center', left: n.w / 2 - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: tokens.done }} /> : null}
        <Txt size={16} weight={700} color="#3A3324" style={{ marginTop: 10 }} numberOfLines={1}>{n.text()}</Txt>
        <Txt size={14} color="#6B6150">{n.sub()}</Txt>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 }, card]}>
        <Tile name={n.icon} size={32} radius={10} />
        <View style={{ flex: 1 }}>
          <Txt size={13} line={16} weight={700} numberOfLines={1}>{n.text()}</Txt>
          <Txt size={11} line={14} color={tokens.sub} numberOfLines={1}>{n.sub()}</Txt>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** A card the assistant just made: pops into the top slot with the speaker's colour. */
function NewCard({ title, sub, icon, who, offset = 0 }: { title: string; sub: string; icon: any; who: 'J' | 'T'; offset?: number }) {
  const s = SLOT(0);
  const y = useSharedValue(s.y);
  useEffect(() => { y.value = withSpring(s.y + offset * 56, CRIT); }, [offset]);
  const st = useAnimatedStyle(() => ({ top: y.value }));
  const p = persons[who];
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 260); return () => clearTimeout(t); }, []);
  return (
    <Animated.View entering={FadeInUp.duration(320).easing(OUT as any)} exiting={FadeOut.duration(300)} style={[{ position: 'absolute', left: s.x, width: s.w, height: s.h, borderRadius: 14, backgroundColor: tokens.row, borderLeftWidth: 4, borderLeftColor: p.ink, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: tokens.hair }, st]}>
      <Tile name={icon} size={32} radius={10} celebrate={lit} />
      <View style={{ flex: 1 }}>
        <Txt size={13} line={16} weight={700} numberOfLines={1}>{title}</Txt>
        <Txt size={11} line={14} color={p.ink} numberOfLines={1}>{sub}</Txt>
      </View>
      <Txt size={12} weight={700} color={tokens.done}>✓</Txt>
    </Animated.View>
  );
}

/** Someone speaking: avatar, a live waveform and what they say. */
function Speech({ who, text }: { who: 'J' | 'T'; text: string }) {
  const p = persons[who];
  const left = who === 'J';
  return (
    <Animated.View entering={FadeInUp.duration(280).easing(OUT as any)} exiting={FadeOut.duration(180)}
      style={{ position: 'absolute', bottom: 22, left: left ? 0 : undefined, right: left ? undefined : 0, maxWidth: 270, flexDirection: left ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 6 }}>
      <Avatar who={who} size={42} />
      <View style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, borderBottomLeftRadius: left ? 6 : 18, borderBottomRightRadius: left ? 18 : 6, backgroundColor: tokens.ink, gap: 5, shadowColor: '#16232A', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
        <Wave color={p.tint} />
        <Txt size={13.5} line={18} color={tokens.onInk}>{text}</Txt>
      </View>
    </Animated.View>
  );
}

function Avatar({ who, size }: { who: 'J' | 'T'; size: number }) {
  const p = persons[who];
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: p.tint, borderWidth: 2, borderColor: tokens.row, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.42} weight={700} color={p.ink}>{NAME[who][0]}</Txt>
    </View>
  );
}

function Wave({ color, bars = 14 }: { color: string; bars?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 14 }}>
      {Array.from({ length: bars }).map((_, i) => <Bar key={i} i={i} color={color} />)}
    </View>
  );
}
function Bar({ i, color }: { i: number; color: string }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(i * 45, withRepeat(withSequence(withTiming(0.35 + ((i * 37) % 60) / 100, { duration: 220 + (i % 4) * 40 }), withTiming(0.2, { duration: 240 })), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[{ width: 3, height: 14, borderRadius: 2, backgroundColor: color }, st]} />;
}

/** Beat 3: both of you, your voices reach Memo. */
function Claim() {
  return (
    <Animated.View entering={FadeIn.duration(500).delay(200)} style={{ position: 'absolute', left: 0, right: 0, top: 70, height: 260 }}>
      <Svg width={140} height={30} style={{ position: 'absolute', left: W / 2 - 70, top: 172 }}>
        <Defs>
          <RadialGradient id="contact" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#16232A" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#16232A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={70} cy={15} rx={64} ry={12} fill="url(#contact)" />
      </Svg>
      <Animated.View entering={FadeInUp.duration(420).easing(OUT as any).delay(350)} style={{ position: 'absolute', left: 4, top: 96, alignItems: 'center', gap: 6 }}>
        <Avatar who="J" size={58} />
        <Txt size={12} weight={600} color={tokens.sub}>{NAME.J}</Txt>
      </Animated.View>
      <Animated.View entering={FadeInUp.duration(420).easing(OUT as any).delay(470)} style={{ position: 'absolute', right: 4, top: 96, alignItems: 'center', gap: 6 }}>
        <Avatar who="T" size={58} />
        <Txt size={12} weight={600} color={tokens.sub}>{NAME.T}</Txt>
      </Animated.View>
      <Waves left />
      <Waves />
    </Animated.View>
  );
}

/** Three arcs travelling from a person towards Memo, again and again. */
function Waves({ left }: { left?: boolean }) {
  return (
    <View style={{ position: 'absolute', top: 105, left: left ? 62 : undefined, right: left ? undefined : 62, width: 40, height: 40 }}>
      {[0, 1, 2].map((k) => <Arc key={k} k={k} left={left} />)}
    </View>
  );
}
function Arc({ k, left }: { k: number; left?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(900 + k * 380, withRepeat(withTiming(1, { duration: 1140, easing: Easing.out(Easing.quad) }), 3)); }, []);
  const st = useAnimatedStyle((): any => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - t.value,
    transform: [{ translateX: (left ? 1 : -1) * t.value * 26 }, { scale: 0.6 + t.value * 0.5 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', top: 4, left: 8, width: 24, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent', [left ? 'borderRightColor' : 'borderLeftColor']: tokens.done }, st]} />
  );
}

export function introCopy(beat: number) {
  return [
    { title: tx('Hallo, ich bin Memo', 'Hi, I’m Memo'), lead: tx('Bisher hing ich an eurem Kühlschrank und hielt eure Zettel fest.', 'Until now I hung on your fridge, holding on to your notes.') },
    { title: tx('Jetzt bin ich in eurem Handy', 'Now I live in your phone'), lead: tx('Aus jedem Zettel wird eine Karte. Bei euch beiden, immer dabei.', 'Every note becomes a card. On both your phones, always with you.') },
    { title: tx('Ihr sagt es einfach', 'You just say it'), lead: tx('Julia sagt einen Termin, Tom was fehlt. Ich trage beides ein.', 'Julia says a date, Tom what’s missing. I add both.') },
    { title: tx('Ein digitaler Assistent, mit dem ihr beide sprechen könnt', 'A digital assistant you both can speak to'), lead: tx('Gleich zeige ich euch, wie das im Alltag aussieht.', 'Next, I’ll show you how it works day to day.') },
  ][beat];
}
