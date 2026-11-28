/**
 * "Hinzufügen …" row that turns into a text field in place; stays open for the next entry.
 *
 * `flat` (klar look, Julian 14.11.: "hinzufügen schaut komisch aus"): no white field. The row has the shape of a
 * list line, an empty circle and the text; what you write there becomes the line above and the row is empty again.
 */
import { setInlineEditing } from '../lib/keyboard';
import { tx } from '../i18n/lang';
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { tokens, fonts } from '../theme';
import PressScale from './ui/PressScale';

export default function AddInline({ placeholder, onAdd, mic, onPress, flat }: { placeholder: string; onAdd?: (t: string) => void; mic?: boolean; onPress?: () => void; flat?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim()) onAdd?.(text.trim());
    setText('');
  };
  if (flat) return (
    <PressScale
      scale={open ? 1 : 0.985}
      accessibilityLabel={open ? undefined : placeholder}
      onPress={onPress ?? (() => setOpen(true))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: open ? 6 : 10, paddingHorizontal: 2, backgroundColor: tokens.bg }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }}>
        {open ? null : <LineIcon name="plus" size={14} color={tokens.sub} stroke={2.2} />}
      </View>
      {open ? (
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          onFocus={() => setInlineEditing(true)}
          onBlur={() => { submit(); setOpen(false); setInlineEditing(false); }}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.select} cursorColor={tokens.ink}
          style={[{ flex: 1, minWidth: 0, fontFamily: fonts[500], fontSize: 16, color: tokens.ink, paddingVertical: 6 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
      ) : (
        <Txt size={16} color={tokens.mute} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{placeholder}</Txt>
      )}
      {open && text.trim() ? (
        <PressScale accessibilityLabel={tx('Hinzufügen', 'Add')} hitSlop={8} onPress={submit} style={{ height: 32, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }}>
          <Txt size={14} weight={600} color={tokens.onInk}>{tx('Hinzufügen', 'Add')}</Txt>
        </PressScale>
      ) : null}
      {mic ? <LineIcon name="mic" size={19} color={tokens.sub} /> : null}
    </PressScale>
  );
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
          onFocus={() => setInlineEditing(true)}
          onBlur={() => { submit(); setOpen(false); setInlineEditing(false); }}
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
      {open && text.trim() ? (
        <PressScale accessibilityLabel={tx('Hinzufügen', 'Add')} hitSlop={8} onPress={submit} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }}>
          <Txt size={14} weight={600} color={tokens.bg}>{tx('Hinzufügen', 'Add')}</Txt>
        </PressScale>
      ) : null}
      {mic ? <LineIcon name="mic" size={20} color={tokens.sub} /> : null}
    </PressScale>
  );
}
