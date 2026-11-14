/**
 * Die Sprechkarte (Julian 08.11.2026, nach einem Travel-Widget auf X: "Input bar morphs into this").
 * Oben steht, was gerade passiert oder was gefragt wird, darunter eine Antwortzeile, die zur Frage
 * passt: Stunden für "Um wie viel Uhr?", sonst Antworten zum Antippen. Sagen geht immer auch.
 * Gesprochenes sendet nie von selbst (Julian 31.10.): der Satz steht in der Karte, Senden schickt ihn.
 *
 * Zwei Fassungen: KlarCard für den klaren Look (seit 14.11. dunkel und groß wie ein Teleprompter, eine Form,
 * die aus Memo wächst und nach dem Senden zur Ladeblase wird) und BigCard für die älteren Leisten (hell,
 * Memo unten in der Mitte als Sprechknopf).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Platform, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolate, interpolateColor, Extrapolation, Easing, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import VoiceWaves from './VoiceWaves';
import Pin from './buddy/Pin';
import { useMascot } from '../lib/mascot';
import { tokens, blend } from '../theme';
import { voiceLevel, useBuddy, isNight } from '../lib/buddy';
import { useVeil } from './Veil';
import { useMemoOut, setMemoOut } from '../lib/memoOut';
import { useTyping, useKeyboardInset } from '../lib/keyboard';
import { useBarMode } from '../lib/navStyle';
import { navH } from './NavBar';
import { useSpeak, speakOpen, speakHandlers, setSpeak, type SpeakAsk } from '../lib/speak';
import { hm } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const OPEN = { duration: 360, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const CLOSE = { duration: 260, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const MEMO = 64;
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

/** Drei Punkte, die nacheinander atmen, während die Wörter aufgeschrieben werden. */
function Dots({ color = tokens.done }: { color?: string }) {
  const a = useSharedValue(0);
  useEffect(() => { a.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const d = (i: number) => useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * Math.abs(Math.sin((a.value + i * 0.33) * Math.PI)) }));
  const s = [d(0), d(1), d(2)];
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {s.map((st, i) => <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, st]} />)}
    </View>
  );
}

/** dark: on the ink card (klar), where the chosen one is the bright one. */
function Chip({ label, on, strong, dark, onPress }: { label: string; on?: boolean; strong?: boolean; dark?: boolean; onPress: () => void }) {
  const bg = dark ? (on ? tokens.onInk : blend(tokens.ink, tokens.onInk, strong ? 0.24 : 0.14)) : on ? tokens.ink : strong ? tokens.doneSoft : tokens.chipBg;
  const fg = dark ? (on ? tokens.ink : tokens.onInk) : on ? tokens.onInk : strong ? tokens.done : tokens.ink;
  return (
    <PressScale onPress={() => { haptics.select(); onPress(); }} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Txt size={15} weight={on || strong ? 600 : 500} color={fg}>{label}</Txt>
    </PressScale>
  );
}

/** Die Antwortzeile, passend zur Frage. */
function Answers({ ask, dark }: { ask: SpeakAsk; dark?: boolean }) {
  const roll = useRef<ScrollView>(null);
  const hit = ask.hours?.hit;
  // Die Reihe steht am Anfang auf dem Nachmittag; eine gesagte Stunde rollt in die Mitte.
  useEffect(() => {
    if (!ask.hours) return;
    const i = Math.max(0, HOURS.indexOf(hit ?? '14:00'));
    setTimeout(() => roll.current?.scrollTo({ x: Math.max(0, (i - 2) * 70), animated: !!hit }), 30);
  }, [!!ask.hours, hit]);
  if (ask.hours) {
    const h = ask.hours;
    return (
      <View style={{ gap: 10 }}>
        <ScrollView ref={roll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {HOURS.map((t) => <View key={t} style={{ width: 64 }}><Chip label={hm(t)} on={hit === t} dark={dark} onPress={() => h.pick(t)} /></View>)}
        </ScrollView>
        <View style={{ alignItems: 'center' }}><Chip label={tx('oder ganztägig', 'or all day')} strong dark={dark} onPress={h.allDay} /></View>
      </View>
    );
  }
  if (!ask.picks?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {ask.picks.map((p) => <Chip key={p.label} label={p.label} dark={dark} onPress={() => { speakHandlers.cancel(); p.on(); }} />)}
    </View>
  );
}

/** The orange point of a running recording; it breathes slowly (opacity only). */
function RecDot() {
  const a = useSharedValue(1);
  useEffect(() => { a.value = withRepeat(withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const st = useAnimatedStyle(() => ({ opacity: a.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.accent }, st]} />;
}

type Stage = 'rest' | 'card' | 'think';
const MORPH = Easing.bezier(0.32, 0.72, 0, 1);
const OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** The thinking bubble. */
const BUB_W = 64;
const BUB_H = 40;
const K_PAD = { l: 14, r: 12, t: 14, b: 10 };
const K_ROW = 44;
/** How long Memo travels between the nav, the card and the bubble. */
const TRAVEL = 320;
/** Thinking shorter than this gets no bubble; a bubble that started shows at least THINK_MIN. */
const THINK_GATE = 140;
const THINK_MIN = 300;

/**
 * Klar, after the teleprompter reference (Julian 14.11.2026): one dark shape. It grows out of Memo in the nav pill
 * into the card, with what is heard in big type (settled words bright, the current guess grey). On send it shrinks
 * into a small bubble in the middle and Memo's eyes become the three loading dots; when the answer is there the
 * bubble glides back to Memo's place and the nav slides back in. Nothing disappears and reappears: the shape and
 * Memo are the same two things all the way (Julian: "right now it just disappears and reappears").
 *
 * Presentation only: what is recorded, written down and sent stays in TalkBar; this reads the state and calls the
 * handlers. The shape is one empty box that changes size; the words lie over it and only fade.
 */
function KlarCard() {
  const s = useSpeak();
  const b = useBuddy();
  const veil = useVeil();
  const mo = useMemoOut();
  const open = speakOpen(s);
  const minimal = useMascot() === 'minimal';
  const reduced = useReducedMotion();
  const listening = s.phase === 'listen';
  const writing = s.phase === 'write';
  const done = s.phase === 'done';
  const words = !!s.live && !!(s.live.sure || s.live.part) && (listening || writing);
  const answers = !!s.ask && (!!s.ask.hours || !!s.ask.picks?.length) && s.phase !== 'text' && !writing;

  // While the assistant thinks and the nav would show, Memo is the bubble. Never longer than 12 s: then the nav
  // comes back and he thinks on in his place, so the tabs are never gone for long.
  const focus = useTyping();
  const kb = useKeyboardInset();
  const typing = focus && (Platform.OS === 'web' || kb > 0);
  const mode = useBarMode();
  const thinking = (veil.phase === 'think' && !!veil.inline) || b.thinking;
  const [late, setLate] = useState(false);
  useEffect(() => { setLate(false); if (!thinking) return; const t = setTimeout(() => setLate(true), 12000); return () => clearTimeout(t); }, [thinking]);
  const want: Stage = open ? 'card' : thinking && !late && !typing && mode !== 'input' ? 'think' : 'rest';
  const [stage, setStage] = useState<Stage>('rest');
  const thinkSince = useRef(0);
  useEffect(() => {
    if (want === stage) return;
    // The card opens at once. Everything else waits a beat: the card closes a moment before the thinking shows (two
    // stores, two renders), so the shape never starts back to the nav first; an answer that is there at once gets no
    // bubble at all; and a bubble that has started is seen for a moment before it goes home.
    const wait = want === 'card' ? 0 : want === 'think' ? THINK_GATE : stage === 'card' ? 90 : Math.max(0, THINK_MIN - (Date.now() - thinkSince.current));
    if (!wait) { setStage(want); return; }
    const t = setTimeout(() => { if (want === 'think') thinkSince.current = Date.now(); setStage(want); }, wait);
    return () => clearTimeout(t);
  }, [want, stage]);
  // The nav steps back for the card and the bubble, not for a thought that may be over before the bubble starts.
  useEffect(() => { setMemoOut({ away: stage !== 'rest' || want === 'card' }); }, [stage, want]);
  // The pill's own Memo hides while the travelling one is out, and shows again the moment he has landed.
  useEffect(() => {
    if (stage !== 'rest') { setMemoOut({ out: true }); return; }
    const t = setTimeout(() => setMemoOut({ out: false }), reduced ? 0 : TRAVEL);
    return () => clearTimeout(t);
  }, [stage]);
  useEffect(() => () => setMemoOut({ away: false, out: false }), []);
  // The travelling Memo is only there while he is out (and a moment longer, for the handover): at rest he costs nothing.
  const [linger, setLinger] = useState(false);
  useEffect(() => {
    if (stage !== 'rest') { setLinger(true); return; }
    const t = setTimeout(() => setLinger(false), TRAVEL + 200);
    return () => clearTimeout(t);
  }, [stage]);

  // Sizes: the card is as wide as the dock and as high as its words; Memo is drawn as in the nav pill.
  const { width: winW } = useWindowDimensions();
  const [CW, setCW] = useState(Math.max(0, winW - 28));
  const [CH, setCH] = useState(110);
  const NAV = navH();
  const S = NAV - 10;
  const BODY = S * 0.8;
  const geo = (st: Stage) => (st === 'card' ? { w: CW, h: CH, r: 26, cx: CW / 2, yb: 0, px: K_PAD.l + S / 2, py: K_PAD.b + K_ROW / 2 + 1.7 }
    : st === 'think' ? { w: BUB_W, h: BUB_H, r: BUB_H / 2, cx: CW / 2, yb: (NAV - BUB_H) / 2, px: CW / 2, py: NAV / 2 + 1.7 }
    : { w: BODY, h: BODY, r: BODY / 2, cx: CW / 2 + mo.dx, yb: NAV / 2 - 0.2 - BODY / 2, px: CW / 2 + mo.dx, py: NAV / 2 + 1.5 });
  const g0 = geo('rest');
  const w = useSharedValue(g0.w), h = useSharedValue(g0.h), r = useSharedValue(g0.r), cx = useSharedValue(g0.cx), yb = useSharedValue(g0.yb);
  const px = useSharedValue(g0.px), py = useSharedValue(g0.py);
  /** The shape and the travelling Memo show; the words show. */
  const so = useSharedValue(0), po = useSharedValue(0), co = useSharedValue(0);
  const prev = useRef<Stage>('rest');
  useEffect(() => {
    const from = prev.current;
    prev.current = stage;
    const g = geo(stage);
    const moved = from !== stage;
    // A new place travels. A new width of the screen (or Memo's place measured) just sets it.
    const d = reduced || !moved ? 0 : stage === 'card' ? 300 : TRAVEL;
    const T = { duration: d, easing: MORPH };
    const to = (v: SharedValue<number>, x: number) => { v.value = d ? withTiming(x, T) : x; };
    to(w, g.w); to(h, g.h); to(r, g.r); to(cx, g.cx); to(yb, g.yb); to(px, g.px); to(py, g.py);
    if (!moved) return;
    if (stage === 'rest' && (typing || mode === 'input')) {
      // The keyboard's input takes over ("Aa"): there is no nav to go home to, so he simply fades on the way.
      so.value = withTiming(0, { duration: reduced ? 0 : 140 });
      po.value = withTiming(0, { duration: reduced ? 0 : 100 });
    } else if (stage === 'rest') {
      // Landed on the pill's own Memo, who shows again at that moment; then the shape and the traveller go.
      so.value = withDelay(d, withTiming(0, { duration: 60 }));
      po.value = withDelay(d + 90, withTiming(0, { duration: 1 }));
    } else { so.value = 1; po.value = 1; }
  }, [stage, CW, mo.dx]);
  // The open card grows and shrinks with its words, like a text field. Only then: on the way out the words change
  // too, and that must not cut the journey short.
  useEffect(() => { if (prev.current === 'card' && stage === 'card') h.value = reduced ? CH : withTiming(CH, { duration: 180, easing: OUT }); }, [CH]);
  useEffect(() => {
    co.value = open && stage === 'card' ? withDelay(reduced ? 0 : 120, withTiming(1, { duration: reduced ? 0 : 200, easing: OUT })) : withTiming(0, { duration: reduced ? 0 : 90 });
  }, [open, stage]);
  const shape = useAnimatedStyle(() => ({ opacity: so.value, width: w.value, height: h.value, borderRadius: r.value, left: cx.value - w.value / 2, bottom: yb.value }));
  const pin = useAnimatedStyle((): any => ({ opacity: po.value, transform: [{ translateX: px.value - S / 2 }, { translateY: -(py.value - S / 2) }] }));
  const content = useAnimatedStyle((): any => ({ opacity: co.value, transform: [{ translateY: 8 * (1 - co.value) }] }));
  // Something landed: the travelling Memo is glad together with the one in the pill, so they look the same when he
  // lands. Not inside the bubble (there are only the dots); a joy from just before he leaves it plays on the way home.
  const [glad, setGlad] = useState(0);
  const joyAt = useRef(0);
  const seenJoy = useRef(b.joy);
  useEffect(() => {
    if (b.joy === seenJoy.current) return;
    seenJoy.current = b.joy;
    if (stage === 'think') joyAt.current = Date.now(); else setGlad((n) => n + 1);
  }, [b.joy]);
  useEffect(() => { if (stage !== 'think' && joyAt.current && Date.now() - joyAt.current < 400) setGlad((n) => n + 1); joyAt.current = 0; }, [stage]);
  // Minimal has no Memo: the bubble shows three plain dots.
  const dotsIn = useSharedValue(0);
  useEffect(() => { dotsIn.value = withTiming(stage === 'think' ? 1 : 0, { duration: reduced ? 0 : 180 }); }, [stage]);
  const dots = useAnimatedStyle(() => ({ opacity: dotsIn.value }));

  // The recording's clock.
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!listening) return;
    const t0 = Date.now();
    setSec(0);
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [listening]);

  const tail = (t: string, max: number) => (t.length > max ? '… ' + t.slice(t.length - max).replace(/^\S*\s/, '') : t);
  const sure = words ? tail(s.live!.sure, Math.max(0, 170 - s.live!.part.length)) : '';
  const shown = words ? sure.length + s.live!.part.length : s.phase === 'text' ? s.text.length : 0;
  // Big like on a teleprompter; a long sentence steps down so it still fits.
  const T = shown > 150 ? { size: 18, line: 24, weight: 600 as const } : shown > 80 ? { size: 21, line: 27, weight: 700 as const } : { size: 25, line: 31, weight: 700 as const };
  const ON = tokens.onInk;
  const dim = (a: number) => blend(tokens.ink, tokens.onInk, a);
  const night = stage === 'rest' && !thinking && isNight();
  const mood = listening ? 'listen' : writing || thinking ? 'think' : done ? 'happy' : night ? 'sleep' : 'idle';
  const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <View pointerEvents="box-none" onLayout={(e) => { const x = Math.round(e.nativeEvent.layout.width); if (x && x !== CW) setCW(x); }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.max(NAV, CH) }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', backgroundColor: tokens.ink, boxShadow: '0 12px 28px rgba(17,20,23,0.24)' } as any, shape]} />
      <Animated.View pointerEvents={open ? 'auto' : 'none'} onLayout={(e) => { const x = Math.round(e.nativeEvent.layout.height); if (x && x !== CH) setCH(x); }}
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: K_PAD.t, paddingLeft: K_PAD.l, paddingRight: K_PAD.r, paddingBottom: K_PAD.b, gap: 10 }, content]}>
        {done ? (
          <View style={{ minHeight: K_ROW, paddingLeft: S + 10, justifyContent: 'center' }}>
            {minimal ? <View style={{ position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center' }}><LineIcon name="check" size={22} color={ON} stroke={2.4} /></View> : null}
            <Txt size={12.5} weight={500} color={dim(0.6)}>{tx('Steht im Kalender', "It's in the calendar")}</Txt>
            <Txt size={17} line={23} weight={600} color={ON} numberOfLines={2}>{s.done}</Txt>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 4, minHeight: 31 }}>
                {s.ask && (listening || writing || s.ask.hold) && (words || s.phase === 'text') ? <Txt size={12.5} weight={500} color={dim(0.6)} numberOfLines={2}>{s.ask.text}</Txt> : null}
                {words ? (
                  <Txt {...T} numberOfLines={6} color={writing ? dim(0.6) : ON}>
                    {sure}{sure && s.live!.part ? ' ' : ''}<Txt {...T} color={dim(0.45)}>{s.live!.part}</Txt>
                  </Txt>
                ) : s.phase === 'text' ? <Txt {...T} numberOfLines={7} color={ON}>{s.text}</Txt>
                  : writing ? <Txt {...T} color={dim(0.45)}>{tx('Schreibe auf …', 'Writing it down …')}</Txt>
                  : s.ask ? <Txt size={s.ask.text.length > 44 ? 18 : 21} line={s.ask.text.length > 44 ? 24 : 27} weight={700} color={ON} numberOfLines={4}>{s.ask.text}</Txt>
                  : <Txt {...T} color={dim(0.45)}>{tx('Ich höre zu …', "I'm listening …")}</Txt>}
              </View>
              <PressScale accessibilityLabel={tx('Abbrechen', 'Cancel')} hitSlop={10} onPress={() => { haptics.select(); speakHandlers.cancel(); }} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <LineIcon name="x" size={16} color={dim(0.55)} stroke={2} />
              </PressScale>
            </View>
            {answers && s.ask ? <Answers ask={s.ask} dark /> : null}
            <View style={{ height: K_ROW, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Memo's place: the travelling Memo is drawn over it, a tap here is a tap on him. */}
              <Pressable
                disabled={writing}
                onPress={() => { if (listening) speakHandlers.stop(); else speakHandlers.again(); }}
                accessibilityRole="button"
                accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : minimal ? tx('Sprechen', 'Speak') : tx('Memo, tippen zum Sprechen', 'Memo, tap to talk')}
                hitSlop={8}
                style={{ width: S, height: K_ROW, alignItems: 'center', justifyContent: 'center' }}
              >
                {minimal && !listening ? (
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: dim(0.14), opacity: writing ? 0.4 : 1 }}>
                    <LineIcon name="mic" size={17} color={ON} />
                  </View>
                ) : null}
              </Pressable>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                {listening ? <VoiceWaves level={voiceLevel} height={22} color={dim(0.6)} dot={dim(0.2)} />
                  : s.phase === 'text' ? <Txt size={13} color={dim(0.6)} numberOfLines={1}>{tx('Passt das so?', 'Is that right?')}</Txt>
                  : s.ask?.hold && !writing ? <Txt size={13} color={dim(0.6)} numberOfLines={2}>{minimal ? tx('Tipp eine Uhrzeit oder sag sie', 'Tap a time or say it') : tx('Tipp eine Uhrzeit oder tipp Memo und sag sie', 'Tap a time, or tap Memo and say it')}</Txt> : null}
              </View>
              <PressScale accessibilityLabel={tx('Tippen statt sprechen', 'Type instead of speaking')} onPress={() => { haptics.select(); speakHandlers.keys(); }} style={{ height: 36, paddingHorizontal: 13, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dim(0.14) }}>
                <Txt size={14} weight={600} color={ON}>Aa</Txt>
              </PressScale>
              {listening ? (
                // The recording: its point, how long it runs, and stop.
                <PressScale accessibilityLabel={tx('Aufnahme stoppen', 'Stop recording')} onPress={() => { haptics.select(); speakHandlers.stop(); }} style={{ height: 36, paddingLeft: 12, paddingRight: 11, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: dim(0.14) }}>
                  <RecDot />
                  <Txt size={14} weight={600} color={ON} style={{ minWidth: 30, fontVariant: ['tabular-nums'] }}>{clock}</Txt>
                  <View style={{ width: 10, height: 10, borderRadius: 2.5, backgroundColor: ON }} />
                </PressScale>
              ) : null}
              {s.phase === 'text' ? (
                <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={() => { speakHandlers.send(); }} style={{ height: 36, paddingLeft: 15, paddingRight: 11, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ON }}>
                  <Txt size={14.5} weight={600} color={tokens.ink}>{tx('Senden', 'Send')}</Txt>
                  <LineIcon name="up" size={16} color={tokens.ink} stroke={2.3} />
                </PressScale>
              ) : listening ? (
                // One tap still sends what was said, without the look at it first.
                <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={() => { speakHandlers.send(); }} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ON }}>
                  <LineIcon name="up" size={18} color={tokens.ink} stroke={2.3} />
                </PressScale>
              ) : null}
            </View>
          </>
        )}
      </Animated.View>
      {minimal ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: NAV, alignItems: 'center', justifyContent: 'center' }, dots]}>
          <Dots color={ON} />
        </Animated.View>
      ) : stage === 'rest' && !linger ? null : (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, bottom: 0, width: S, height: S }, pin]}>
          <Pin size={S} mood={mood as any} load={stage === 'think'} joy={glad} joyKind={b.joyKind} poke={b.poke} sad={b.sad} wink={b.wink} level={voiceLevel} heard={s.live?.n ?? 0} ground={tokens.ink} />
        </Animated.View>
      )}
    </View>
  );
}

export default function SpeakCard(props: { barH: number; from: string; klar?: boolean }) {
  return props.klar ? <KlarCard /> : <BigCard {...props} />;
}

function BigCard({ barH, from }: { barH: number; from: string }) {
  const s = useSpeak();
  const b = useBuddy();
  const open = speakOpen(s);
  const minimal = useMascot() === 'minimal';
  // The words as they come (Julian 11.11.): with Pin only; minimal keeps the waves.
  const words = !minimal && !!s.live && !!(s.live.sure || s.live.part) && (s.phase === 'listen' || s.phase === 'write');
  const answers = !!s.ask && (!!s.ask.hours || !!s.ask.picks?.length) && s.phase !== 'text' && s.phase !== 'write';
  const cardH = s.phase === 'done' ? 176 : 248 + (answers ? (s.ask?.hours ? 92 : 58) : 0) + (s.phase === 'text' || words ? 34 : 0);
  const p = useSharedValue(0);
  const h = useSharedValue(cardH);
  useEffect(() => { p.value = open ? withTiming(1, OPEN) : withTiming(0, CLOSE); }, [open]);
  useEffect(() => { h.value = withTiming(cardH, { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [cardH]);

  const outer = useAnimatedStyle(() => ({
    opacity: p.value < 0.01 ? 0 : 1,
    height: barH + (h.value - barH) * p.value,
    borderRadius: 27 + 3 * p.value,
    backgroundColor: interpolateColor(p.value, [0, 0.4], [from, tokens.row]),
  }));
  const inner = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.55, 1], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: 10 * (1 - p.value) }] as any }));
  // Memo kommt von rechts oben (wo er über der Leiste saß) in die Mitte der Karte.
  const memo = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0.3, 1], [-40, 0], Extrapolation.CLAMP) }, { scale: interpolate(p.value, [0.3, 1], [0.6, 1], Extrapolation.CLAMP) }] as any }));

  const listening = s.phase === 'listen';
  const writing = s.phase === 'write';
  const label = s.phase === 'done' ? tx('Steht im Kalender', "It's in the calendar")
    : s.phase === 'text' ? (s.ask ? s.ask.text : tx('Passt das so?', 'Is that right?'))
    : s.ask && (listening || s.ask.hold) ? tx('Kurze Frage', 'Quick question') : null;
  const main = s.phase === 'done' ? s.done
    : s.phase === 'text' ? `„${s.text}“`
    : writing ? tx('Schreibe auf …', 'Writing it down …')
    : s.ask ? s.ask.text
    : tx('Ich höre zu …', "I'm listening …");
  // A long sentence shows its end, so the newest words are always in view.
  const tail = (t: string, max: number) => (t.length > max ? '… ' + t.slice(t.length - max).replace(/^\S*\s/, '') : t);
  const sure = words ? tail(s.live!.sure, Math.max(0, 150 - s.live!.part.length)) : '';
  const mood = listening ? 'listen' : writing ? 'think' : s.phase === 'done' ? 'happy' : 'idle';

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', boxShadow: '0 14px 36px rgba(22,35,42,0.18), 0 2px 8px rgba(22,35,42,0.06)' } as any, outer]}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: cardH, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }, inner]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 34 }}>
          <View style={{ flex: 1, gap: 4, paddingTop: 4 }}>
            {label || words ? <Txt size={12.5} weight={600} tracking={0.4} color={tokens.done} numberOfLines={2}>{label ?? (writing ? tx('Schreibe auf …', 'Writing it down …') : tx('Ich höre zu …', "I'm listening …"))}</Txt> : null}
            {words ? (
              <Txt size={18} line={25} weight={500} numberOfLines={4} color={writing ? tokens.sub : tokens.ink}>
                {sure}{sure && s.live!.part ? ' ' : ''}<Txt size={18} line={25} weight={500} color={tokens.mute}>{s.live!.part}</Txt>
              </Txt>
            ) : (
              <Txt size={s.phase === 'text' ? 18 : 20} line={s.phase === 'text' ? 25 : 26} weight={s.phase === 'text' ? 500 : 600} numberOfLines={s.phase === 'text' ? 4 : 3}>{main}</Txt>
            )}
          </View>
          {s.phase === 'done' ? null : (
            <PressScale accessibilityLabel={tx('Abbrechen', 'Cancel')} hitSlop={10} onPress={() => { haptics.select(); speakHandlers.cancel(); }}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
              <LineIcon name="x" size={17} color={tokens.ink} stroke={2} />
            </PressScale>
          )}
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {answers && s.ask ? <Answers ask={s.ask} /> : null}
        </View>
        <View style={{ height: 30, justifyContent: 'center', marginBottom: 6 }}>
          {listening && minimal ? <VoiceWaves level={voiceLevel} height={28} color={tokens.done} /> : writing ? <Dots />
            : s.ask?.hold && s.phase === 'idle' ? <Txt size={13} color={tokens.mute} style={{ textAlign: 'center' }}>{tx('Tipp eine Uhrzeit oder tipp Memo und sag sie', 'Tap a time, or tap Memo and say it')}</Txt> : null}
        </View>
        <View style={{ height: MEMO + 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 92, alignItems: 'flex-start' }}>
            {s.phase === 'text' ? (
              <PressScale onPress={() => { haptics.select(); speakHandlers.edit(); }} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: tokens.chipBg }}>
                <Txt size={14.5} weight={600}>{tx('Ändern', 'Edit')}</Txt>
              </PressScale>
            ) : null}
          </View>
          <Animated.View style={memo}>
            <Pressable
              disabled={writing || s.phase === 'done'}
              onPress={() => { if (listening) speakHandlers.stop(); else speakHandlers.again(); }}
              accessibilityRole="button"
              accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : minimal ? tx('Sprechen', 'Speak') : tx('Memo, tippen zum Sprechen', 'Memo, tap to talk')}
              hitSlop={8}
            >
              {minimal ? (
                // Minimal (Julian 11.11.): record and stop, as before.
                <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink, opacity: writing ? 0.4 : 1 }}>
                  {listening ? <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: tokens.onInk }} /> : <LineIcon name="mic" size={24} color={tokens.onInk} />}
                </View>
              ) : (
                <Pin size={MEMO} mood={mood as any} joy={b.joy} poke={b.poke} level={voiceLevel} heard={s.live?.n ?? 0} />
              )}
            </Pressable>
          </Animated.View>
          <View style={{ width: 92, alignItems: 'flex-end' }}>
            {listening || s.phase === 'text' ? (
              <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={() => { speakHandlers.send(); }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }}>
                <LineIcon name="send" size={19} color={tokens.onInk} />
              </PressScale>
            ) : null}
          </View>
        </View>
        {listening && !s.ask ? (
          <Txt size={12} color={tokens.mute} style={{ textAlign: 'center', marginTop: 2 }}>{minimal ? tx('Tipp Stopp, wenn du fertig bist', 'Tap stop when you are done') : tx('Tipp Memo, wenn du fertig bist', 'Tap Memo when you are done')}</Txt>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

/** Schließt die Karte ganz (auch eine Frage, die sie offen hielt). */
export const closeSpeak = () => setSpeak({ phase: 'idle', text: '', ask: null });
