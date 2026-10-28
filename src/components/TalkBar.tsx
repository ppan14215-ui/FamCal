/**
 * Sprechen oder schreiben (Pivot 26.10., überall seit 27.10.): one field at
 * the bottom of every screen, with plus (photo and more), text and mic like a
 * chat app. The mic
 * uses the phone's own speech recognition in the app and the browser's on
 * the web; in the testlink that is blocked, so it says an example sentence
 * and marks it as one.
 * Like the Claude app the field grows upwards with the text, up to four
 * lines, then scrolls inside (Julian 27.10.).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import VoiceBars from './VoiceBars';
import VoiceRing from './VoiceRing';
import { useMicStyle } from '../lib/micStyle';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens, fonts } from '../theme';
import { haptics } from '../lib/haptics';
import { setTyping } from '../lib/keyboard';
import { LIVE } from '../lib/live';
import { tx } from '../i18n/lang';
import { speechLocale } from '../lib/speechLang';

// Phones and tablets: Enter on the screen keyboard adds a line.
const TOUCH = Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);

/** Quiet this long after the last word ends listening; a second tap ends it at once. */
const SILENCE_MS = 2500;
const FIRST_WORD_MS = 8000;

const LINE = 22;
const PAD = 11;
const MIN_H = LINE + PAD * 2;
const MAX_H = LINE * 4 + PAD * 2;

// A long hint stays on one line and ends in dots instead of growing the field.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent = 'textarea[aria-label="Was steht an?"]::placeholder,textarea[aria-label="What\'s on?"]::placeholder{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  document.head.appendChild(css);
}

const lift = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(22,35,42,.10)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
});

type Props = {
  /** voice: the text came from the mic, so a follow-up may listen again. */
  onSend: (text: string, how?: { voice?: boolean }) => void;
  /** Opens Foto, Termin, Aufgabe, Entwurf. */
  onPlus?: () => void;
  /** What the mic says in the testlink, one after the other. */
  spoken: string[];
  placeholder?: string;
  /** A new value above 0 starts listening as if the mic was tapped, e.g. after the card asks a follow-up. */
  listenKey?: number;
  /** On the tabs (Julian 28.10.): a clear way back. The × sits on the left, the + moves next to the mic. */
  onClose?: () => void;
};

export default function TalkBar({ onSend, onPlus, spoken, listenKey, onClose, placeholder = tx('Sag oder schreib, was ansteht …', 'Say or type what\'s coming up …') }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  /** How loud the voice is right now, 0 to 1; drives the bars in the mic. */
  const level = useSharedValue(0);
  const micStyle = useMicStyle();
  const [demo, setDemo] = useState(false);
  const [boxH, setBoxH] = useState(MIN_H);
  const field = useRef<TextInput>(null);
  const blurT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const turn = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Ends listening on the phone early: a second tap on the orb sends what was heard. */
  const stopNative = useRef<(() => void) | null>(null);
  /** Tapping into the field while the mic listens switches to typing (Julian 28.10.): what was heard stays, nothing is sent. */
  const toKeys = useRef<(() => void) | null>(null);
  const typed = useRef(false);
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(blurT.current); setTyping(false); }, []);

  // On the web the textarea never shrinks by itself, so measure it fresh.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const n = field.current as any;
    if (!n?.style) return;
    if (!text) return setBoxH(MIN_H);
    const was = n.style.height;
    n.style.height = '0px';
    const sh = n.scrollHeight;
    n.style.height = was;
    setBoxH(Math.min(MAX_H, Math.max(MIN_H, sh)));
  }, [text]);

  const send = (t = text, voice = false) => {
    const q = t.trim();
    if (!q) return;
    setText('');
    haptics.tap();
    if (voice) onSend(q, { voice: true }); else onSend(q);
  };

  // Types the sentence letter by letter, as if it were heard, then sends it.
  const say = (sentence: string) => {
    setDemo(true);
    stopNative.current = () => { timers.current.forEach(clearTimeout); setDemo(false); setListening(false); setText(''); };
    let i = 0;
    const step = () => {
      i += 2;
      setText(sentence.slice(0, i));
      if (i < sentence.length) timers.current.push(setTimeout(step, 45));
      else timers.current.push(setTimeout(() => { setListening(false); setDemo(false); send(sentence); }, 500));
    };
    timers.current.push(setTimeout(step, 700));
  };

  const listen = () => {
    if (listening) { haptics.tap(); stopNative.current?.(); return; }
    typed.current = false;
    haptics.select();
    setListening(true);
    const sentence = spoken[turn.current++ % spoken.length];
    if (Platform.OS !== 'web') return listenNative(sentence);
    const SR = (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition;
    if (!SR) return say(sentence);
    try {
      const r = new SR();
      r.lang = speechLocale();
      r.interimResults = true;
      let heard = '';
      let failed = false;
      const fallback = () => { if (failed) return; failed = true; try { r.abort(); } catch {} say(sentence); };
      // Blocked or silent mics often never answer, so wait at most 3 seconds for a first word.
      const guard = setTimeout(() => { if (!heard) fallback(); }, 3000);
      timers.current.push(guard);
      r.onresult = (e: any) => { heard = Array.from(e.results).map((x: any) => x[0].transcript).join(' '); setText(heard); };
      r.onerror = () => { clearTimeout(guard); fallback(); };
      r.onend = () => { clearTimeout(guard); if (failed) return; setListening(false); if (typed.current) return; if (heard) send(heard, true); else fallback(); };
      toKeys.current = () => { failed = true; clearTimeout(guard); try { r.abort(); } catch {} setListening(false); };
      stopNative.current = () => { const h = heard; toKeys.current?.(); if (h) send(h, true); };
      r.start();
    } catch {
      say(sentence);
    }
  };

  /**
   * The real app hears on the phone itself (Julian 27.10.: "Handy hört").
   * Apple and Google recognise German on the device; the text then goes to
   * "verstehen". Without the native module (Expo Go) or without permission it
   * falls back: the test link plays an example, the real app opens the
   * keyboard, whose own mic still works.
   */
  const listenNative = async (sentence: string) => {
    const fail = () => { setListening(false); if (LIVE) field.current?.focus(); else say(sentence); };
    try {
      const { ExpoSpeechRecognitionModule: SR } = await import('expo-speech-recognition');
      const ok = await SR.requestPermissionsAsync();
      if (!ok.granted || !SR.isRecognitionAvailable()) return fail();
      // Let the person finish (Julian 28.10.: "wartet nicht lange genug"): listen
      // on through short pauses and stop only after a longer silence or a second tap.
      let done = '';
      let part = '';
      let quiet: ReturnType<typeof setTimeout> | undefined;
      const heard = () => `${done} ${part}`.replace(/\s+/g, ' ').trim();
      const hush = (ms: number) => { clearTimeout(quiet); quiet = setTimeout(() => SR.stop(), ms); };
      const subs = [
        SR.addListener('result', (e) => {
          const t = e.results[0]?.transcript ?? '';
          if (e.isFinal) { done = `${done} ${t}`; part = ''; } else part = t;
          setText(heard());
          hush(SILENCE_MS);
        }),
        // -2 to 10 from the phone; below 0 is inaudible.
        SR.addListener('volumechange', (e) => { level.value = withTiming(Math.min(1, Math.max(0, e.value / 10)), { duration: 100 }); }),
        SR.addListener('error', () => { clearTimeout(quiet); subs.forEach((x) => x.remove()); if (!heard()) fail(); }),
        SR.addListener('end', () => { clearTimeout(quiet); subs.forEach((x) => x.remove()); setListening(false); const h = heard(); if (h && !typed.current) send(h, true); }),
      ];
      // A tap on the mic ends at once (Julian 28.10.): keep what was heard, send it, no waiting for the phone to finish.
      stopNative.current = () => {
        clearTimeout(quiet); subs.forEach((x) => x.remove()); SR.abort(); setListening(false);
        const h = heard(); if (h && !typed.current) send(h, true);
      };
      toKeys.current = () => { clearTimeout(quiet); SR.abort(); setListening(false); };
      // Nothing at all after a while: stop instead of listening forever.
      hush(FIRST_WORD_MS);
      SR.start({
        lang: speechLocale(), interimResults: true, continuous: true, addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_MS, EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_MS },
      });
    } catch {
      fail();
    }
  };

  // The browser reports no volume, so the test link moves the bars like speech with short pauses.
  useEffect(() => {
    if (!listening) { level.value = withTiming(0, { duration: 200 }); return; }
    if (Platform.OS !== 'web') return;
    let pause = 0;
    const id = setInterval(() => {
      if (pause > 0) { pause--; level.value = withTiming(0.05, { duration: 120 }); return; }
      if (Math.random() < 0.06) pause = 4 + Math.floor(Math.random() * 5);
      level.value = withTiming(0.35 + Math.random() * 0.65, { duration: 110 });
    }, 120);
    return () => clearInterval(id);
  }, [listening]);

  // Keep the conversation going: the card asked something, so listen again.
  useEffect(() => {
    if (!listenKey || listening || text.trim()) return;
    listen();
  }, [listenKey]);

  const plus = (
    <PressScale accessibilityLabel={tx('Foto, Termin, Aufgabe', 'Photo, event, task')} onPress={() => { if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); setText(''); } onPlus?.(); }} style={{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
      <LineIcon name="plus" size={22} color={tokens.ink} stroke={2} />
    </PressScale>
  );

  const input = (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 6, paddingLeft: 6, borderRadius: boxH > MIN_H ? 26 : 30, backgroundColor: tokens.row, borderWidth: 1, borderColor: listening ? tokens.ink : tokens.hair }, lift]}>
      {onClose ? (
        <PressScale accessibilityLabel={tx('Schließen, zurück zu den Tabs', 'Close, back to the tabs')} hitSlop={6} onPress={() => { if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); } setText(''); field.current?.blur(); haptics.select(); onClose(); }} style={{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
          <LineIcon name="x" size={20} color={tokens.ink} stroke={2} />
        </PressScale>
      ) : plus}
      <TextInput
        ref={field}
        onFocus={() => {
          clearTimeout(blurT.current); setTyping(true);
          if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); }
        }}
        // Tapping send blurs the field first; wait so the button does not move away under the finger.
        onBlur={() => { blurT.current = setTimeout(() => setTyping(false), 350); }}
        multiline
        value={text}
        onChangeText={setText}
        // On a phone Enter makes a new line and the arrow sends, as in the Claude app.
        enterKeyHint={TOUCH ? 'enter' : 'send'}
        // On the phone contentSize already holds the padding; adding it again made the empty field two lines tall on Android (Julian 27.10.).
        onContentSizeChange={Platform.OS === 'web' ? undefined : (e) => setBoxH(text ? Math.min(MAX_H, Math.max(MIN_H, Math.ceil(e.nativeEvent.contentSize.height))) : MIN_H)}
        // With a real keyboard Enter sends and Shift plus Enter makes a new line.
        onKeyPress={(e: any) => {
          if (Platform.OS === 'web' && !TOUCH && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
        }}
        scrollEnabled={boxH >= MAX_H}
        editable={!demo}
        placeholder={listening ? tx('Ich höre zu …', 'Listening …') : placeholder}
        placeholderTextColor={tokens.mute}
        selectionColor={tokens.select} cursorColor={tokens.ink}
        returnKeyType={TOUCH ? 'default' : 'send'}
        accessibilityLabel={tx('Was steht an?', 'What\'s on?')}
        style={[{ flex: 1, minWidth: 0, height: boxH, marginBottom: 2, fontFamily: fonts[400], fontSize: 16.5, lineHeight: LINE, color: tokens.ink, paddingVertical: PAD, paddingHorizontal: 8, textAlignVertical: 'top', includeFontPadding: false }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
      {/* Plus stays reachable while the mic listens (Julian 28.10.: "wie komme ich an das + Menü?"). */}
      {onClose && (!text || listening) ? plus : null}
      <View style={{ width: 48, height: 48 }}>
      {listening && micStyle === 'ring' ? <VoiceRing level={level} /> : null}
      <PressScale
        accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : text ? tx('Senden', 'Send') : tx('Sprechen', 'Speak')}
        onPress={text && !listening ? () => send() : listen}
        style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}
      >
        {listening ? (micStyle === 'ring' ? <View style={{ width: 15, height: 15, borderRadius: 4, backgroundColor: '#FFFFFF' }} /> : <VoiceBars level={level} />) : <LineIcon name={text ? 'send' : 'mic'} size={22} color="#FFFFFF" />}
      </PressScale>
      </View>
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      {demo ? (
        <Txt size={12.5} line={17} color={tokens.sub} style={{ paddingHorizontal: 10 }}>{tx('Im Testlink ist das Mikro gesperrt, darum spreche ich einen Beispielsatz. In der App hört es euch zu.', 'The test link can\'t use the microphone, so I say a sample sentence. The app listens to you.')}</Txt>
      ) : null}
      {input}
    </View>
  );
}
