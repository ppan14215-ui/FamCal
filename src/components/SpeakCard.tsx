/**
 * Die Sprechkarte (Julian 08.11.2026, nach einem Travel-Widget auf X: "Input bar morphs into this").
 * Beim Sprechen wächst die dunkle Leiste an Ort und Stelle zu einer hellen, einfarbigen Karte
 * (Julian 20:40: "leave the gradient out"). Memo sitzt unten in der Mitte als Sprechknopf; der
 * schwebende Memo über der Leiste blendet so lange aus, damit nie zwei übereinander liegen
 * ("make sure the mascot doesn't overlap").
 *
 * Oben steht, was gerade passiert oder was gefragt wird, darunter eine Antwortzeile, die zur Frage
 * passt: Stunden für "Um wie viel Uhr?", sonst Antworten zum Antippen. Sagen geht immer auch.
 * Gesprochenes sendet nie von selbst (Julian 31.10.): der Satz steht in der Karte, Senden schickt ihn.
 */
import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolate, interpolateColor, Extrapolation, Easing } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import VoiceWaves from './VoiceWaves';
import Pin from './buddy/Pin';
import { useMascot } from '../lib/mascot';
import { tokens, glass } from '../theme';
import { voiceLevel, useBuddy } from '../lib/buddy';
import { useSpeak, speakOpen, speakHandlers, setSpeak, type SpeakAsk } from '../lib/speak';
import { hm } from '../lib/dates';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const OPEN = { duration: 360, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const CLOSE = { duration: 260, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const MEMO = 64;
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

/** Drei Punkte, die nacheinander atmen, während die Wörter aufgeschrieben werden. */
function Dots() {
  const a = useSharedValue(0);
  useEffect(() => { a.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const d = (i: number) => useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * Math.abs(Math.sin((a.value + i * 0.33) * Math.PI)) }));
  const s = [d(0), d(1), d(2)];
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {s.map((st, i) => <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.done }, st]} />)}
    </View>
  );
}

function Chip({ label, on, strong, onPress }: { label: string; on?: boolean; strong?: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={() => { haptics.select(); onPress(); }} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tokens.ink : strong ? tokens.doneSoft : tokens.chipBg }}>
      <Txt size={15} weight={on || strong ? 600 : 500} color={on ? tokens.onInk : strong ? tokens.done : tokens.ink}>{label}</Txt>
    </PressScale>
  );
}

/** Die Antwortzeile, passend zur Frage. */
function Answers({ ask }: { ask: SpeakAsk }) {
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
          {HOURS.map((t) => <View key={t} style={{ width: 64 }}><Chip label={hm(t)} on={hit === t} onPress={() => h.pick(t)} /></View>)}
        </ScrollView>
        <View style={{ alignItems: 'center' }}><Chip label={tx('oder ganztägig', 'or all day')} strong onPress={h.allDay} /></View>
      </View>
    );
  }
  if (!ask.picks?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {ask.picks.map((p) => <Chip key={p.label} label={p.label} onPress={() => { speakHandlers.cancel(); p.on(); }} />)}
    </View>
  );
}

/**
 * Klar (Julian 13.11.2026: "tapping Memo opens voice AND text input in one element"): the card grows out of Memo in
 * the nav pill and lies over the pill. On top what is heard, settled words dark and the current guess grey; below it
 * Memo (tap him when you are done), the wave, "Aa" for the keyboard and send. Only opacity and a small scale move;
 * the card has the height of its content and grows like a text field.
 */
function KlarCard() {
  const s = useSpeak();
  const b = useBuddy();
  const open = speakOpen(s);
  const minimal = useMascot() === 'minimal';
  const listening = s.phase === 'listen';
  const writing = s.phase === 'write';
  const done = s.phase === 'done';
  const words = !!s.live && !!(s.live.sure || s.live.part) && (listening || writing);
  const answers = !!s.ask && (!!s.ask.hours || !!s.ask.picks?.length) && s.phase !== 'text' && !writing;
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(open ? 1 : 0, { duration: open ? 240 : 140, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [open]);
  const outer = useAnimatedStyle((): any => ({ opacity: p.value, transform: [{ scale: 0.92 + 0.08 * p.value }] }));
  const tail = (t: string, max: number) => (t.length > max ? '… ' + t.slice(t.length - max).replace(/^\S*\s/, '') : t);
  const sure = words ? tail(s.live!.sure, Math.max(0, 150 - s.live!.part.length)) : '';
  const mood = listening ? 'listen' : writing ? 'think' : done ? 'happy' : 'idle';
  const ready = s.phase === 'text' || (listening && words);
  const T = { size: 17, line: 24 } as const;
  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 26, paddingTop: 14, paddingLeft: 16, paddingRight: 12, paddingBottom: 10, gap: 10, transformOrigin: '82% 100%' } as any, glass.card, outer]}>
      {done ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          {minimal ? <LineIcon name="check" size={22} color={tokens.ink} stroke={2.4} /> : <Pin size={40} mood="happy" joy={b.joy} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={12.5} weight={500} color={tokens.mute}>{tx('Steht im Kalender', "It's in the calendar")}</Txt>
            <Txt size={16} line={22} weight={500} numberOfLines={2}>{s.done}</Txt>
          </View>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2, minHeight: 24 }}>
              {s.ask && (listening || writing || s.ask.hold) && (words || s.phase === 'text') ? <Txt size={12.5} weight={500} color={tokens.mute} numberOfLines={2}>{s.ask.text}</Txt> : null}
              {words ? (
                <Txt {...T} numberOfLines={5} color={writing ? tokens.sub : tokens.ink}>
                  {sure}{sure && s.live!.part ? ' ' : ''}<Txt {...T} color={tokens.mute}>{s.live!.part}</Txt>
                </Txt>
              ) : s.phase === 'text' ? <Txt {...T} numberOfLines={5}>{s.text}</Txt>
                : writing ? <Txt {...T} color={tokens.mute}>{tx('Schreibe auf …', 'Writing it down …')}</Txt>
                : s.ask ? <Txt {...T} weight={500} numberOfLines={3}>{s.ask.text}</Txt>
                : <Txt {...T} color={tokens.mute}>{tx('Ich höre zu …', "I'm listening …")}</Txt>}
            </View>
            <PressScale accessibilityLabel={tx('Abbrechen', 'Cancel')} hitSlop={10} onPress={() => { haptics.select(); speakHandlers.cancel(); }} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <LineIcon name="x" size={16} color={tokens.mute} stroke={2} />
            </PressScale>
          </View>
          {answers && s.ask ? <Answers ask={s.ask} /> : null}
          <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: -4 }}>
            <Pressable
              disabled={writing}
              onPress={() => { if (listening) speakHandlers.stop(); else speakHandlers.again(); }}
              accessibilityRole="button"
              accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : minimal ? tx('Sprechen', 'Speak') : tx('Memo, tippen zum Sprechen', 'Memo, tap to talk')}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              {minimal ? (
                <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink, opacity: writing ? 0.4 : 1 }}>
                  {listening ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: tokens.onInk }} /> : <LineIcon name="mic" size={17} color={tokens.onInk} />}
                </View>
              ) : (
                <View pointerEvents="none" style={{ marginTop: -3 }}><Pin size={40} mood={mood as any} joy={b.joy} poke={b.poke} level={voiceLevel} heard={s.live?.n ?? 0} ground="#FFFFFF" /></View>
              )}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              {listening ? <VoiceWaves level={voiceLevel} height={24} color={tokens.sub} />
                : writing ? <View style={{ alignItems: 'flex-start', paddingLeft: 4 }}><Dots /></View>
                : s.phase === 'text' ? <Txt size={13} color={tokens.mute} numberOfLines={1}>{tx('Passt das so?', 'Is that right?')}</Txt>
                : s.ask?.hold ? <Txt size={13} color={tokens.mute} numberOfLines={2}>{minimal ? tx('Tipp eine Uhrzeit oder sag sie', 'Tap a time or say it') : tx('Tipp eine Uhrzeit oder tipp Memo und sag sie', 'Tap a time, or tap Memo and say it')}</Txt> : null}
            </View>
            <PressScale accessibilityLabel={tx('Tippen statt sprechen', 'Type instead of speaking')} onPress={() => { haptics.select(); speakHandlers.keys(); }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
              <Txt size={14} weight={600}>Aa</Txt>
            </PressScale>
            <PressScale accessibilityLabel={tx('Senden', 'Send')} disabled={!(listening || s.phase === 'text')} onPress={() => { speakHandlers.send(); }}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: ready ? tokens.ink : tokens.chipBg }}>
              <LineIcon name="up" size={18} color={ready ? tokens.onInk : tokens.mute} stroke={2.2} />
            </PressScale>
          </View>
        </>
      )}
    </Animated.View>
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
