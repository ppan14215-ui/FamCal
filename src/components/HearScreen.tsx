/**
 * Der Hör-Screen (Julian 28.11.: kein schwarzes Overlay mehr, "es springt und passt nicht zum neuen Stil").
 * Ein ruhiger weißer Screen: Memo groß und schwarz oben, seine Augen hören zu, darunter läuft der Satz mit,
 * eine Welle zeigt den Ton. Das Quadrat stoppt, dann steht der Text da und erst ein zweiter Tipp sendet
 * (Stimme sendet nie von selbst). Rückfragen ohne Mikro bleiben in der Karte über dem Feld.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, BackHandler } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import VoiceWaves from './VoiceWaves';
import TagText from './TagText';
import Pin from './buddy/Pin';
import { tokens } from '../theme';
import { voiceLevel, useBuddy } from '../lib/buddy';
import { useSpeak, speakHandlers, getSpeak } from '../lib/speak';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** The phases this screen owns: speaking, writing it down, and the text waiting for its send. */
export const hearOwns = (p: string) => p === 'listen' || p === 'write' || p === 'text';

const intoText = () => { haptics.select(); if (getSpeak().phase === 'text') speakHandlers.edit(); else speakHandlers.keys(); };

export default function HearScreen() {
  const now = useSpeak();
  const b = useBuddy();
  const ins = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const want = hearOwns(now.phase);
  // Keep the last words while it fades out, so nothing flashes on the way.
  const kept = useRef(now);
  if (want) kept.current = now;
  const s = want ? now : kept.current;
  const [shown, setShown] = useState(want);
  const a = useSharedValue(0);
  useEffect(() => {
    if (want) { setShown(true); a.value = withTiming(1, { duration: reduced ? 0 : 240, easing: OUT }); return; }
    a.value = withTiming(0, { duration: reduced ? 0 : 160, easing: OUT });
    const t = setTimeout(() => setShown(false), reduced ? 0 : 170);
    return () => clearTimeout(t);
  }, [want]);
  const fade = useAnimatedStyle(() => ({ opacity: a.value }));
  const rise = useAnimatedStyle((): any => ({ transform: [{ scale: 0.94 + 0.06 * a.value }] }));
  useEffect(() => {
    if (!want) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { speakHandlers.cancel(); return true; });
    return () => sub.remove();
  }, [want]);

  const listening = s.phase === 'listen';
  const writing = s.phase === 'write';
  const text = s.phase === 'text';
  const words = !!s.live && !!(s.live.sure || s.live.part) && (listening || writing);
  const tail = (t: string, max: number) => (t.length > max ? '… ' + t.slice(t.length - max).replace(/^\S*\s/, '') : t);
  const sure = words ? tail(s.live!.sure, Math.max(0, 200 - s.live!.part.length)) : '';
  const n = words ? sure.length + s.live!.part.length : text ? s.text.length : 0;
  const T = n > 150 ? { size: 20, line: 27, weight: 600 as const } : n > 80 ? { size: 23, line: 30, weight: 600 as const } : { size: 27, line: 35, weight: 600 as const };
  const label = listening ? tx('Memo hört zu', 'Memo is listening') : writing ? tx('Schreibe auf …', 'Writing it down …') : tx('Passt das so?', 'Is that right?');

  // The recording's clock, small under the waves.
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!listening) return;
    const t0 = Date.now(); setSec(0);
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [listening]);
  const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  if (!shown) return null;
  const side = { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.group } as const;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => speakHandlers.cancel()}>
      <Animated.View style={[{ flex: 1, backgroundColor: tokens.paper, paddingTop: ins.top + 72, paddingBottom: ins.bottom + 36, paddingHorizontal: 28 }, fade]}>
        <Animated.View style={[{ alignItems: 'center' }, rise]}>
          <View style={{ width: 196, height: 196, borderRadius: 98, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.group }}>
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : tx('Nochmal sprechen', 'Speak again')}
              disabled={writing} onPress={() => { haptics.tap(); if (listening) speakHandlers.stop(); else speakHandlers.again(); }}>
              <Pin size={150} mood={listening ? 'listen' : writing ? 'think' : 'idle'} level={voiceLevel} heard={s.live?.n ?? 0} poke={b.poke} wink={b.wink} ground={tokens.group} />
            </Pressable>
          </View>
          <Txt size={13} weight={600} color={tokens.mute} style={{ marginTop: 30, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Txt>
        </Animated.View>
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 16 }}>
          {s.ask ? <Txt size={15} line={21} weight={500} color={tokens.sub} numberOfLines={2} style={{ textAlign: 'center', marginBottom: 10 }}>{s.ask.text}</Txt> : null}
          <Pressable onPress={intoText} accessibilityRole="button" accessibilityLabel={tx('Text ändern', 'Edit the text')} style={{ maxWidth: '100%' }}>
            {words ? (
              <View style={{ maxHeight: 7 * T.line, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' }}>
                <TagText text={sure} tail={s.live!.part} {...T} color={writing ? tokens.sub : tokens.ink} tailColor={tokens.mute} animate steady pale />
              </View>
            ) : text ? <Txt {...T} numberOfLines={8} color={tokens.ink} style={{ textAlign: 'center' }}>{s.text}</Txt>
              : <Txt {...T} color={tokens.mute} style={{ textAlign: 'center' }}>{writing ? tx('Einen Moment …', 'One moment …') : tx('Sag einfach, was ansteht …', 'Just say what is coming up …')}</Txt>}
          </Pressable>
          {listening ? (
            <View style={{ marginTop: 34, width: 220, alignItems: 'center', gap: 10 }}>
              <View style={{ width: 220 }}><VoiceWaves level={voiceLevel} height={30} color={tokens.ink} dot={tokens.circleLine} /></View>
              <Txt size={13} weight={500} color={tokens.mute} style={{ fontVariant: ['tabular-nums'] }}>{clock}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <PressScale accessibilityLabel={tx('Abbrechen', 'Cancel')} onPress={() => { haptics.select(); speakHandlers.cancel(); }} style={side}>
            <LineIcon name="x" size={20} color={tokens.ink} stroke={2.2} />
          </PressScale>
          {text ? (
            <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={() => { haptics.commit(); speakHandlers.send(); }}
              style={{ height: 64, paddingHorizontal: 26, borderRadius: 32, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tokens.ink }}>
              <Txt size={17} weight={700} color={tokens.onInk}>{tx('Senden', 'Send')}</Txt>
              <LineIcon name="up" size={19} color={tokens.onInk} stroke={2.4} />
            </PressScale>
          ) : (
            <PressScale disabled={writing} accessibilityLabel={tx('Aufnahme stoppen', 'Stop recording')} onPress={() => { haptics.tap(); speakHandlers.stop(); }}
              style={{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink, opacity: writing ? 0.35 : 1 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: tokens.onInk }} />
            </PressScale>
          )}
          <PressScale accessibilityLabel={text ? tx('Text ändern', 'Edit the text') : tx('Tippen statt sprechen', 'Type instead of speaking')} onPress={intoText} style={side}>
            <Txt size={16} weight={700} color={tokens.ink}>Aa</Txt>
          </PressScale>
        </View>
      </Animated.View>
    </Modal>
  );
}
