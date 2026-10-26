/**
 * Sprechen oder schreiben (Pivot 26.10.): the field at the bottom of Heute,
 * with photo, text and mic like a chat app. The mic
 * uses the browser's speech recognition where it is allowed; in the testlink
 * that is blocked, so it says an example sentence and marks it as one.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform, ScrollView } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { Chip } from './ui/kit';
import Orb from './Orb';
import { tokens, fonts } from '../theme';
import { haptics } from '../lib/haptics';

const lift = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(22,35,42,.10)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
});

/** What the mic says in the testlink, one after the other. */
const SPOKEN = [
  'Erstelle mir einen Termin für Freitag bei meinem Kinderarzt',
  'Samstag 10 Uhr Babyschwimmen, Tom geht mit Ben',
  'Wann haben wir beide frei?',
];
/** Short enough to read at a glance above the field. */
const EXAMPLES = ['Freitag zum Kinderarzt', 'Julia hat Fr 15 Uhr Zahnarzt', 'Wann haben wir frei?', 'Was ist am Wochenende?'];

export default function TalkBar({ onSend, onPhoto, suggestions = EXAMPLES, placeholder = 'Sag oder schreib, was ansteht …' }: { onSend: (text: string) => void; onPhoto?: () => void; suggestions?: string[]; placeholder?: string }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [demo, setDemo] = useState(false);
  const turn = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = (t = text) => {
    const q = t.trim();
    if (!q) return;
    setText('');
    haptics.tap();
    onSend(q);
  };

  // Types the sentence letter by letter, as if it were heard, then sends it.
  const say = (sentence: string) => {
    setDemo(true);
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
    if (listening) return;
    haptics.select();
    setListening(true);
    const sentence = SPOKEN[turn.current++ % SPOKEN.length];
    const SR = Platform.OS === 'web' ? ((globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition) : null;
    if (!SR) return say(sentence);
    try {
      const r = new SR();
      r.lang = 'de-DE';
      r.interimResults = true;
      let heard = '';
      let failed = false;
      const fallback = () => { if (failed) return; failed = true; try { r.abort(); } catch {} say(sentence); };
      // Blocked or silent mics often never answer, so wait at most 3 seconds for a first word.
      const guard = setTimeout(() => { if (!heard) fallback(); }, 3000);
      timers.current.push(guard);
      r.onresult = (e: any) => { heard = Array.from(e.results).map((x: any) => x[0].transcript).join(' '); setText(heard); };
      r.onerror = () => { clearTimeout(guard); fallback(); };
      r.onend = () => { clearTimeout(guard); if (failed) return; setListening(false); if (heard) send(heard); else fallback(); };
      r.start();
    } catch {
      say(sentence);
    }
  };

  const input = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, paddingLeft: 6, borderRadius: 30, backgroundColor: tokens.row, borderWidth: 1, borderColor: listening ? tokens.ink : tokens.hair }, lift]}>
      <PressScale accessibilityLabel="Foto" onPress={onPhoto} style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
        <LineIcon name="camera" size={21} color={tokens.ink} />
      </PressScale>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => send()}
        editable={!demo}
        placeholder={listening ? 'Ich höre zu …' : placeholder}
        placeholderTextColor={tokens.mute}
        selectionColor={tokens.ink}
        returnKeyType="send"
        accessibilityLabel="Was steht an?"
        style={[{ flex: 1, minWidth: 0, fontFamily: fonts[400], fontSize: 16.5, color: tokens.ink, paddingVertical: 11, paddingHorizontal: 8 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
      <PressScale
        accessibilityLabel={text && !listening ? 'Senden' : 'Sprechen'}
        onPress={text && !listening ? () => send() : listen}
        style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: listening ? 'transparent' : tokens.ink, alignItems: 'center', justifyContent: 'center' }}
      >
        {listening ? <Orb size={48} speed={2} /> : <LineIcon name={text ? 'send' : 'mic'} size={22} color="#FFFFFF" />}
      </PressScale>
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      {demo ? (
        <Txt size={12.5} line={17} color={tokens.sub} style={{ paddingHorizontal: 10 }}>Im Testlink ist das Mikro gesperrt, darum spreche ich einen Beispielsatz. In der App hört es euch zu.</Txt>
      ) : suggestions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
          {suggestions.map((s) => (
            <Chip key={s} onPress={() => send(s)}>{`„${s}“`}</Chip>
          ))}
        </ScrollView>
      ) : null}
      {input}
    </View>
  );
}
