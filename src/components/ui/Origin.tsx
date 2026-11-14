/**
 * Where a Termin came from (Julian 05.11.): a tiny mark on Termine that were not made in FamCal
 * but came in from the phone calendar. A small "G" for Google accounts, otherwise a neutral calendar.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './Txt';
import LineIcon from './LineIcon';
import { tokens } from '../../theme';
import { tx } from '../../i18n/lang';
import type { CalEvent } from '../../state/types';

export const isImported = (e: Pick<CalEvent, 'id'>) => e.id.startsWith('imp-');
export const isGoogle = (e: Pick<CalEvent, 'source'>) => !!e.source && e.source.startsWith('Google');

export default function Origin({ e, size = 14 }: { e: Pick<CalEvent, 'id' | 'source'>; size?: number }) {
  if (!isImported(e)) return null;
  const g = isGoogle(e);
  return (
    <View
      accessibilityLabel={g ? tx('Aus Google Kalender', 'From Google Calendar') : tx('Aus dem Handykalender', 'From the phone calendar')}
      style={{ width: size, height: size, borderRadius: 999, backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}
    >
      {g
        ? <Txt size={Math.round(size * 0.62)} line={Math.round(size * 0.8)} weight={700} color={tokens.sub}>G</Txt>
        : <LineIcon name="cal" size={Math.round(size * 0.66)} color={tokens.sub} />}
    </View>
  );
}
