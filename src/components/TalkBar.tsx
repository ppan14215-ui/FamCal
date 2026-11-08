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
import { voiceLevel, setBuddy } from '../lib/buddy';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import VoiceBars from './VoiceBars';
import VoiceRing from './VoiceRing';
import VoiceWaves from './VoiceWaves';
import { useMicStyle } from '../lib/micStyle';
import Animated, { useSharedValue, withTiming, LinearTransition, FadeIn, FadeOut, Easing } from 'react-native-reanimated';
// Julian 04.11.: the input moves between its states like the Claude app (ease-out, under 300 ms).
const MORPH = LinearTransition.duration(240).easing(Easing.bezier(0.23, 1, 0.32, 1));
const SHOW = FadeIn.duration(180);
const HIDE = FadeOut.duration(120);
import { tokens, fonts } from '../theme';
import { haptics } from '../lib/haptics';
import { setTyping } from '../lib/keyboard';
import { LIVE } from '../lib/live';
import { usePrefill, takeFill } from '../lib/simple';
import { tx } from '../i18n/lang';
import { toast } from '../state/store';
import { hearInCloud, cloudOn, cloudCapped } from '../lib/hoeren';
import { track } from '../lib/analytics';
import { speechLocale, speechLang } from '../lib/speechLang';
import { setSpeak, getSpeak, speakHandlers } from '../lib/speak';

/** The cloud ears' day cap is said once per app launch. */
let toldCap = false;
/** The last listen request a bar acted on, shared by every bar (only one Dock), so a remount never replays it. */
let handledListen = 0;

// Phones and tablets: Enter on the screen keyboard adds a line.
const TOUCH = Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);

/**
 * Julian 31.10. 12:55: "Start und Stop sollten per Klick vom User gestartet und gestoppt werden wie bei Claude".
 * A tap starts, a second tap stops; no pause detection any more (it kept cutting sentences off).
 * Only a long safety cap ends a recording nobody stops, so a forgotten mic cannot run on.
 */
const MAX_MS = 3 * 60000;
// Android ends on silence by itself unless told to wait; give it the same cap.
const ANDROID_SILENCE_MS = MAX_MS;

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

// A real soft shadow on Android too (Julian 30.10.: "sehr flach"); elevation alone draws a hard grey edge.
const lift = { boxShadow: '0 10px 28px rgba(22,35,42,0.14), 0 2px 6px rgba(22,35,42,0.06)' } as any;

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
  /** Changing it puts the cursor in the field ("Anders …" on a card, Julian 29.10.). */
  focusKey?: number;
  /** On the tabs (Julian 28.10.): a clear way back. The × sits on the left, the + moves next to the mic. */
  onClose?: () => void;
  /**
   * Like Claude and ChatGPT (Julian 29.10.: "klare Trennung"): plus on the left,
   * the text, a grey mic, and a send arrow only once there is text.
   */
  split?: boolean;
  /** Julian 04.11.: laid out like the Claude app input, text on top, plus left, mic and send right. */
  card?: boolean;
  /** Julian 04.11.: sits inside the dark one bar at rest; turns into the light block once you type. */
  dark?: boolean;
  /** Called when the field is left empty and nothing is listening (one bar folds back to its icon). */
  onIdle?: () => void;
  /** Called when the mic starts or text arrives (one bar: the input takes the whole width). */
  onBusy?: () => void;
  /** Julian 08.11.: speaking turns the bar into the Sprechkarte (SpeakCard in the Dock) instead of a wave in the field. */
  speakCard?: boolean;
};

// Listeners of the last recording, shared by every TalkBar: the phone has one recognizer, and a bar that was swapped
// for a new one (the onboarding makes a new one per sentence) must not leave its listeners on it (Julian 05.11. 23:28).
const lastSubs = { current: [] as { remove: () => void }[] };

export default function TalkBar({ onSend, onPlus, spoken, listenKey, focusKey, onClose, split, card, dark, onIdle, onBusy, speakCard, placeholder = tx('Sag oder schreib, was ansteht …', 'Say or type what\'s coming up …') }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const textRef = useRef(''); textRef.current = text;
  const listeningRef = useRef(false); listeningRef.current = listening;
  // Memo grows and wobbles with the voice while the mic is on (Julian 07.11.).
  useEffect(() => { if (listening) { setBuddy({ listening: true }); return () => setBuddy({ listening: false }); } }, [listening]);
  const listenAt = useRef(0);
  /** How loud the voice is right now, 0 to 1; drives the bars in the mic. */
  const level = voiceLevel;
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
  /** The field holds spoken text; sending it counts as voice, so a follow-up may listen again. */
  const spokenText = useRef(false);
  /** ElevenLabs is writing the sentence down. */
  const [writing, setWriting] = useState(false);
  // Julian 31.10. 15:42: that grey guess was the phone's English and jumped to German at the end. With the cloud ears on
  // the field shows only a wave while listening (like Claude); the text appears once, correct.
  const [wavy, setWavy] = useState(false);
  // A bar that goes away while it still listens frees the recognizer, so the next bar starts on an idle one.
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(blurT.current); setTyping(false); if (listeningRef.current) toKeys.current?.(); }, []);

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

  const send = (t = text, voice = spokenText.current) => {
    const q = t.trim();
    if (!q) return;
    spokenText.current = false;
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
      else timers.current.push(setTimeout(() => { setListening(false); setDemo(false); land(sentence); }, 500));
    };
    timers.current.push(setTimeout(step, 700));
  };

  // Julian 31.10.: spoken words never send by themselves. They land in the field, correct, and only Senden sends.
  // Julian 01.11.: like Claude, a send button next to the check while recording. It finishes and sends what was heard.
  const sendAfter = useRef(false);
  /** The Sprechkarte holds the spoken sentence until Senden (or Ändern hands it to the field). */
  const held = useRef(false);
  const land = (t: string) => {
    // A question in the card may take the answer itself (a time for "Um wie viel Uhr?").
    const a = speakCard ? getSpeak().ask : null;
    if (a?.onSpoken && t.trim() && a.onSpoken(t.trim())) { sendAfter.current = false; held.current = false; setText(''); return; }
    if (sendAfter.current && t.trim()) { sendAfter.current = false; held.current = false; send(t, true); return; }
    sendAfter.current = false;
    setText(t.trim()); spokenText.current = true;
    if (speakCard) held.current = true;
  };
  const finishAndSend = () => { if (!listening) return send(); sendAfter.current = true; listen(); };

  // The Sprechkarte shows what happens: listening, writing it down, the sentence ready to send.
  useEffect(() => {
    if (!speakCard) return;
    const ph = getSpeak().phase;
    if (listening) setSpeak({ phase: 'listen', text: '' });
    else if (writing) setSpeak({ phase: 'write' });
    else if (held.current && text.trim()) setSpeak({ phase: 'text', text: text.trim() });
    else if (ph === 'listen' || ph === 'write' || ph === 'text') setSpeak({ phase: 'idle', text: '' });
  }, [listening, writing, text, speakCard]);
  useEffect(() => () => { if (speakCard) setSpeak({ phase: 'idle', text: '', ask: null }); }, [speakCard]);

  // One bar: speaking or text makes the input the whole bar; a mic that stops with nothing said folds it back.
  const busy = listening || !!text;
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current === busy) return;
    wasBusy.current = busy;
    if (busy) onBusy?.();
    else if (onIdle && !field.current?.isFocused()) onIdle();
  }, [busy]);
  const listen = () => {
    if (listening) { haptics.tap(); stopNative.current?.(); return; }
    typed.current = false;
    sendAfter.current = false;
    haptics.select();
    setListening(true);
    listenAt.current = Date.now();
    track('voice_started', { screen: 'talkbar' });
    const sentence = spoken[turn.current++ % spoken.length];
    if (Platform.OS !== 'web') return listenNative(sentence);
    const SR = (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition;
    if (!SR) return say(sentence);
    try {
      const r = new SR();
      r.lang = speechLocale();
      r.interimResults = true;
      r.continuous = true;
      let heard = '';
      let failed = false;
      const fallback = () => { if (failed) return; failed = true; try { r.abort(); } catch {} say(sentence); };
      // Blocked or silent mics often never answer, so wait at most 3 seconds for a first word.
      const guard = setTimeout(() => { if (!heard) fallback(); }, 3000);
      timers.current.push(guard);
      r.onresult = (e: any) => { heard = Array.from(e.results).map((x: any) => x[0].transcript).join(' '); setText(heard); };
      r.onerror = () => { clearTimeout(guard); fallback(); };
      r.onend = () => { clearTimeout(guard); if (failed) return; setListening(false); if (typed.current) return; if (heard) land(heard); else fallback(); };
      toKeys.current = () => { failed = true; clearTimeout(guard); try { r.abort(); } catch {} setListening(false); };
      stopNative.current = () => { const h = heard; toKeys.current?.(); if (h) land(h); };
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
      // Julian 31.10. 18:25: still every second try failed, and no recording reached the server. The phone kept the
      // last session open after the file came, so the next start hit a busy recognizer. Clear the old listeners and
      // make sure the recognizer is idle before a new start.
      lastSubs.current.forEach((x) => x.remove()); lastSubs.current = [];
      const idle = async () => {
        for (let i = 0; i < 10; i++) {
          let st = 'inactive';
          try { st = String(await SR.getStateAsync()); } catch {}
          if (st === 'inactive') return;
          if (i === 0) { try { SR.abort(); } catch {} }
          await new Promise((r) => setTimeout(r, 100));
        }
      };
      await idle();
      // Let the person finish (Julian 28.10.: "wartet nicht lange genug"): listen
      // on through short pauses and stop only after a longer silence or a second tap.
      let done = '';
      let part = '';
      let quiet: ReturnType<typeof setTimeout> | undefined;
      const heard = () => `${done} ${part}`.replace(/\s+/g, ' ').trim();
      // The recording the phone keeps (Android 13 and newer); ElevenLabs then writes the final text in the language it hears.
      let audio: string | null = null;
      let peak = -2;
      let audioDone: (() => void) | null = null;
      // A long sentence takes the phone a moment to close the file (31.10. 12:42 a voice note missed the cloud ears after 1.5 s and fell back to the phone's English guess); the wait ends the moment the file is there.
      const audioReady = new Promise<void>((r) => { audioDone = r; setTimeout(r, 5000); });
      const cloud = cloudOn();
      setWavy(cloud);
      // One finish per recording, shared by the stop tap, the error and the end event. Julian 31.10. 16:10: every second
      // try failed: Android sends an error after a stop BEFORE the recording file; the second caller got an empty
      // promise, removed all listeners at once, and the file (audioend) arrived with nobody listening.
      let finishing: Promise<void> | null = null;
      const finish = () => (finishing ??= finishNow());
      const finishNow = async () => {
        if (typed.current) return;
        setWriting(true);
        await audioReady;
        // The phone's guess may be empty when it heard the wrong language; the recording still goes to the cloud ears.
        // The file is here: close the session for good, so the next tap starts on an idle recognizer.
        try { if (String(await SR.getStateAsync()) !== 'inactive') SR.abort(); } catch {}
        const better = audio && (heard() || cloud) ? await hearInCloud(audio, speechLang(), peak) : null;
        setWriting(false);
        if (typed.current) return;
        // Julian 31.10. 15:20: "Lokale Handy-Erkennung ist offensichtlich nicht gut genug". With the cloud ears on, the
        // phone's guess (one language, often wrong English) never lands; a miss says so and asks to speak again.
        const ms = listenAt.current ? Date.now() - listenAt.current : undefined;
        if (cloud) {
          track('voice_transcribed', { ok: !!better, engine: 'cloud', ms });
          if (better) land(better);
          // The cloud ears missed it but the phone heard words (it listens in the family's language): those land, ready to
          // check, instead of throwing the sentence away (Julian 08.11.: "every second time it doesn't take it").
          else if (heard() && !cloudCapped()) land(heard());
          else if (cloudCapped() && heard()) {
            // Day cap of the cloud ears: the phone's own words land, said once (Julian 05.11. 22:15).
            land(heard());
            if (!toldCap) { toldCap = true; toast(tx('Für heute nutze ich die Spracherkennung vom Handy. Bitte kurz prüfen, was ankommt.', 'For today I use the phone’s own speech recognition. Please check what comes through.'), undefined, { kind: 'info' }); }
          }
          else { sendAfter.current = false; setText(''); haptics.tap(); toast(tx('Die Aufnahme kam nicht an. Tipp aufs Mikro und sag es bitte nochmal.', 'The recording didn\'t come through. Tap the mic and say it again.'), undefined, { kind: 'warn' }); }
          return;
        }
        const t = heard();
        track('voice_transcribed', { ok: !!t, engine: 'phone', ms });
        if (t) land(t); else fail();
      };
      const hush = (ms: number) => { clearTimeout(quiet); quiet = setTimeout(() => SR.stop(), ms); };
      const subs = [
        SR.addListener('result', (e) => {
          const t = e.results[0]?.transcript ?? '';
          if (e.isFinal) { done = `${done} ${t}`; part = ''; } else part = t;
          // The phone hears in one language only, so its live guess is often wrong English (Julian 31.10.). With the cloud ears on it never shows.
          if (!cloud) setText(heard());
        }),
        // -2 to 10 from the phone; below 0 is inaudible.
        SR.addListener('volumechange', (e) => { if (e.value > peak) peak = e.value; level.value = withTiming(Math.min(1, Math.max(0, e.value / 10)), { duration: 100 }); }),
        // Android can end a long recording with an error (no-speech, network) although the file is there (31.10. 14:16 a
        // voice note skipped the cloud ears). Keep listening for the file and finish like a normal stop.
        SR.addListener('error', () => { clearTimeout(quiet); setListening(false); void finish().finally(() => subs.forEach((x) => x.remove())); }),
        // A second teardown can send audioend again without a file; keep the first real one.
        SR.addListener('audioend', (e) => { if (e.uri) { audio = e.uri; audioDone?.(); } }),
        SR.addListener('end', () => { clearTimeout(quiet); setListening(false); void finish().finally(() => subs.forEach((x) => x.remove())); }),
      ];
      lastSubs.current = subs;
      // A tap on the mic ends at once (Julian 28.10.): keep what was heard and put it in the field, no waiting for the phone to finish.
      // stop, not abort, so the recording is finished and can go to the cloud ears.
      stopNative.current = () => {
        clearTimeout(quiet); SR.stop(); setListening(false);
        // Android sometimes never closes a segmented session after stop, so the file never comes (Julian 31.10. 17:02,
        // still errors). abort() tears down and hands over the recording right away; the cloud writes the words anyway.
        setTimeout(() => { if (!audio) { try { SR.abort(); } catch {} } }, 1200);
        void finish();
      };
      toKeys.current = () => { clearTimeout(quiet); SR.abort(); setListening(false); };
      // Only the user stops it; the cap is a safety net, not a pause guess.
      hush(MAX_MS);
      SR.start({
        lang: speechLocale(), interimResults: true, continuous: true, addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: ANDROID_SILENCE_MS, EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: ANDROID_SILENCE_MS },
        recordingOptions: { persist: true },
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
  useEffect(() => { if (focusKey) field.current?.focus(); }, [focusKey]);
  // An example from the plus sheet lands in the field, ready to change (Julian 30.10.).
  const fill = usePrefill();
  useEffect(() => { if (!takeFill(fill.n)) return; setText(fill.text); setTimeout(() => field.current?.focus(), 250); }, [fill.n]);
  // Each listen request starts the mic once. Julian 08.11.: "every second recording fails again": since a Memo tap
  // also bumps the key, a bar that was rebuilt (another tab, the bar folding) saw the old key on mount and switched the
  // mic on by itself; the next tap on the mic then stopped that empty recording. Only a key newer than the last one counts.
  useEffect(() => {
    if (!listenKey || listenKey <= handledListen) return;
    handledListen = listenKey;
    if (listening || text.trim()) return;
    listen();
  }, [listenKey]);

  if (speakCard) {
    speakHandlers.stop = () => { if (listeningRef.current) listen(); };
    speakHandlers.again = () => { held.current = false; setText(''); listen(); };
    speakHandlers.send = () => { held.current = false; finishAndSend(); };
    speakHandlers.cancel = () => {
      held.current = false; sendAfter.current = false;
      if (listeningRef.current || writing) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); setWriting(false); }
      setText('');
      const a = getSpeak().ask;
      setSpeak({ phase: 'idle', text: '', ask: a?.hold ? null : a });
    };
    speakHandlers.edit = () => { held.current = false; setSpeak({ phase: 'idle' }); setTimeout(() => field.current?.focus(), 300); };
  }

  const plus = (
    <PressScale accessibilityLabel={tx('Foto, Termin, Aufgabe', 'Photo, event, task')} onPress={() => { if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); setText(''); } onPlus?.(); }} style={{ width: split ? 36 : 44, height: split ? 36 : 44, marginBottom: split ? 6 : 2, marginLeft: split ? 4 : 0, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
      {/* Julian 30.10. 22:15: not black, a plain line icon like the mic; the dark bar below is the one dark thing. */}
      <LineIcon name="plus" size={24} color={dark && !text && !listening ? tokens.onInk : tokens.ink} stroke={2} />
    </PressScale>
  );

  const fieldBox = (
      <View style={card ? { alignSelf: 'stretch' } : { flex: 1, minWidth: 0 }}>
      <TextInput
        ref={field}
        onFocus={() => {
          clearTimeout(blurT.current); setTyping(true);
          if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); }
        }}
        // Tapping send blurs the field first; wait so the button does not move away under the finger.
        onBlur={() => { blurT.current = setTimeout(() => { setTyping(false); if (onIdle && !textRef.current.trim() && !listeningRef.current) onIdle(); }, 350); }}
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
        placeholder={writing ? tx('Schreibe auf …', 'Writing it down …') : listening && wavy ? '' : listening ? tx('Ich höre zu … Tippe ✓ wenn fertig', 'Listening … Tap ✓ when done') : placeholder}
        placeholderTextColor={dark ? 'rgba(255,255,255,0.55)' : tokens.mute}
        selectionColor={tokens.select} cursorColor={card && dark ? tokens.onInk : tokens.ink}
        returnKeyType={TOUCH ? 'default' : 'send'}
        accessibilityLabel={tx('Was steht an?', 'What\'s on?')}
        style={[{ width: '100%', height: boxH, marginBottom: card && !text ? 0 : 2, fontFamily: fonts[400], fontSize: split ? 16 : 16.5, lineHeight: LINE, color: card && dark ? tokens.onInk : tokens.ink, paddingVertical: PAD, paddingHorizontal: split ? 3 : 8, textAlignVertical: 'top', includeFontPadding: false }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
      {listening && wavy ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: split ? 3 : 8, right: 6, top: 0, bottom: 2, justifyContent: 'center' }}>
          <VoiceWaves level={level} color={card && dark ? tokens.onInk : undefined} />
        </View>
      ) : null}
      </View>
  );

  // Julian 04.11.: like the Claude app. At rest (and while the waves run) one line: plus, field, mic, send.
  // With text it grows into the card with the buttons below. The check sits where the mic was, in the same style.
  const one = !text;
  // Julian 05.11.: in the one bar the card sits inside the dark shape, so it draws light on dark and no box of its own.
  const dk = !!dark;
  const cInk = dk ? tokens.onInk : tokens.ink;
  const cardPlus = (
    <PressScale accessibilityLabel={tx('Foto, Termin, Aufgabe', 'Photo, event, task')} onPress={() => { if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); setText(''); } onPlus?.(); }} style={{ width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: dk ? 'rgba(255,255,255,0.22)' : tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
      <LineIcon name="plus" size={18} color={cInk} stroke={2} />
    </PressScale>
  );
  const cardMic = (
    <PressScale accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : tx('Sprechen', 'Speak')} onPress={listen} style={{ width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
      {listening ? <LineIcon name="check" size={21} color={cInk} stroke={2.4} /> : <LineIcon name="mic" size={20} color={cInk} />}
    </PressScale>
  );
  const live = !!text.trim() || listening;
  const cardSend = (
    <PressScale accessibilityLabel={tx('Senden', 'Send')} disabled={!live} onPress={finishAndSend} style={{ width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: live ? (dk ? tokens.onInk : tokens.ink) : dk ? 'rgba(255,255,255,0.12)' : tokens.chipBg }}>
      <LineIcon name="send" size={17} color={live ? (dk ? tokens.ink : tokens.onInk) : dk ? 'rgba(255,255,255,0.5)' : tokens.mute} />
    </PressScale>
  );
  // One parent with keyed children, so the field is not remounted (and the keyboard stays) when the first letter turns the line into the card.
  const cardInput = (
    <Animated.View layout={MORPH} style={[one
      ? { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 26, paddingVertical: 4, paddingHorizontal: 8 }
      : { flexDirection: 'column', borderRadius: 24, paddingTop: 6, paddingHorizontal: 10, paddingBottom: 8, gap: 4 },
      dk ? { borderWidth: 1, borderColor: 'transparent' } : [{ backgroundColor: tokens.row, borderWidth: 1, borderColor: listening ? tokens.ink : tokens.hair }, lift]]}>
      {one ? <Animated.View key="p" layout={MORPH} entering={SHOW} exiting={HIDE}>{cardPlus}</Animated.View> : null}
      <Animated.View key="f" layout={MORPH} style={one ? { flex: 1, minWidth: 0 } : { alignSelf: 'stretch' }}>{fieldBox}</Animated.View>
      {one ? <Animated.View key="m" layout={MORPH} entering={SHOW} exiting={HIDE} style={{ flexDirection: 'row', gap: 6 }}>{cardMic}{cardSend}</Animated.View> : null}
      {one ? null : (
        <Animated.View key="r" layout={MORPH} entering={SHOW} exiting={HIDE} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {cardPlus}
          <View style={{ flex: 1 }} />
          {cardMic}
          {cardSend}
        </Animated.View>
      )}
    </Animated.View>
  );

  const input = (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 6, paddingLeft: 6, borderRadius: boxH > MIN_H ? 26 : 30, backgroundColor: dark && !text && !listening ? 'transparent' : tokens.row, borderWidth: 1, borderColor: dark && !text && !listening ? 'transparent' : listening ? tokens.ink : tokens.hair }, dark && !text && !listening ? null : lift]}>
      {onClose ? (
        <PressScale accessibilityLabel={tx('Schließen, zurück zu den Tabs', 'Close, back to the tabs')} hitSlop={6} onPress={() => { if (listening) { typed.current = true; timers.current.forEach(clearTimeout); setDemo(false); toKeys.current?.(); } setText(''); field.current?.blur(); haptics.select(); onClose(); }} style={{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
          <LineIcon name="x" size={20} color={tokens.ink} stroke={2} />
        </PressScale>
      ) : <View style={dark && !text && !listening ? { width: 0, overflow: 'hidden' } : null}>{plus}</View>}
      {fieldBox}
      {/* Plus stays reachable while the mic listens (Julian 28.10.: "wie komme ich an das + Menü?"). */}
      {onClose && (!text || listening) ? plus : null}
      {split ? (
        <>
          <PressScale
            accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : tx('Sprechen', 'Speak')}
            onPress={listen}
            style={{ width: 36, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Julian 31.10. 12:55: a clear button to finish, like Claude. 01.11.: a check, not a stop square, since it keeps what was said. */}
            {listening ? <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}><LineIcon name="check" size={19} color={tokens.onInk} stroke={2.4} /></View> : <LineIcon name="mic" size={22} color={dark && !text ? tokens.onInk : tokens.ink} />}
          </PressScale>
          {(text && !listening) || listening ? (
            <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={finishAndSend} style={{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }}>
              <LineIcon name="send" size={20} color={tokens.onInk} />
            </PressScale>
          ) : null}
        </>
      ) : (
      <>
      {listening ? (
        <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={finishAndSend} style={{ width: 44, height: 44, marginBottom: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
          <LineIcon name="send" size={20} color={tokens.ink} />
        </PressScale>
      ) : null}
      <View style={{ width: 48, height: 48 }}>
      {listening && micStyle === 'ring' ? <VoiceRing level={level} /> : null}
      <PressScale
        accessibilityLabel={listening ? tx('Fertig gesprochen', 'Done speaking') : text ? tx('Senden', 'Send') : tx('Sprechen', 'Speak')}
        onPress={text && !listening ? () => send() : listen}
        style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}
      >
        {listening ? (micStyle === 'ring' ? <LineIcon name="check" size={22} color={tokens.onInk} stroke={2.4} /> : <VoiceBars level={level} />) : <LineIcon name={text ? 'send' : 'mic'} size={22} color={tokens.onInk} />}
      </PressScale>
      </View>
      </>
      )}
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      {demo ? (
        <Txt size={12.5} line={17} color={tokens.sub} style={{ paddingHorizontal: 10 }}>{tx('Im Testlink ist das Mikro gesperrt, darum spreche ich einen Beispielsatz. In der App hört es euch zu.', 'The test link can\'t use the microphone, so I say a sample sentence. The app listens to you.')}</Txt>
      ) : null}
      {card ? cardInput : input}
    </View>
  );
}
