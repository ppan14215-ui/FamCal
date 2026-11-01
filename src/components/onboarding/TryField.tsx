/**
 * The field of the two try-it steps: tap an example or type, then send. Examples first, so nobody
 * faces an empty field on the first launch (Bilbo, Gotcha in Julian's collection, 01.11.).
 */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Txt from '../ui/Txt';
import LineIcon from '../ui/LineIcon';
import PressScale from '../ui/PressScale';
import { tokens, fonts } from '../../theme';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';

export default function TryField({ examples, placeholder, onSend, busy }: { examples: string[]; placeholder: string; onSend: (text: string) => void; busy?: boolean }) {
  const [text, setText] = useState('');
  const send = (t = text) => { const s = t.trim(); if (!s || busy) return; haptics.select(); setText(''); onSend(s); };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 8 }}>
        <Txt size={13} color={tokens.sub}>{tx('Antippen zum Ausprobieren', 'Tap one to try')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {examples.map((e, i) => (
            <Animated.View key={e} entering={FadeInDown.duration(260).delay(200 + i * 70)}>
              <PressScale onPress={() => send(e)} style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
                <Txt size={14.5}>„{e}“</Txt>
              </PressScale>
            </Animated.View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, paddingLeft: 16, borderRadius: 28, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={tokens.mute}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          style={{ flex: 1, fontFamily: fonts[400], fontSize: 16, color: tokens.ink, paddingVertical: Platform.OS === 'web' ? 10 : 8 }}
        />
        <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={() => send()} style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? tokens.ink : tokens.chipBg }}>
          <LineIcon name="send" size={19} color={text.trim() ? tokens.onInk : tokens.mute} />
        </PressScale>
      </View>
    </View>
  );
}
