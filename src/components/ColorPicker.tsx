/**
 * A parent's colour (or later a photo): shown in onboarding and in the settings
 * (Julian 30.10.: "Meine eigene Farbe ändern auch. Die vom Partner ebenfalls").
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { Avatar } from './ui/Person';
import { Meta } from './ui/kit';
import { tokens, personPalette, shade } from '../theme';
import type { PersonId } from '../theme';
import { toast } from '../state/store';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

export default function ColorPicker({ p, name, sel, taken, onSel }: { p: PersonId; name: string; sel: number; taken: number; onSel: (i: number) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar p={p} size={28} />
        <Txt size={15} weight={600} style={{ flex: 1 }}>{name}</Txt>
        <Meta>{personPalette[sel].name}</Meta>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 2, flexWrap: 'wrap' }}>
        <PressScale onPress={() => toast(tx('Fotoauswahl kommt später', 'Photo picker comes later'))} style={{ width: 30, height: 30, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="camera" size={16} color={tokens.sub} />
        </PressScale>
        {personPalette.map(shade).map((c, i) => (
          <PressScale
            key={c.name}
            accessibilityLabel={c.name}
            accessibilityState={{ selected: i === sel, disabled: i === taken }}
            disabled={i === taken}
            scale={0.88}
            onPress={() => { haptics.select(); onSel(i); }}
            style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.bg, borderWidth: i === sel ? 2 : 0, borderColor: c.fg, opacity: i === taken ? 0.3 : 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {i === sel ? <LineIcon name="check" size={14} color={c.fg} stroke={2.4} /> : null}
          </PressScale>
        ))}
      </View>
    </View>
  );
}
