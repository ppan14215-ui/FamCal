/** "Quelle: stadt-koeln.de": where something the assistant added comes from. */
import React from 'react';
import { Linking } from 'react-native';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { Meta } from './ui/kit';
import { tokens } from '../theme';

export default function SourceLink({ s, prefix = 'Quelle' }: { s: { label: string; url?: string }; prefix?: string }) {
  return (
    <PressScale scale={0.96} onPress={s.url ? () => Linking.openURL(s.url!) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingTop: 2 }}>
      <LineIcon name="sparkle" size={12} color={tokens.done} />
      <Meta color={tokens.done}>{/^aus\b/i.test(s.label) ? s.label : `${prefix}: ${s.label}`}</Meta>
    </PressScale>
  );
}
