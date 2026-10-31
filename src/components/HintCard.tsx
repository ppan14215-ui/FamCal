/**
 * The assistant noticing something ("Aufgefallen", "Neu im Kalender"). It only
 * asks; the parents confirm (HANDOFF: der Assistent handelt nie ungefragt).
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { Btn } from './ui/kit';
import { ClayIcon, Tile } from './ui/Clay';
import { tokens } from '../theme';
import type { ClayName } from '../lib/clayIcons';

type Props = { icon: ClayName; tile?: boolean; kicker: string; title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void };

export default function HintCard({ icon, tile, kicker, title, body, yes, no, onYes, onNo }: Props) {
  return (
    <Animated.View exiting={FadeOut.duration(180)} style={{ gap: 12, padding: 16, borderRadius: 22, backgroundColor: tokens.row }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {tile ? <Tile name={icon} size={44} radius={13} /> : <ClayIcon name={icon} size={44} />}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LineIcon name="sparkle" size={13} color={tokens.sub} />
            <Txt size={13} color={tokens.sub}>{kicker}</Txt>
          </View>
          <Txt size={16.5} line={22} weight={600}>{title}</Txt>
          <Txt size={14} line={20} color={tokens.sub}>{body}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 56 }}>
        <Btn label={yes} height={40} onPress={onYes} style={{ flex: 1, paddingHorizontal: 8 }} />
        <Btn label={no} height={40} primary={false} onPress={onNo} style={{ flex: 1, paddingHorizontal: 8 }} />
      </View>
    </Animated.View>
  );
}
