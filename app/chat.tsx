/**
 * Assistent · Chat. Labelled as AI (AI Act Art. 50) and only reads what the
 * family shares. Prototype: answers are scripted, no real model.
 */
import React, { useRef, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { RoundButton, Chip, Meta, Chevron } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { Tile } from '../src/components/ui/Clay';
import { Avatar } from '../src/components/ui/Person';
import { tokens, fonts } from '../src/theme';
import { toast } from '../src/state/store';
import { haptics } from '../src/lib/haptics';

type Msg = { id: number; me?: boolean; text?: string; kind?: 'u5' | 'wissen' };

function answer(q: string): string {
  const l = q.toLowerCase();
  if (l.includes('impf')) return 'Die ersten Impfungen sind am Mo 9. Nov um 10:20 bei Dr. Weber. Impfpass und U-Heft stehen schon auf der Mitnehmen-Liste.';
  if (l.includes('elterngeld')) return 'Für das Elterngeld fehlt noch die Arbeitgeberbescheinigung. Frist ist der 12. Dezember, Tom kümmert sich.';
  if (l.includes('morgen')) return 'Morgen, Freitag: Wochenmarkt um 11:00 mit Julia. Tom arbeitet bis 14 Uhr.';
  if (l.includes('einkauf') || l.includes('kaufen')) return 'Auf der Einkaufsliste stehen gerade Windeln Gr. 2, Wundcreme, Hafermilch, Brot und Kaffee.';
  return 'Im Prototyp antworte ich noch nicht frei. Probiert: „Wann sind die Impfungen?“ oder „Was steht morgen an?“';
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, me: true, text: 'Wann ist die U5?' },
    { id: 2, kind: 'u5' },
    { id: 3, me: true, text: 'Was weißt du über uns?' },
    { id: 4, kind: 'wissen' },
  ]);

  const push = (m: Omit<Msg, 'id'>) => setMsgs((xs) => [...xs, { ...m, id: Date.now() + Math.random() }]);
  const send = () => {
    const q = text.trim();
    if (!q) return;
    setText('');
    push({ me: true, text: q });
    setTimeout(() => { push({ text: answer(q) }); haptics.tap(); }, 600);
  };
  const pick = (w: string) => {
    if (picked) return;
    setPicked(w);
    haptics.select();
    push({ me: true, text: w === 'Später' ? 'Später' : `${w} ruft an.` });
    setTimeout(() => push({ text: w === 'Später' ? 'Gut, ich frage nächste Woche noch einmal.' : `Notiert. Ich erinnere ${w} am 14. März, wenn das Zeitfenster aufgeht.` }), 500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tokens.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundButton icon="back" label="Zurück" onPress={() => (router.canGoBack() ? router.back() : router.replace('/heute'))} />
        <View style={{ alignItems: 'center' }}>
          <Txt size={16} weight={600}>Assistent</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <LineIcon name="sparkle" size={12} color={tokens.sub} />
            <Txt size={12} color={tokens.sub}>KI, liest nur, was ihr teilt</Txt>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 18, gap: 10 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {msgs.map((m) => (
          <Animated.View key={m.id} entering={m.id > 10 ? FadeInUp.duration(200) : undefined} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            {m.kind === 'u5' ? (
              <View style={{ padding: 12, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: tokens.row, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Tile name="u-heft" size={44} radius={14} />
                  <View>
                    <Txt size={16} weight={600}>U5 · 6. bis 7. Monat</Txt>
                    <Meta>14. März bis 14. April 2027</Meta>
                  </View>
                </View>
                <Txt size={15.5} line={22}>Ich trage das Zeitfenster ein und erinnere euch zum Start. Wer ruft bei Dr. Weber an?</Txt>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Chip icon={<Avatar p="J" size={18} />} bg={picked === 'Julia' ? tokens.doneSoft : tokens.chipBg} onPress={() => pick('Julia')}>Julia</Chip>
                  <Chip icon={<Avatar p="T" size={18} />} bg={picked === 'Tom' ? tokens.doneSoft : tokens.chipBg} onPress={() => pick('Tom')}>Tom</Chip>
                  <Chip bg={picked === 'Später' ? tokens.doneSoft : tokens.chipBg} onPress={() => pick('Später')}>Später</Chip>
                </View>
              </View>
            ) : m.kind === 'wissen' ? (
              <Pressable onPress={() => router.push('/wissen')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: tokens.row }}>
                <Txt size={15.5} line={22} style={{ flex: 1 }}>Alles, was ich weiß, steht hier. Ihr könnt jeden Punkt ändern oder löschen.</Txt>
                <Chevron />
              </Pressable>
            ) : (
              <View style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: 20, backgroundColor: m.me ? '#E9ECEB' : tokens.row, borderBottomRightRadius: m.me ? 6 : 20, borderBottomLeftRadius: m.me ? 20 : 6 }}>
                <Txt size={15.5} line={22}>{m.text}</Txt>
              </View>
            )}
          </Animated.View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 16, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            placeholder="Frag oder sag, was ansteht …"
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.ink}
            returnKeyType="send"
            style={[{ flex: 1, fontFamily: fonts[400], fontSize: 15.5, color: tokens.ink, paddingVertical: 8 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
          <Pressable accessibilityLabel="Foto" onPress={() => router.push('/foto-kamera')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <LineIcon name="camera" size={20} color={tokens.sub} />
          </Pressable>
          <Pressable
            accessibilityLabel={text ? 'Senden' : 'Sprachnotiz'}
            onPress={text ? send : () => toast('Sprachnotiz kommt später')}
            style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}
          >
            <LineIcon name={text ? 'send' : 'mic'} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
