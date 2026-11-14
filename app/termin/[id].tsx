/**
 * Termin · Details: the sheet over the calendar, exactly as in the klar draft Julian approved (14.11.). The symbol,
 * the title and when; then quiet lines for who it is for, who goes, where, what to bring and the reminder, each only
 * when there is something to say; where it came from; and three ways on: Ändern, Verschieben and the rest behind the
 * three dots (delete). Nothing is edited here: "Ändern" opens the page with every field.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Sheet from '../../src/components/Sheet';
import Txt from '../../src/components/ui/Txt';
import PressScale from '../../src/components/ui/PressScale';
import LineIcon, { type LineName } from '../../src/components/ui/LineIcon';
import { ClayIcon } from '../../src/components/ui/Clay';
import { HEAD_SHADOW } from '../../src/components/ui/HeaderRight';
import { tokens, persons } from '../../src/theme';
import { useStore, actions, toast, get } from '../../src/state/store';
import { eventById } from '../../src/lib/useEvents';
import { seriesId, ruleOf } from '../../src/lib/repeat';
import { whenLine } from '../../src/lib/when';
import { reminderKey, reminderLabel } from '../../src/components/TerminDetails';
import { dropPhoneEvents } from '../../src/lib/phoneSync';
import { short, hm, WD_SHORT, weekday } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';
import type { CalEvent } from '../../src/state/types';

const BTN = 46;

/** One quiet line: what it is on the left, the answer on the right of it. */
function Line({ k, v, last }: { k: string; v: string; last: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair }}>
      <Txt size={17} line={22} color={tokens.sub} style={{ width: 118 }} numberOfLines={1}>{k}</Txt>
      <Txt size={17} line={22} style={{ flex: 1, minWidth: 0 }}>{v}</Txt>
    </View>
  );
}

/** A way on at the sheet's foot: the dark one is "Ändern", the others are white. */
function Way({ label, icon, primary, onPress, round }: { label: string; icon?: LineName; primary?: boolean; onPress: () => void; round?: boolean }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} scale={0.96} onPress={onPress}
      style={{ height: BTN, width: round ? BTN : undefined, paddingHorizontal: round ? 0 : 20, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: primary ? tokens.ink : tokens.row, boxShadow: primary ? undefined : HEAD_SHADOW } as any}>
      {icon ? <LineIcon name={icon} size={round ? 20 : 17} color={primary ? tokens.onInk : tokens.ink} /> : null}
      {round ? null : <Txt size={17} weight={600} color={primary ? tokens.onInk : tokens.ink}>{label}</Txt>}
    </PressScale>
  );
}

/** A line of the menu behind the three dots. */
function More({ label, icon, danger, onPress }: { label: string; icon: LineName; danger?: boolean; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" scale={0.985} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      <LineIcon name={icon} size={19} color={danger ? tokens.danger : tokens.ink} />
      <Txt size={17} color={danger ? tokens.danger : tokens.ink}>{label}</Txt>
    </PressScale>
  );
}

const whoName = (e: CalEvent) =>
  e.who === 'J' ? persons.J.name || tx('Ich', 'Me')
    : e.who === 'T' ? persons.T.name || tx('Partner', 'Partner')
      : e.who === 'both' ? [persons.J.name, persons.T.name].filter(Boolean).join(tx(' und ', ' and ')) || tx('Beide', 'Both')
        : tx('Noch niemand', 'Nobody yet');

export default function Termin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = useStore((s) => s.events);
  const people = useStore((s) => s.people);
  const e = eventById(all, id);
  const [more, setMore] = useState(false);
  // Deleted from the page behind "Ändern", or moved to its own day: the sheet has nothing left to show.
  useEffect(() => { if (!e && router.canGoBack()) router.back(); }, [e]);
  if (!e) return null;

  const series = !!ruleOf(e.repeat) && !e.work;
  const sid = seriesId(e.id);
  const when = e.endDate && e.endDate > e.date ? whenLine({ date: e.date, endDate: e.endDate })
    : e.allDay ? short(e.date)
      : `${short(e.date)} · ${hm(e.start)}${e.end ? ` ${tx('bis', 'to')} ${hm(e.end)}` : ''}`;
  const forWhom = (e.people ?? []).map((pid) => people.find((p) => p.id === pid)?.name).filter(Boolean).join(', ');
  const bring = (e.bring ?? []).map((b) => b.t).join(', ');
  const lines: [string, string][] = [];
  if (e.work) lines.push([tx('Wer', 'Who'), whoName(e)]);
  else {
    if (forWhom) lines.push([tx('Für', 'For'), forWhom]);
    lines.push([tx('Wer geht', "Who's going"), whoName(e)]);
    if (e.place ?? e.sub) lines.push([tx('Wo', 'Where'), (e.place ?? e.sub)!]);
    if (bring) lines.push([tx('Mitbringen', 'Bring'), bring]);
    if (reminderKey(e.reminder)) lines.push([tx('Erinnern', 'Reminder'), reminderLabel(e.reminder)]);
    if (e.repeat) lines.push([tx('Wiederholen', 'Repeat'), e.repeat]);
    if (e.note) lines.push([tx('Notiz', 'Note'), e.note]);
  }

  const edit = (move?: boolean) => { haptics.select(); router.push({ pathname: '/termin-aendern', params: move ? { id: e.id, verschieben: '1' } : { id: e.id } }); };
  const removeWork = () => {
    // Work comes in many blocks; one tap clears all of that person's from this day on (Julian 29.10.).
    haptics.commit();
    const gone = get().events.filter((x) => x.work && x.who === e.who && x.date >= e.date);
    router.back();
    gone.forEach((x) => actions.removeEvent(x.id));
    void dropPhoneEvents(gone.map((x) => x.id));
    toast(tx(`${gone.length} Arbeitstermine gelöscht`, `${gone.length} work blocks deleted`), () => { gone.forEach((x) => actions.addEvent(x)); void dropPhoneEvents(gone.map((x) => x.id), true); });
  };
  const removeOne = () => {
    haptics.commit();
    router.back();
    const before = actions.skipOccurrence(e.id);
    toast(tx(`„${e.title}“ am ${WD_SHORT[weekday(e.date)]} gelöscht`, `“${e.title}” on ${WD_SHORT[weekday(e.date)]} deleted`), before ? () => actions.restoreEvent(before) : undefined);
  };
  const removeAll = () => {
    haptics.commit();
    const gone = get().events.find((x) => x.id === sid) ?? e;
    router.back();
    actions.removeEvent(gone.id);
    void dropPhoneEvents([gone.id]);
    toast(tx(`„${gone.title}“ gelöscht`, `“${gone.title}” deleted`), () => { actions.addEvent(gone); void dropPhoneEvents([gone.id], true); });
  };

  return (
    <Sheet bg={tokens.row} style={{ gap: 14, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 }}>
        <ClayIcon name={e.icon} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={22} line={27} weight={600} tracking={-0.3} numberOfLines={2}>{e.title}</Txt>
          <Txt size={16} line={21} color={tokens.sub} numberOfLines={1}>{when}</Txt>
        </View>
      </View>
      {more ? (
        <View>
          {series ? <More icon="trash" danger label={tx('Nur diesen Termin löschen', 'Delete only this one')} onPress={removeOne} /> : null}
          <More icon="trash" danger label={series ? tx('Ganze Serie löschen', 'Delete whole series') : tx('Termin löschen', 'Delete event')} onPress={removeAll} />
          {e.work ? <More icon="trash" danger label={tx('Alle Arbeitstermine ab hier löschen', 'Delete all work from here on')} onPress={removeWork} /> : null}
        </View>
      ) : (
        <View>{lines.map(([k, v], i) => <Line key={k} k={k} v={v} last={i === lines.length - 1} />)}</View>
      )}
      {e.source && !more ? <Txt size={14.5} line={19} color={tokens.sub}>{/^(aus|from)\b/i.test(e.source) ? e.source : `${tx('Aus', 'From')} ${e.source}`}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <Way primary icon="edit" label={tx('Ändern', 'Change')} onPress={() => edit()} />
        <Way label={tx('Verschieben', 'Move')} onPress={() => edit(true)} />
        <Way round icon={more ? 'x' : 'more'} label={more ? tx('Zurück', 'Back') : tx('Mehr', 'More')} onPress={() => { haptics.select(); setMore((m) => !m); }} />
      </View>
    </Sheet>
  );
}
