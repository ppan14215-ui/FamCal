/**
 * Onboarding as one flow (Julian 04.11.2026 23:41 CET): no film followed by separate steps. Memo
 * introduces itself, asks who you are, then says what it can do and you try it right away: say an
 * appointment, move it, fill the shopping list. The animation is the answer to what you do, like the
 * mascot apps (Gotcha, Finch, Duolingo; /onboarding/aktion-animation-2026-11-04.md).
 *
 * Grid on every step: progress on top, Memo on the stage, Memo's line as a speech bubble under it
 * (text only, Memo has no voice), the object that receives the result (week or list) above the field,
 * the field or the button at the bottom.
 *
 * The answer to an input runs on one clock `t` (seconds, famcal-film-motion skill):
 *   0.00  the sentence leaves the field on an arc, the bubble exits (the stage empties)
 *   0.30  Memo closes its eyes, 0.55 thinks: anticipation squash, tilt 6°, "?" pops once
 *   1.30  the object answers first (card appears / entry lifts / sentence splits into items)
 *   1.70  Memo glad, small hop with a ceramic recoil
 *   2.05  Memo looks toward where the result goes and leans
 *   2.15  the result travels on an arc, 2.75 contact, haptic success
 *   2.80  Memo hops toward it, a check magnet sticks to its side
 *   3.10  Memo's answer in the bubble, 3.60 Weiter
 * Prototype: nothing here writes to the store.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, Pressable, useWindowDimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useAnimatedReaction, runOnJS, useReducedMotion, cancelAnimation, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Btn } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import { MemoFace, type EyeKey, type Eyes } from '../../src/components/onboarding/Memo';
import { tokens, personPalette } from '../../src/theme';
import { build } from '../../src/theme/motion';
import { seg, mix, kf, eOut, eIn, eMove, crit, recoil, quad } from '../../src/theme/film';
import { parseWhen } from '../../src/lib/when';
import { iconFor } from '../../src/lib/iconWords';
import { TODAY, addDays, weekday, dayNum, WD_SHORT, WD_LONG, short } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { toast } from '../../src/state/store';
import { tx } from '../../src/i18n/lang';

type Step = 'hallo' | 'namen' | 'termin' | 'verschieben' | 'einkauf' | 'fertig';
const STEPS: Step[] = ['hallo', 'namen', 'termin', 'verschieben', 'einkauf', 'fertig'];
type Act = 'land' | 'name' | 'answer' | 'idle' | 'fertig';
const DUR = 4.2;
const MEMO = 104;
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const ME = personPalette[0];
const YOU = personPalette[1];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function timeOf(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(uhr|h)\b/i) || text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!m) return undefined;
  let h = +m[1];
  if (/pm/i.test(m[3]) && h < 12) h += 12;
  if (/am/i.test(m[3]) && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}
function titleOf(text: string) {
  const t = text
    .replace(/\b(am|um|ab|von|bis|at|on|this|next|nächsten?|kommenden?)\b/gi, ' ')
    .replace(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen|heute|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/gi, ' ')
    .replace(/\b\d{1,2}([:.]\d{2})?\s*(uhr|am|pm|h)?\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  return cap(t || text.trim());
}
function itemsOf(text: string) {
  const t = text
    .replace(/^(wir brauchen|brauchen|bitte|kauf(e)?|noch|we need|need|buy|add)\s+/i, '')
    .replace(/\s+(auf die liste|noch|bitte|to the list)\s*$/i, '');
  return t.split(/,|\s+und\s+|\s+and\s+|\s*&\s*/i).map((s) => cap(s.trim())).filter(Boolean).slice(0, 4);
}

export default function Flow() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>('hallo');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [act, setAct] = useState<{ kind: Act; n: number }>({ kind: 'land', n: 0 });
  const t = useSharedValue(0); // clock of the current act (seconds)
  const typing = useSharedValue(0);
  const nod = useSharedValue(0);
  const si = STEPS.indexOf(step);
  const A = nameA.trim() || tx('du', 'you');
  const B = nameB.trim();

  // Geometry: absolute positions, every move is a transform.
  const top = insets.top + 56;
  const memoY = top + 20;
  const bubbleY = memoY + MEMO + 18;
  const cardW = Math.min(W - 48, 360);
  const cardH = 68;
  const cardY = bubbleY + 8;
  const cellW = Math.floor((Math.min(W - 32, 380) - 6 * 6) / 7);
  const cellH = cellW * 1.55;
  const weekX = (W - (cellW * 7 + 36)) / 2;
  const inputY = H - insets.bottom - 112;
  const objY = inputY - 28 - cellH;
  const listH = 190;
  const listY = inputY - 24 - listH;
  const listW = Math.min(W - 48, 360);

  // What the person has done so far (the appointment carries over from "termin" to "verschieben").
  const [ev, setEv] = useState<{ title: string; date: string; start?: string; icon: any } | null>(null);
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const monday = useMemo(() => { const d = ev?.date ?? TODAY; return addDays(d, -((weekday(d) + 6) % 7)); }, [ev?.date]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const dayX = (d: string | null | undefined) => weekX + Math.max(0, days.indexOf(d ?? '')) * (cellW + 6) + cellW / 2;

  // Where the result of the current answer goes, seen from Memo: left, right or straight down.
  const goal = step === 'termin' ? dayX(ev?.date) : step === 'verschieben' ? dayX(moveTo) : W / 2;
  const toward = step === 'einkauf' ? 0 : goal < W / 2 - 10 ? -1 : goal > W / 2 + 10 ? 1 : 0;

  const play = (kind: Act, dur = DUR) => {
    cancelAnimation(t);
    t.value = 0;
    setAct((a) => ({ kind, n: a.n + 1 }));
    if (reduced) { t.value = dur; return; }
    t.value = withTiming(dur, { duration: dur * 1000, easing: Easing.linear });
  };
  useEffect(() => { play('land', 3.2); }, []);

  // Typing: eyes widen; every new letter nods Memo toward the field.
  useEffect(() => { if (!sent) typing.value = withTiming(text ? 1 : 0, { duration: text ? 260 : 200, easing: Easing.linear }); }, [!!text, sent]);
  useEffect(() => { if (sent || !text) return; nod.value = 1; nod.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }); }, [text]);

  // A new name: Memo hops once, glad.
  const [magA, setMagA] = useState(false);
  const [magB, setMagB] = useState(false);
  useEffect(() => { const on = !!nameA.trim(); if (on !== magA) { setMagA(on); if (on) { haptics.tap(); play('name', 1.2); } } }, [nameA]);
  useEffect(() => { const on = !!nameB.trim(); if (on !== magB) { setMagB(on); if (on) { haptics.tap(); play('name', 1.2); } } }, [nameB]);

  const go = (s: Step) => {
    haptics.select();
    cancelAnimation(t);
    setSent(null); setDone(false); setText('');
    typing.value = 0;
    setStep(s);
    if (s === 'fertig') play('fertig', 2.4); else { t.value = 0; setAct((a) => ({ kind: 'idle', n: a.n + 1 })); }
  };

  const send = (s?: string) => {
    const v = (s ?? text).trim();
    if (!v || sent) return;
    haptics.commit();
    if (step === 'termin') {
      const w = parseWhen(v);
      setEv({ title: titleOf(v), date: w?.date ?? addDays(TODAY, 1), start: w?.start ?? timeOf(v), icon: iconFor(v) });
    } else if (step === 'verschieben' && ev) {
      const w = parseWhen(v);
      const to = w?.date && days.includes(w.date) && w.date !== ev.date ? w.date : days[Math.min(6, days.indexOf(ev.date) + 1)];
      setMoveTo(to);
    } else if (step === 'einkauf') {
      setItems(itemsOf(v));
    }
    setSent(v);
    setText('');
    setDone(false);
    play('answer');
  };
  const skip = () => { if (sent && !done) { cancelAnimation(t); t.value = DUR; } };
  useAnimatedReaction(() => t.value >= 2.75, (now, was) => { if (now && !was && sent) runOnJS(haptics.success)(); }, [sent]);
  useAnimatedReaction(() => t.value >= 3.55, (now, was) => { if (now && !was && sent) runOnJS(setDone)(true); }, [sent]);
  // After the move, the appointment lives on its new day.
  useEffect(() => { if (done && step === 'verschieben' && ev && moveTo && ev.date !== moveTo) { /* shown via moveTo */ } }, [done]);

  // Memo's eyes per act.
  const look: Eyes = toward < 0 ? 'left' : toward > 0 ? 'right' : 'open';
  const keys: Record<Act, EyeKey[]> = {
    land: [{ t: 0.75, e: 'happy' }, { t: 1.6, e: 'open' }, { t: 2.2, e: 'wink', direct: true }, { t: 2.75, e: 'open', direct: true }],
    name: [{ t: 0.05, e: 'happy' }, { t: 0.9, e: 'open' }],
    answer: [{ t: 0.3, e: 'closed' }, { t: 0.55, e: 'think' }, { t: 1.7, e: 'happy' }, { t: 2.05, e: look }, { t: 2.8, e: 'happy' }],
    idle: [],
    fertig: [{ t: 0.1, e: 'happy' }, { t: 1.2, e: 'wink', direct: true }, { t: 1.75, e: 'happy', direct: true }],
  };
  const answering = act.kind === 'answer';

  const memoSt = useAnimatedStyle((): any => {
    const v = t.value;
    const k = act.kind;
    if (k === 'land') {
      // Pulled in like a magnet: travels down, the last 30 % accelerates, contact squash and one rebound.
      const p = seg(v, 0.1, 0.7);
      const y = p < 0.7 ? mix(-220, -40, eOut(p / 0.7)) : mix(-40, 0, eIn((p - 0.7) / 0.3));
      const sq = Math.max(0, recoil(v - 0.7, 0.09));
      return { opacity: seg(v, 0.1, 0.3), transform: [{ translateY: y + sq * MEMO * 0.5 }, { scaleY: 1 - sq }, { scaleX: 1 + sq * 0.9 }] };
    }
    if (k === 'name' || k === 'fertig') {
      const hop = -9 * Math.sin(Math.PI * seg(v, 0.02, 0.27));
      const sq = Math.max(0, recoil(v - 0.27, 0.07));
      return { opacity: 1, transform: [{ translateY: hop + sq * MEMO * 0.5 }, { scaleY: 1 - sq }, { scaleX: 1 + sq * 0.9 }] };
    }
    if (k === 'answer') {
      const ant = kf(v, [0.32, 0.42, 0.55], [0, 1, 0]);
      const tilt = 6 * crit(v - 0.55, 13) * (1 - crit(v - 1.6, 15));
      const hop = -10 * Math.sin(Math.PI * seg(v, 1.7, 1.95));
      const land1 = recoil(v - 1.95, 0.08);
      const lean = crit(v - 2.05, 13) * (1 - crit(v - 3.0, 13));
      const hop2 = -8 * Math.sin(Math.PI * seg(v, 2.8, 3.02));
      const land2 = recoil(v - 3.02, 0.07);
      const sq = ant * 0.06 + Math.max(0, land1) + Math.max(0, land2);
      return {
        opacity: 1,
        transform: [
          { translateX: toward * (8 * lean + 4 * seg(v, 2.8, 3.02) * (1 - seg(v, 3.1, 3.5))) },
          { translateY: hop + hop2 + sq * MEMO * 0.5 + (toward === 0 ? 4 * lean : 0) },
          { rotate: `${tilt + toward * 5 * lean}deg` },
          { scaleY: 1 - sq },
          { scaleX: 1 + sq * 0.9 },
        ],
      };
    }
    const n = nod.value;
    return { opacity: 1, transform: [{ translateY: typing.value * 3 + n * 2 }, { rotate: `${n * 2}deg` }, { scaleY: 1 - n * 0.02 }] };
  }, [act, toward]);
  const qSt = useAnimatedStyle((): any => { const a = answering ? crit(t.value - 0.65, 20) * (1 - seg(t.value, 1.3, 1.42)) : 0; return { opacity: a, transform: [{ scale: 0.8 + 0.2 * a }, { translateY: -6 * a }] }; }, [answering]);
  const okSt = useAnimatedStyle((): any => { const a = answering ? crit(t.value - 2.85, 20) : 0; return { opacity: a, transform: [{ scale: 0.8 + 0.2 * a }, { rotate: `${(1 - a) * -12}deg` }] }; }, [answering]);
  const flyStart = inputY + 10;
  const chipSt = useAnimatedStyle((): any => {
    const v = t.value;
    const p = eOut(seg(v, 0, 0.45));
    return { opacity: sent ? (v < 0.02 ? 0 : 1) * (1 - seg(v, 1.3, 1.42)) : 0, transform: [{ translateY: quad(flyStart, cardY - 30, cardY + 14, p) }, { scale: mix(0.96, 1, p) }] };
  }, [sent, flyStart, cardY]);

  // Memo's line for this step (null while it is busy answering).
  const line: string | null = (() => {
    if (sent && !done) return null;
    switch (step) {
      case 'hallo': return tx('Hallo, ich bin Memo. Euer Kalender, mit dem ihr einfach sprecht.', 'Hi, I’m Memo. Your calendar you simply talk to.');
      case 'namen': return magA ? (magB ? tx(`Schön, ${A} und ${B}!`, `Nice to meet you, ${A} and ${B}!`) : tx(`Hallo ${A}! Und wer noch?`, `Hi ${A}! And who else?`)) : tx('Wer seid ihr?', 'Who are you?');
      case 'termin': return sent ? tx(`Steht drin. ${B ? `${B} sieht es auch.` : 'Alle in der Familie sehen es.'}`, `It’s in. ${B ? `${B} sees it too.` : 'Your whole family sees it.'}`) : tx(`Sag mir einen Termin, ${A}. Sprich oder schreib.`, `Tell me a date, ${A}. Speak or type.`);
      case 'verschieben': return sent ? tx(`Verschoben auf ${moveTo ? WD_LONG[weekday(moveTo)] : ''}.`, `Moved to ${moveTo ? WD_LONG[weekday(moveTo)] : ''}.`) : tx('Etwas ändert sich? Sag es einfach.', 'Plans changed? Just say so.');
      case 'einkauf': return sent ? tx('Steht auf der Einkaufsliste.', 'It’s on the shopping list.') : tx('Ich schreibe auch eure Einkaufsliste.', 'I also keep your shopping list.');
      case 'fertig': return tx('Das war’s schon. Jetzt seid ihr dran.', 'That’s it. Your turn.');
    }
  })();
  const examples: Record<string, string[]> = {
    termin: [tx('Freitag 15 Uhr Zahnarzt', 'Friday 3pm dentist'), tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming')],
    verschieben: [tx('Verschieb das auf Samstag', 'Move it to Saturday'), tx('Lieber einen Tag später', 'Make it a day later')],
    einkauf: [tx('Wir brauchen Milch und Brot', 'We need milk and bread'), tx('Eier, Äpfel und Kaffee', 'Eggs, apples and coffee')],
  };
  const inputStep = step === 'termin' || step === 'verschieben' || step === 'einkauf';
  const next: Record<Step, Step> = { hallo: 'namen', namen: 'termin', termin: 'verschieben', verschieben: 'einkauf', einkauf: 'fertig', fertig: 'fertig' };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Progress, promised length (Me+, Duolingo) */}
      <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 14, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 5 }}>
        <Pressable onPress={() => (si > 0 ? go(STEPS[si - 1]) : router.back())} hitSlop={12} accessibilityLabel={tx('Zurück', 'Back')}><LineIcon name="back" size={22} /></Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= si ? tokens.done : tokens.hair }} />)}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt size={14} weight={600} color={tokens.sub}>{tx('Später', 'Later')}</Txt></Pressable>
      </View>

      {/* Name magnets around Memo */}
      {step === 'namen' || step === 'fertig' ? (
        <>
          {magA ? <Magnet key="a" x={W / 2 - MEMO / 2 - 46} y={memoY + MEMO * 0.42} letter={A[0]} c={ME} /> : null}
          {magB ? <Magnet key="b" x={W / 2 + MEMO / 2 + 6} y={memoY + MEMO * 0.42} letter={B[0]} c={YOU} /> : null}
        </>
      ) : null}

      {/* Memo */}
      <Animated.View style={[{ position: 'absolute', left: W / 2 - MEMO / 2, top: memoY, width: MEMO, height: MEMO }, memoSt]}>
        <MemoFace key={`${act.kind}-${act.n}`} size={MEMO} clock={act.kind === 'idle' ? typing : t} keys={act.kind === 'idle' ? [{ t: 0.15, e: 'wide' }] : keys[act.kind]} initial={act.kind === 'answer' ? 'wide' : 'open'} />
        <Animated.View style={[{ position: 'absolute', right: -14, top: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.hair }, qSt]}>
          <Txt size={18} weight={700} color={tokens.done}>?</Txt>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: toward < 0 ? -10 : undefined, right: toward < 0 ? undefined : -10, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }, okSt]}>
          <LineIcon name="check" size={16} color={tokens.onInk} />
        </Animated.View>
      </Animated.View>

      {/* Memo's line as a speech bubble (Duolingo rhythm: Memo, line, then your turn) */}
      {line ? (
        <Animated.View key={`${step}-${line}`} entering={build} style={{ position: 'absolute', left: 24, right: 24, top: bubbleY, alignItems: 'center' }} pointerEvents="none">
          <View style={{ width: 14, height: 14, backgroundColor: tokens.row, transform: [{ rotate: '45deg' }], marginBottom: -7, borderLeftWidth: 1, borderTopWidth: 1, borderColor: tokens.hair }} />
          <View style={{ backgroundColor: tokens.row, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: tokens.hair, maxWidth: 340 }}>
            <Txt size={19} weight={600} line={25} center>{line}</Txt>
          </View>
        </Animated.View>
      ) : null}

      {/* Names */}
      {step === 'namen' ? (
        <Animated.View entering={build} style={{ position: 'absolute', left: 24, right: 24, top: bubbleY + 110, gap: 10 }}>
          <NameField value={nameA} onChange={setNameA} placeholder={tx('Dein Name', 'Your name')} c={ME} />
          <NameField value={nameB} onChange={setNameB} placeholder={tx('Und wer noch? (Partner)', 'Who else? (partner)')} c={YOU} />
          <Txt size={13.5} color={tokens.mute} center>{tx('Kinder und Großeltern kommen später dazu.', 'Kids and grandparents can join later.')}</Txt>
        </Animated.View>
      ) : null}

      {/* Examples under the bubble, before you try */}
      {inputStep && !sent ? (
        <Animated.View key={`ex-${step}`} entering={build} style={{ position: 'absolute', left: 24, right: 24, top: bubbleY + 92, alignItems: 'center', gap: 8 }}>
          <Txt size={13} color={tokens.mute}>{tx('Oder nimm eins davon:', 'Or take one of these:')}</Txt>
          {examples[step].map((ex) => (
            <Pressable key={ex} onPress={() => send(ex)} style={({ pressed }) => ({ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Txt size={14.5} weight={500}>„{ex}“</Txt>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      {/* The object that receives the result */}
      {step === 'termin' || step === 'verschieben' ? (
        <View style={{ position: 'absolute', left: weekX, top: objY, flexDirection: 'row', gap: 6 }}>
          {days.map((d) => (
            <DayCell key={d} d={d} w={cellW} h={cellH} t={t} icon={ev?.icon}
              has={step === 'verschieben' ? (d === ev?.date ? 'leaving' : d === moveTo && sent ? 'arriving' : 'none') : sent && d === ev?.date ? 'arriving' : 'none'} />
          ))}
        </View>
      ) : null}
      {step === 'einkauf' ? (
        <View style={{ position: 'absolute', left: (W - listW) / 2, top: listY, width: listW, height: listH, borderRadius: 20, backgroundColor: tokens.row, padding: 14, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ClayIcon name="einkauf" size={28} />
            <Txt size={16} weight={700}>{tx('Einkauf', 'Shopping')}</Txt>
          </View>
          {!sent ? <Txt size={14} color={tokens.mute}>{tx('Noch leer', 'Still empty')}</Txt> : items.map((it, i) => <ListItem key={it + i} label={it} i={i} t={t} />)}
        </View>
      ) : null}

      {/* The sentence, flying up from the field */}
      {sent ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' }, chipSt]}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: tokens.ink, maxWidth: W - 64 }}>
            <Txt size={15} weight={500} color={tokens.onInk}>{sent}</Txt>
          </View>
        </Animated.View>
      ) : null}

      {/* Termin: the card forms from the sentence and flies into its day */}
      {step === 'termin' && sent && ev ? <TermCard t={t} ev={ev} W={W} cardW={cardW} cardH={cardH} cardY={cardY} toX={dayX(ev.date)} toY={objY + cellH * 0.55} cellW={cellW} ink={ME.fg} /> : null}
      {/* Verschieben: the entry lifts out of its day and travels to the new one */}
      {step === 'verschieben' && sent && ev && moveTo ? <MovingEntry t={t} icon={ev.icon} fromX={dayX(ev.date)} toX={dayX(moveTo)} y={objY + cellH * 0.7} tint={ME.bg} /> : null}

      {/* Tap during an answer plays it to its end */}
      {sent && !done ? <Pressable onPress={skip} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessibilityLabel={tx('Überspringen', 'Skip')} /> : null}

      {/* Bottom: field or button */}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16 }}>
        {inputStep && !sent ? (
          <View style={{ borderRadius: 24, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 }}>
            <TextInput value={text} onChangeText={setText} placeholder={tx('Sprich oder schreib einfach …', 'Just speak or type …')} placeholderTextColor={tokens.mute}
              onSubmitEditing={() => send()} returnKeyType="send" style={[{ fontSize: 16, color: tokens.ink, minHeight: 24, paddingVertical: 0 }, noOutline]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => toast(tx('Im Test bitte tippen oder ein Beispiel nehmen', 'In this test, please type or take an example'))} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={tx('Sprechen', 'Speak')}>
                <LineIcon name="mic" size={20} color={tokens.ink} />
              </Pressable>
              <Pressable onPress={() => send()} disabled={!text.trim()} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? tokens.ink : tokens.chipBg }} accessibilityLabel={tx('Senden', 'Send')}>
                <LineIcon name="send" size={17} color={text.trim() ? tokens.onInk : tokens.mute} />
              </Pressable>
            </View>
          </View>
        ) : null}
        {step === 'hallo' ? <Btn label={tx('Hallo Memo!', 'Hi Memo!')} onPress={() => go('namen')} /> : null}
        {step === 'namen' ? <Btn label={tx('Weiter', 'Continue')} disabled={!magA} onPress={() => go('termin')} /> : null}
        {inputStep && done ? <Animated.View entering={build}><Btn label={tx('Weiter', 'Continue')} onPress={() => go(next[step])} /></Animated.View> : null}
        {step === 'fertig' ? <Btn label={tx('Los geht’s', 'Let’s go')} onPress={() => { haptics.success(); router.back(); }} /> : null}
      </View>
    </View>
  );
}

function NameField({ value, onChange, placeholder, c }: { value: string; onChange: (v: string) => void; placeholder: string; c: { bg: string; fg: string } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: 18, backgroundColor: tokens.row, paddingHorizontal: 14, borderWidth: 1, borderColor: tokens.hair }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: value.trim() ? c.bg : tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={13} weight={700} color={value.trim() ? c.fg : tokens.mute}>{value.trim() ? value.trim()[0].toUpperCase() : '?'}</Txt>
      </View>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={tokens.mute} autoCapitalize="words" style={[{ flex: 1, fontSize: 17, color: tokens.ink }, noOutline]} />
    </View>
  );
}

/** A name magnet next to Memo: pops in once (critically damped), then stays still. */
function Magnet({ x, y, letter, c }: { x: number; y: number; letter?: string; c: { bg: string; fg: string } }) {
  const a = useSharedValue(0);
  useEffect(() => { a.value = withTiming(1, { duration: 420, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, []);
  const st = useAnimatedStyle((): any => ({ opacity: a.value, transform: [{ translateY: (1 - a.value) * 10 }, { scale: 0.85 + 0.15 * a.value }, { rotate: `${(1 - a.value) * 10}deg` }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: tokens.row }, st]}>
      <Txt size={17} weight={700} color={c.fg}>{(letter ?? '?').toUpperCase()}</Txt>
    </Animated.View>
  );
}

function TermCard({ t, ev, W, cardW, cardH, cardY, toX, toY, cellW, ink }: { t: SharedValue<number>; ev: { title: string; date: string; start?: string; icon: any }; W: number; cardW: number; cardH: number; cardY: number; toX: number; toY: number; cellW: number; ink: string }) {
  const st = useAnimatedStyle((): any => {
    const v = t.value;
    const a = crit(v - 1.3, 20);
    const f = eMove(seg(v, 2.15, 2.75));
    const cx = mix(W / 2, toX, f);
    const cy = quad(cardY + cardH / 2, cardY - 30, toY, f);
    const s = mix(0.92 + 0.08 * a, (cellW - 10) / cardW, f);
    return { opacity: (v < 1.3 ? 0 : Math.min(1, a * 1.6)) * (1 - seg(v, 2.68, 2.76)), transform: [{ translateX: cx - cardW / 2 }, { translateY: cy - cardH / 2 }, { scale: s }] };
  });
  const inn = (from: number) => useAnimatedStyle((): any => { const p = eOut(seg(t.value, from, from + 0.25)); return { opacity: p * (1 - seg(t.value, 2.45, 2.62)), transform: [{ translateY: (1 - p) * 6 }] }; });
  const i1 = inn(1.45), i2 = inn(1.52), i3 = inn(1.6);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: cardW, height: cardH, borderRadius: 18, backgroundColor: tokens.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, st]}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: ink }} />
      <Animated.View style={i1}><ClayIcon name={ev.icon} size={44} /></Animated.View>
      <View style={{ flex: 1, gap: 2 }}>
        <Animated.View style={i2}><Txt size={16} weight={600} numberOfLines={1}>{ev.title}</Txt></Animated.View>
        <Animated.View style={i3}><Txt size={13.5} color={tokens.sub}>{`${short(ev.date)}${ev.start ? ` · ${ev.start}` : ''}`}</Txt></Animated.View>
      </View>
    </Animated.View>
  );
}

/** Verschieben: the entry lifts out of its old day (1.30), travels on an arc (2.15 to 2.75) and lands. */
function MovingEntry({ t, icon, fromX, toX, y, tint }: { t: SharedValue<number>; icon: any; fromX: number; toX: number; y: number; tint: string }) {
  const st = useAnimatedStyle((): any => {
    const v = t.value;
    const lift = crit(v - 1.3, 20);
    const f = eMove(seg(v, 2.15, 2.75));
    const x = mix(fromX, toX, f);
    const yy = y - 16 * lift * (1 - f) - Math.sin(Math.PI * f) * 34;
    return { opacity: v < 1.3 ? 0 : 1 - seg(v, 2.72, 2.78), transform: [{ translateX: x - 20 }, { translateY: yy - 20 }, { scale: 1 + 0.25 * lift * (1 - f) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 40, height: 40, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, st]}>
      <ClayIcon name={icon} size={26} />
    </Animated.View>
  );
}

/** One day. 'arriving' fills at contact (2.75); 'leaving' is filled and empties when the entry lifts (1.30). */
function DayCell({ d, w, h, t, icon, has }: { d: string; w: number; h: number; t: SharedValue<number>; icon?: any; has: 'none' | 'arriving' | 'leaving' }) {
  const today = d === TODAY;
  const fill = useAnimatedStyle((): any => {
    if (has === 'none') return { opacity: 0 };
    const a = has === 'arriving' ? crit(t.value - 2.74, 20) : 1 - crit(t.value - 1.3, 20);
    return { opacity: a, transform: [{ scale: 0.86 + 0.14 * a }] };
  }, [has]);
  const pop = useAnimatedStyle((): any => ({ transform: [{ scale: has === 'arriving' ? 1 + Math.max(0, recoil(t.value - 2.75, 0.06)) : 1 }] }), [has]);
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: 14, backgroundColor: tokens.row, alignItems: 'center', paddingTop: 5, borderWidth: today ? 1.5 : 0, borderColor: tokens.ink }, pop]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: ME.bg }, fill]} />
      <Txt size={11} weight={600} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
      <Txt size={16} weight={700}>{dayNum(d)}</Txt>
      {icon && has !== 'none' ? <Animated.View style={fill}><ClayIcon name={icon} size={Math.min(20, w * 0.42)} /></Animated.View> : null}
    </Animated.View>
  );
}

/** A shopping item drops into the list one after the other (2.15 + 0.14 s each). */
function ListItem({ label, i, t }: { label: string; i: number; t: SharedValue<number> }) {
  const st = useAnimatedStyle((): any => {
    const a = crit(t.value - (2.15 + i * 0.14), 16);
    return { opacity: Math.min(1, a * 1.4), transform: [{ translateY: (1 - a) * -22 }] };
  });
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 34 }, st]}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: tokens.hair }} />
      <ClayIcon name={iconFor(label)} size={24} />
      <Txt size={15.5} weight={500}>{label}</Txt>
    </Animated.View>
  );
}
