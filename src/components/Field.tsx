/** Labelled input on a white surface (onboarding, new list, new event title). */
import React from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import { tokens, fonts } from '../theme';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export function Field({ label, value, onChangeText, right, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; right?: React.ReactNode; placeholder?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={13} color={tokens.sub}>{label}</Txt>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.ink}
          style={[{ fontFamily: fonts[600], fontSize: 18, color: tokens.ink, padding: 0 }, noOutline]}
        />
      </View>
      {right}
    </View>
  );
}

/** Big title input ("Kliniktasche", "U5 bei Dr. Weber") with a sub line. */
export function TitleInput({ value, onChangeText, sub, placeholder }: { value: string; onChangeText: (t: string) => void; sub?: string; placeholder?: string }) {
  return (
    <View style={{ gap: 4, paddingTop: 6, paddingHorizontal: 2, flex: 1 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.mute}
        selectionColor={tokens.ink}
        style={[{ fontFamily: fonts[700], fontSize: 30, letterSpacing: -0.9, color: tokens.ink, padding: 0 }, noOutline]}
      />
      {sub ? <Txt size={14} color={tokens.sub}>{sub}</Txt> : null}
    </View>
  );
}

export function TextArea({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={{ gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: tokens.row }}>
      <Txt size={13} color={tokens.sub}>{label}</Txt>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        selectionColor={tokens.ink}
        style={[{ fontFamily: fonts[400], fontSize: 16, lineHeight: 23, color: tokens.ink, padding: 0, minHeight: 69, textAlignVertical: 'top' }, noOutline]}
      />
    </View>
  );
}
