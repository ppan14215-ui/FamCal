/**
 * Onboarding probe, step "Sag mir einen Termin" (Julian 04.11.2026): animation and the person's own
 * action in one step, after Duolingo, Gotcha and Finch (/onboarding/aktion-animation-2026-11-04.md).
 * Two variants side by side for testing: Memo with eyes only, or eyes plus body and a magnet.
 *
 * Rhythm (Duolingo): Memo, one line, the input. After sending the stage empties and the answer gets its
 * own moment. The object answers first (the sentence becomes a card that flies into the week), Memo
 * gives the meaning right after. Every frame of the answer is a function of one clock `t` (seconds),
 * see the famcal-film-motion skill. Storyboard of the answer:
 *   0.00  sentence leaves the field on an arc, title and examples exit (180 ms)
 *   0.30  Memo closes the eyes, 0.55 thinks (body: anticipation squash, tilt 6°, "?" pops once)
 *   1.30  the sentence becomes the card (scale from 0.92, content in 1.45 to 1.70)
 *   1.70  Memo glad (body: hop with a ceramic recoil)
 *   2.05  Memo looks toward the day (body: leans toward it)
 *   2.15  card flies on an arc into its day, 2.75 contact: day fills, haptic success
 *   2.80  body: Memo hops toward the day, a check magnet sticks to its side
 *   3.10  result line, 3.60 Weiter and Nochmal
 * Nothing is saved: the probe never writes to the store.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Pressable, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useAnimatedReaction, runOnJS, useReducedMotion, cancelAnimation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Seg, Btn, TextLink } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import { MemoFace, type EyeKey, type Eyes } from '../../src/components/onboarding/Memo';
import { tokens, persons } from '../../src/theme';
import { seg, mix, kf, eOut, eMove, crit, recoil, quad } from '../../src/theme/film';
import { parseWhen } from '../../src/lib/when';
import { iconFor } from '../../src/lib/iconWords';
import { TODAY, addDays, weekday, dayNum, WD_SHORT, short } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { toast } from '../../src/state/store';
import { tx } from '../../src/i18n/lang';

type Variant = 'augen' | 'koerper';
const DUR = 4.2;
const MEMO = 112;

const EXAMPLES = () => [tx('Freitag 15 Uhr Zahnarzt mit Ben', 'Friday 3pm dentist with Ben'), tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming')];

/** "15 Uhr", "15:30", "3pm" in a whole sentence. */
function timeOf(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(uhr|h)\b/i) || text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!m) return undefined;
  let h = +m[1];
  if (/pm/i.test(m[3]) && h < 12) h += 12;
  if (/am/i.test(m[3]) && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

/** The words that only say when: what is left is the title. */
function titleOf(text: string) {
  const t = text
    .replace(/\b(am|um|ab|von|bis|at|on|this|next|nächsten?|kommenden?)\b/gi, ' ')
    .replace(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen|heute|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/gi, ' ')
    .replace(/\b\d{1,2}([:.]\d{2})?\s*(uhr|am|pm|h)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const s = t || text.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Probe() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [variant, setVariant] = useState<Variant>('koerper');
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  const typing = useSharedValue(0);
  const body = variant === 'koerper';

  // Geometry of the stage (absolute, so every move is a transform).
  const top = insets.top + 64;
  const memoY = top + 30;
  const titleY = memoY + MEMO + 26;
  const cardY = titleY + 4;
  const cardW = Math.min(W - 48, 360);
  const cardH = 68;
  const cellW = Math.floor((Math.min(W - 32, 380) - 6 * 6) / 7);
  const weekX = (W - (cellW * 7 + 36)) / 2;
  const inputY = H - insets.bottom - 112;
  const weekY = inputY - 28 - cellW * 1.55;

  const result = useMemo(() => {
    if (!sent) return null;
    const w = parseWhen(sent);
    const date = w?.date ?? addDays(TODAY, 1);
    return { title: titleOf(sent), date, start: w?.start ?? timeOf(sent), icon: iconFor(sent) };
  }, [sent]);
  // The week shown is the one the new date lands in (before sending: this week).
  const monday = useMemo(() => { const d = result?.date ?? TODAY; return addDays(d, -((weekday(d) + 6) % 7)); }, [result]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const target = result ? Math.max(0, days.indexOf(result.date)) : 3;
  const targetX = weekX + target * (cellW + 6) + cellW / 2;
  const toward = targetX < W / 2 - 10 ? -1 : targetX > W / 2 + 10 ? 1 : 0;

  // Typing: eyes widen as soon as something is written (laufend: Memo follows the field).
  useEffect(() => {
    if (sent) return;
    cancelAnimation(typing);
    typing.value = withTiming(text ? 1 : 0, { duration: text ? 260 : 200, easing: Easing.linear });
  }, [!!text, sent]);
  // Body variant: every new letter nods Memo a little toward the field.
  const nod = useSharedValue(0);
  useEffect(() => {
    if (!body || sent || !text) return;
    nod.value = 1;
    nod.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [text]);

  const send = (s?: string) => {
    const v = (s ?? text).trim();
    if (!v || sent) return;
    haptics.commit();
    setSent(v);
    setText('');
    setDone(false);
    t.value = 0;
    if (reduced) { t.value = DUR; setDone(true); return; }
    t.value = withTiming(DUR, { duration: DUR * 1000, easing: Easing.linear });
  };
  const again = () => { haptics.select(); cancelAnimation(t); t.value = 0; setSent(null); setDone(false); };
  const skip = () => { if (sent && !done) { cancelAnimation(t); t.value = DUR; } };

  useAnimatedReaction(() => t.value >= 2.75, (now, was) => { if (now && !was) runOnJS(haptics.success)(); });
  useAnimatedReaction(() => t.value >= 3.55, (now, was) => { if (now && !was) runOnJS(setDone)(true); });

  // Eyes: ask phase on the typing clock, answer phase on t (initial = where the ask phase ended).
  const askKeys: EyeKey[] = [{ t: 0.15, e: 'wide' }];
  const look: Eyes = toward < 0 ? 'left' : toward > 0 ? 'right' : 'open';
  const runKeys: EyeKey[] = [
    { t: 0.3, e: 'closed' },
    { t: 0.55, e: 'think' },
    { t: 1.7, e: 'happy' },
    { t: 2.05, e: look },
    { t: 2.8, e: 'happy' },
  ];

  // Memo's body. Eyes variant: Memo never moves, only the eyes act.
  const memoSt = useAnimatedStyle((): any => {
    if (!body) return { transform: [] };
    const v = t.value;
    if (!sent) {
      const n = nod.value;
      return { transform: [{ translateY: typing.value * 3 + n * 2 }, { rotate: `${n * 2}deg` }, { scaleY: 1 - n * 0.02 }] };
    }
    // Anticipation before thinking, then the thinking tilt, held, released when glad.
    const ant = kf(v, [0.32, 0.42, 0.55], [0, 1, 0]);
    const tilt = 6 * crit(v - 0.55, 13) * (1 - crit(v - 1.6, 15));
    // Glad hop at 1.70: up 10 pt, land 1.95 with a ceramic recoil.
    const hop = -10 * Math.sin(Math.PI * seg(v, 1.7, 1.95));
    const land1 = recoil(v - 1.95, 0.08);
    // Lean toward the day while the card flies.
    const lean = crit(v - 2.05, 13) * (1 - crit(v - 3.0, 13));
    // Hop toward the day at contact.
    const hop2 = -8 * Math.sin(Math.PI * seg(v, 2.8, 3.02));
    const land2 = recoil(v - 3.02, 0.07);
    const sq = ant * 0.06 + Math.max(0, land1) + Math.max(0, land2);
    return {
      transform: [
        { translateX: toward * (8 * lean + 4 * seg(v, 2.8, 3.02) * (1 - seg(v, 3.1, 3.5))) },
        { translateY: hop + hop2 + sq * MEMO * 0.5 },
        { rotate: `${tilt + toward * 5 * lean}deg` },
        { scaleY: 1 - sq },
        { scaleX: 1 + sq * 0.9 },
      ],
    };
  }, [body, sent, toward]);

  // "?" magnet (body only): pops once at 0.65, stays, leaves at 1.35.
  const qSt = useAnimatedStyle((): any => {
    const v = t.value;
    const a = crit(v - 0.65, 20) * (1 - seg(v, 1.3, 1.42));
    return { opacity: body && sent ? a : 0, transform: [{ scale: 0.8 + 0.2 * a }, { translateY: -6 * a }] };
  }, [body, sent]);
  // Check magnet (body only): sticks to Memo's side at 2.85, stays.
  const okSt = useAnimatedStyle((): any => {
    const a = crit(t.value - 2.85, 20);
    return { opacity: body && sent ? a : 0, transform: [{ scale: 0.8 + 0.2 * a }, { rotate: `${(1 - a) * -12}deg` }] };
  }, [body, sent]);

  // Title, line and examples exit the moment the sentence leaves (the stage empties).
  const askSt = useAnimatedStyle((): any => ({ opacity: sent ? 1 - seg(t.value, 0, 0.18) : 1 }), [sent]);

  // The flying sentence chip: from the field up to the card's place, then it becomes the card.
  const chipSt = useAnimatedStyle((): any => {
    const v = t.value;
    const p = eOut(seg(v, 0, 0.45));
    const y = quad(inputY + 10, cardY - 30, cardY + 14, p);
    return { opacity: sent ? (v < 0.02 ? 0 : 1) * (1 - seg(v, 1.3, 1.42)) : 0, transform: [{ translateY: y }, { scale: mix(0.96, 1, p) }] };
  }, [sent, inputY, cardY]);

  // The card: appears at 1.30, then flies on an arc into its day (2.15 to 2.75) and shrinks into the cell.
  const cardSt = useAnimatedStyle((): any => {
    const v = t.value;
    const a = crit(v - 1.3, 20);
    const f = eMove(seg(v, 2.15, 2.75));
    const cx = mix(W / 2, targetX, f);
    const cy = quad(cardY + cardH / 2, cardY - 30, weekY + cellW * 0.78, f);
    const s = mix(0.92 + 0.08 * a, (cellW - 10) / cardW, f);
    return {
      opacity: (v < 1.3 ? 0 : Math.min(1, a * 1.6)) * (1 - seg(v, 2.68, 2.76)),
      transform: [{ translateX: cx - cardW / 2 }, { translateY: cy - cardH / 2 }, { scale: s }],
    };
  }, [targetX, cardY, weekY, cellW, cardW, W]);
  const cardIn = (from: number) => useAnimatedStyle((): any => {
    const p = eOut(seg(t.value, from, from + 0.25));
    return { opacity: p * (1 - seg(t.value, 2.45, 2.62)), transform: [{ translateY: (1 - p) * 6 }] };
  });
  const inIcon = cardIn(1.45);
  const inTitle = cardIn(1.52);
  const inWhen = cardIn(1.6);

  // Result line and buttons, last.
  const resSt = useAnimatedStyle((): any => { const p = eOut(seg(t.value, 3.1, 3.34)); return { opacity: sent ? p : 0, transform: [{ translateY: (1 - p) * 12 }] }; }, [sent]);
  const res2St = useAnimatedStyle((): any => { const p = eOut(seg(t.value, 3.22, 3.46)); return { opacity: sent ? p : 0, transform: [{ translateY: (1 - p) * 12 }] }; }, [sent]);

  const who = persons.J;
  const whenLabel = result ? `${short(result.date)}${result.start ? ` · ${result.start}` : ''}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Test bar: variant switch (not part of the real step). */}
      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 10, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 5 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={tx('Zurück', 'Back')}><LineIcon name="back" size={22} /></Pressable>
        <View style={{ flex: 1 }}>
          <Seg items={[{ key: 'augen', label: tx('Nur Augen', 'Eyes only') }, { key: 'koerper', label: tx('Augen + Körper', 'Eyes + body') }]} value={variant} onChange={(k) => { setVariant(k); again(); }} />
        </View>
      </View>

      {/* Memo */}
      <Animated.View style={[{ position: 'absolute', left: W / 2 - MEMO / 2, top: memoY, width: MEMO, height: MEMO }, memoSt]}>
        {sent
          ? <MemoFace key={`run-${variant}-${sent}`} size={MEMO} clock={t} keys={runKeys} initial="wide" />
          : <MemoFace key={`ask-${variant}`} size={MEMO} clock={typing} keys={askKeys} initial="open" />}
        <Animated.View style={[{ position: 'absolute', right: -14, top: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.hair }, qSt]}>
          <Txt size={18} weight={700} color={tokens.done}>?</Txt>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: toward < 0 ? -10 : undefined, right: toward < 0 ? undefined : -10, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }, okSt]}>
          <LineIcon name="check" size={16} color={tokens.onInk ?? '#fff'} />
        </Animated.View>
      </Animated.View>

      {/* Ask: one line, examples to tap */}
      <Animated.View pointerEvents={sent ? 'none' : 'auto'} style={[{ position: 'absolute', left: 24, right: 24, top: titleY, alignItems: 'center', gap: 6 }, askSt]}>
        <Txt size={26} weight={700} center>{tx('Sag mir einen Termin', 'Tell me a date')}</Txt>
        <Txt size={15} color={tokens.sub} center>{tx('Sprich oder tipp. Oder nimm einen von hier:', 'Speak or type. Or take one of these:')}</Txt>
        <View style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
          {EXAMPLES().map((ex) => (
            <Pressable key={ex} onPress={() => send(ex)} style={({ pressed }) => ({ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Txt size={14.5} weight={500}>„{ex}“</Txt>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* The week: the object that receives the card */}
      <View style={{ position: 'absolute', left: weekX, top: weekY, flexDirection: 'row', gap: 6 }}>
        {days.map((d, i) => <DayCell key={d} d={d} w={cellW} hit={!!result && i === target} t={t} icon={result?.icon} ink={who.ink} tint={who.tint} />)}
      </View>

      {/* The sentence, flying up */}
      {sent ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' }, chipSt]}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: tokens.ink, maxWidth: W - 64 }}>
            <Txt size={15} weight={500} color={tokens.onInk ?? '#fff'}>{sent}</Txt>
          </View>
        </Animated.View>
      ) : null}

      {/* The card */}
      {result ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: cardW, height: cardH, borderRadius: 18, backgroundColor: tokens.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, cardSt]}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: who.ink }} />
          <Animated.View style={inIcon}><ClayIcon name={result.icon} size={44} /></Animated.View>
          <View style={{ flex: 1, gap: 2 }}>
            <Animated.View style={inTitle}><Txt size={16} weight={600} numberOfLines={1}>{result.title}</Txt></Animated.View>
            <Animated.View style={inWhen}><Txt size={13.5} color={tokens.sub}>{whenLabel}</Txt></Animated.View>
          </View>
        </Animated.View>
      ) : null}

      {/* Result, then the buttons */}
      {sent ? (
        <View style={{ position: 'absolute', left: 24, right: 24, top: titleY + 10, alignItems: 'center', gap: 4 }} pointerEvents="none">
          <Animated.View style={resSt}><Txt size={20} weight={700} center>{tx('Steht drin.', 'It’s in.')}</Txt></Animated.View>
          <Animated.View style={res2St}><Txt size={15} color={tokens.sub} center>{tx('Tom sieht es auch, ohne dass du was schickst.', 'Tom sees it too, without you sending anything.')}</Txt></Animated.View>
        </View>
      ) : null}

      {/* Bottom: the field (ask) or Weiter (done). A tap anywhere during the answer plays it to its end. */}
      {sent && !done ? <Pressable onPress={skip} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessibilityLabel={tx('Überspringen', 'Skip')} /> : null}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16 }}>
        {!sent ? (
          <View style={{ borderRadius: 24, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={tx('Sprich oder schreib einfach …', 'Just speak or type …')}
              placeholderTextColor={tokens.mute}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              style={{ fontSize: 16, color: tokens.ink, minHeight: 24, paddingVertical: 0, fontFamily: undefined }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => toast(tx('Im Test bitte tippen oder ein Beispiel nehmen', 'In this test, please type or take an example'))} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={tx('Sprechen', 'Speak')}>
                <LineIcon name="mic" size={20} color={tokens.ink} />
              </Pressable>
              <Pressable onPress={() => send()} disabled={!text.trim()} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? tokens.ink : tokens.chipBg }} accessibilityLabel={tx('Senden', 'Send')}>
                <LineIcon name="send" size={17} color={text.trim() ? (tokens.onInk ?? '#fff') : tokens.mute} />
              </Pressable>
            </View>
          </View>
        ) : done ? (
          <Animated.View style={{ gap: 10, alignItems: 'center' }}>
            <Btn label={tx('Weiter', 'Continue')} onPress={() => { haptics.select(); router.back(); }} style={{ alignSelf: 'stretch' }} />
            <TextLink label={tx('Nochmal', 'Again')} onPress={again} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** One day of the week. The hit day fills with the person's colour at contact (2.75) and shows the icon. */
function DayCell({ d, w, hit, t, icon, ink, tint }: { d: string; w: number; hit: boolean; t: any; icon?: any; ink: string; tint: string }) {
  const today = d === TODAY;
  const fill = useAnimatedStyle((): any => {
    const a = hit ? crit(t.value - 2.74, 20) : 0;
    return { opacity: a, transform: [{ scale: 0.86 + 0.14 * a }] };
  }, [hit]);
  const pop = useAnimatedStyle((): any => {
    const v = t.value;
    const s = hit ? 1 + Math.max(0, recoil(v - 2.75, 0.06, 10, 22)) : 1;
    return { transform: [{ scale: s }] };
  }, [hit]);
  return (
    <Animated.View style={[{ width: w, height: w * 1.55, borderRadius: 14, backgroundColor: tokens.row, alignItems: 'center', paddingTop: 5, gap: 0, borderWidth: today ? 1.5 : 0, borderColor: tokens.ink }, pop]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: tint }, fill]} />
      <Txt size={11} weight={600} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
      <Txt size={16} weight={700}>{dayNum(d)}</Txt>
      {hit && icon ? <Animated.View style={fill}><ClayIcon name={icon} size={Math.min(20, w * 0.42)} /></Animated.View> : null}
    </Animated.View>
  );
}
