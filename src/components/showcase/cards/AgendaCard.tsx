/**
 * "Was steht die nächsten Tage an?" as a card: Memo's answer on top, then the Termine grouped by day,
 * each row with who goes, the time and the title (rows as in Dock's AnswerCard), and a quiet footer
 * ("3 Tage · 9 Termine"). Pure view: no taps, no store; the caller hands in the days.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from '../../ui/Txt';
import { Owner } from '../../ui/Person';
import { Reply, cardFrame } from '../../ChatCards';
import { tokens } from '../../../theme';
import { hm, short, addDays, TODAY } from '../../../lib/dates';
import type { CalEvent } from '../../../state/types';
import { tx } from '../../../i18n/lang';

export type AgendaDay = { date: string; events: CalEvent[] };

/** "Heute", "Morgen", else "Mi. 4. Nov." (relative to `today`, so the demo works on any day). */
export const agendaDay = (d: string, today = TODAY) => (d === today ? tx('Heute', 'Today') : d === addDays(today, 1) ? tx('Morgen', 'Tomorrow') : short(d));

/** Days `0..n-1` from `today` with their Termine in time order (work blocks and holidays left out). */
export function agendaDays(events: CalEvent[], n = 3, today = TODAY): AgendaDay[] {
  return Array.from({ length: n }, (_, k) => addDays(today, k)).map((date) => ({
    date,
    events: events
      .filter((e) => !e.work && e.cal !== 'feiertage' && (e.date === date || (e.endDate && e.date <= date && e.endDate >= date)))
      .sort((a, b) => (a.allDay ? '00:00' : a.start).localeCompare(b.allDay ? '00:00' : b.start)),
  }));
}

export default function AgendaCard({ say, days, fresh, today = TODAY }: { say?: string; days: AgendaDay[]; fresh?: boolean; today?: string }) {
  const count = days.reduce((a, d) => a + d.events.length, 0);
  return (
    <View style={cardFrame}>
      <Reply text={say} fresh={fresh} />
      <View style={{ gap: 12, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 }}>
        {days.map((d) => (
          <View key={d.date} style={{ gap: 6 }}>
            <Txt size={12} weight={600} tracking={0.6} color={tokens.sub}>{agendaDay(d.date, today).toUpperCase()}</Txt>
            {d.events.length ? d.events.map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Owner who={e.who} size={20} />
                {e.allDay ? <Txt size={12.5} weight={600} color={tokens.sub} style={{ width: 52 }}>{tx('ganztags', 'all day')}</Txt> : <Txt size={15} weight={600} style={{ width: 52 }}>{hm(e.start)}</Txt>}
                <Txt size={15} color={tokens.sub} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
              </View>
            )) : <Txt size={15} color={tokens.mute}>{tx('Frei', 'Free')}</Txt>}
          </View>
        ))}
      </View>
      <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
        <Txt size={13} weight={600} color={tokens.sub}>{tx(`${days.length} ${days.length === 1 ? 'Tag' : 'Tage'} · ${count} ${count === 1 ? 'Termin' : 'Termine'}`, `${days.length} ${days.length === 1 ? 'day' : 'days'} · ${count} ${count === 1 ? 'event' : 'events'}`)}</Txt>
      </View>
    </View>
  );
}
