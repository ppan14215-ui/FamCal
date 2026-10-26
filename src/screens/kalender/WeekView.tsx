/** Kalender · Woche: hour grid 8 to 19, work as stripes, events as tinted blocks. */
import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import Stripes from '../../components/Stripes';
import { tokens, tint, PersonId } from '../../theme';
import { useStore, actions } from '../../state/store';
import { addDays, monday, dayNum, WD_SHORT, weekday, minutes, TODAY } from '../../lib/dates';

const FROM = 8;
const TO = 19;
const HP = 40;

const SHORT: Record<string, string> = { 'U6 bei Dr. Weber': 'U6', 'Bürgeramt: Pass': 'Pass', 'Oma Renate kommt': 'Oma', 'Rückbildung': 'Kurs', 'Hebamme Sarah': 'Hebi', 'Wochenmarkt': 'Markt', 'Zoo mit Lena': 'Zoo' };

export default function WeekView() {
  const day = useStore((s) => s.calDay);
  const events = useStore((s) => s.events);
  const start = monday(day);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const hours = Array.from({ length: TO - FROM }, (_, i) => FROM + i);
  const top = (t: string) => ((minutes(t) - FROM * 60) / 60) * HP;

  return (
    <>
      <View style={{ paddingTop: 12, paddingHorizontal: 10, paddingBottom: 10, borderRadius: 24, backgroundColor: tokens.row, gap: 10 }}>
        <View style={{ flexDirection: 'row', paddingLeft: 22 }}>
          {days.map((d) => {
            const sel = d === day;
            return (
              <Pressable key={d} onPress={() => { actions.setCalDay(d); actions.setCalView('tag'); }} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Txt size={11.5} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
                <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: sel ? tokens.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={15} weight={600} color={sel ? '#FFFFFF' : tokens.ink}>{String(dayNum(d))}</Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ paddingLeft: 22, height: hours.length * HP }}>
          {hours.map((h, i) => (
            <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HP }}>
              <View style={{ position: 'absolute', left: 22, right: 0, height: 1, backgroundColor: tokens.hair }} />
              <Txt size={10.5} line={14} color={tokens.mute} style={{ position: 'absolute', left: 0, top: -7 }}>{String(h)}</Txt>
            </View>
          ))}
          <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {days.map((d) => {
              const list = events.filter((e) => e.date === d);
              return (
                <View key={d} style={{ flex: 1, position: 'relative' }}>
                  {list.filter((e) => e.work).map((e) => (
                    <Stripes key={e.id} p={(e.who === 'J' ? 'J' : 'T') as PersonId} radius={8} style={{ position: 'absolute', left: 1, right: 1, top: top(e.start), height: top(e.end ?? e.start) - top(e.start), opacity: 0.9 }} />
                  ))}
                  {list.filter((e) => !e.work && minutes(e.start) >= FROM * 60 && minutes(e.start) < TO * 60).map((e) => {
                    const h = Math.max(28, (e.end ? top(e.end) - top(e.start) : HP * 0.8) - 4);
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => router.push(`/termin/${e.id}`)}
                        style={{ position: 'absolute', left: 3, right: 3, top: top(e.start) + 2, height: h, borderRadius: 8, backgroundColor: tint(e.icon), borderWidth: 1.5, borderColor: '#FFFFFF', paddingVertical: 3, paddingHorizontal: 4, overflow: 'hidden' }}
                      >
                        <Txt size={10.5} line={13} weight={700} numberOfLines={2}>{SHORT[e.title] ?? e.title.split(' ')[0]}</Txt>
                      </Pressable>
                    );
                  })}
                  {d === TODAY ? <View style={{ position: 'absolute', left: -2, right: -2, top: top('08:50'), height: 2, backgroundColor: tokens.done }} /> : null}
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {(['T', 'J'] as PersonId[]).map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Stripes p={p} radius={4} style={{ width: 18, height: 12 }} />
            <Txt size={13} color={tokens.sub}>{p === 'T' ? 'Tom arbeitet' : 'Julia arbeitet'}</Txt>
          </View>
        ))}
      </View>
    </>
  );
}
