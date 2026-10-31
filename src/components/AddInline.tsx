/** "Hinzufügen …" row that turns into a text field in place; stays open for the next entry. */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { tokens, fonts } from '../theme';
import PressScale from './ui/PressScale';

export default function AddInline({ placeholder, onAdd, mic, onPress }: { placeholder: string; onAdd?: (t: string) => void; mic?: boolean; onPress?: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim()) onAdd?.(text.trim());
    setText('');
  };
  return (
    <PressScale
      onPress={onPress ?? (() => setOpen(true))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tokens.row, borderWidth: open ? 1.5 : 0, borderColor: tokens.ink }}
    >
      <LineIcon name="plus" size={20} color={tokens.sub} />
      {open ? (
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          onBlur={() => { submit(); setOpen(false); }}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.select} cursorColor={tokens.ink}
          style={[{ flex: 1, fontFamily: fonts[500], fontSize: 16, color: tokens.ink, paddingVertical: 12 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
      ) : (
        <View style={{ flex: 1, paddingVertical: 12 }}>
          <Txt size={16} color={tokens.mute}>{placeholder}</Txt>
        </View>
      )}
      {mic ? <LineIcon name="mic" size={20} color={tokens.sub} /> : null}
    </PressScale>
  );
}
