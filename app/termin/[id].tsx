/**
 * Termin: clay stage on top, who goes, what to bring, where it came from.
 * Everything stays editable (Julian 26.10.): symbol, title, place, day and
 * time, who goes, and every line of what to bring and who brings it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { BackBar, Card, Chip, Meta } from '../../src/components/ui/kit';
import ItemRow from '../../src/components/ItemRow';
import SourceLink from '../../src/components/SourceLink';
import PressScale from '../../src/components/ui/PressScale';
import LineIcon from '../../src/components/ui/LineIcon';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { ClayIcon } from '../../src/components/ui/Clay';
import { Owner } from '../../src/components/ui/Person';
import AddInline from '../../src/components/AddInline';
import { tokens, tint, persons, fonts } from '../../src/theme';
import { useStore, actions, toast, get } from '../../src/state/store';
import WhenField from '../../src/components/WhenField';
import { whenLine, When } from '../../src/lib/when';
import { WD_SHORT, weekday, hm, minutes } from '../../src/lib/dates';
import type { CalEvent } from '../../src/state/types';
import { haptics } from '../../src/lib/haptics';
import Fresh from '../../src/components/Fresh';
import { useScroller } from '../../src/lib/landing';
import { useDockSpace } from '../../src/lib/dockSpace';
import type { Who } from '../../src/state/types';
import { tx } from '../../src/i18n/lang';
import { Seg } from '../../src/components/ui/kit';
import TerminDetails, { daysTo } from '../../src/components/TerminDetails';
import TerminPeople from '../../src/components/TerminPeople';
import TerminComments from '../../src/components/TerminComments';
import { eventById } from '../../src/lib/useEvents';
import { seriesId, ruleOf } from '../../src/lib/repeat';
import { addDays, daysBetween } from '../../src/lib/dates';

const NEXT: Record<string, Who> = { T: 'J', J: 'both', both: null, null: 'T' };

function whoLine(who: Who, title: string): { t: string; s: string } {
  const kid = get().kid?.name;
  const withKid = !!kid && /U\d|Impf|Pass|Arzt|Dr\./.test(title);
  const go = (p: 'J' | 'T') => (withKid ? tx(`${persons[p].name} bringt ${kid}`, `${persons[p].name} takes ${kid}`) : tx(`${persons[p].name} geht hin`, `${persons[p].name} is going`));
  if (who === 'T') return { t: go('T'), s: tx('selbst übernommen', 'took it') };
  if (who === 'J') return { t: go('J'), s: tx('selbst übernommen', 'took it') };
  if (who === 'both') return { t: tx('Ihr geht beide', 'You both go'), s: tx('zusammen', 'together') };
  return { t: tx('Noch niemand', 'Nobody yet'), s: tx('Wer geht hin?', "Who's going?") };
}

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

export default function Termin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = useStore((s) => s.events);
  const e = eventById(all, id);
  const insets = useSafeAreaInsets();
  // A series asks once what a change is for: this day or every day (TimeTree asks on save).
  const [scope, setScope] = useState<'one' | 'all'>('all');
  const [draft, setDraft] = useState<When | null>(null);
  const [addPlace, setAddPlace] = useState(false);
  // Spoken changes land on the fields below (Julian 27.10.).
  const scroll = useRef<ScrollView>(null);
  const track = useScroller(scroll);
  const dock = useDockSpace();
  // Symbol: the picker writes draftSymbol; we take it over when we asked.
  const picked = useStore((s) => s.draftSymbol);
  const picking = useRef(false);
  useEffect(() => {
    // The picker opens with the current symbol as draft; only a different one counts.
    if (!picking.current || !e || !picked || picked === e.icon) return;
    picking.current = false;
    actions.updateEvent(target(), { icon: picked });
    haptics.commit();
    actions.clearDraftSymbol();
  }, [picked]);
  if (!e) return null;
  const series = !!ruleOf(e.repeat) && !e.work;
  const sid = seriesId(e.id);
  /** Where a change goes: the series, or this day split off as its own Termin. */
  const target = (): string => {
    if (!series || scope === 'all') return sid;
    const nid = actions.detachOccurrence(e.id);
    if (!nid) return sid;
    router.setParams({ id: nid });
    return nid;
  };
  const patch = (p: Partial<CalEvent>) => {
    haptics.commit();
    // Repeat and its end always belong to the whole series.
    const seriesOnly = 'repeat' in p || 'repeatUntil' in p;
    actions.updateEvent(seriesOnly ? sid : target(), p);
  };
  const pickIcon = () => { haptics.select(); picking.current = true; actions.pickSymbol(e.icon); router.push('/symbol'); };
  const now: When = { date: e.date, endDate: e.endDate, start: e.allDay ? undefined : e.start, end: e.end, repeat: e.repeat };
  // Moving keeps the duration when only the start changes.
  const change = (w: When) => {
    const d = e.end && !e.allDay ? minutes(e.end) - minutes(e.start) : 0;
    const keep = w.start && !w.end && d > 0 ? { ...w, end: addMin(w.start, d) } : w;
    setDraft(keep);
  };
  const done = () => {
    if (!draft || whenLine(draft) === whenLine(now)) return setDraft(null);
    const t = target();
    const base = get().events.find((x) => x.id === t);
    // Moving the whole series shifts its first day by as much as this day moved.
    const shift = t === sid && base && base.date !== e.date ? daysBetween(e.date, draft.date) : 0;
    const w = shift ? { ...draft, date: addDays(base!.date, shift), endDate: draft.endDate ? addDays(base!.endDate ?? base!.date, shift) : undefined } : draft;
    const before = actions.moveEvent(t, w);
    if ((draft.repeat ?? '') !== (e.repeat ?? '')) actions.updateEvent(sid, { repeat: draft.repeat || undefined });
    setDraft(null);
    toast(`${tx('Verschoben auf', 'Moved to')} ${WD_SHORT[weekday(draft.date)]}${draft.start ? ' ' + hm(draft.start) : ''}`, before ? () => actions.restoreEvent(before) : undefined);
  };
  const overlap = (w: When) => {
    if (!w.start) return undefined;
    const a = minutes(w.start); const b = w.end ? minutes(w.end) : a + 30;
    const o = all.find((x: CalEvent) => x.id !== e.id && !x.work && x.date === w.date && minutes(x.start) < b && (x.end ? minutes(x.end) : minutes(x.start) + 30) > a);
    if (!o) return undefined;
    const name = o.who === 'J' ? persons.J.name : o.who === 'T' ? persons.T.name : o.who === 'both' ? tx('ihr beide', 'both of you') : tx('noch niemand', 'nobody yet');
    return `${tx('Gleichzeitig', 'At the same time')}: ${o.title}, ${name}, ${hm(o.start)}${o.end ? ` ${tx('bis', 'to')} ` + hm(o.end) : ''}.`;
  };
  const w = whoLine(e.who, e.title);
  const added = (e.bring ?? []).filter((b) => b.by === 'assistent' && b.src);
  return (
    <ScrollView ref={scroll} onScroll={(ev) => track(ev.nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 34 + dock }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: tint(e.icon), paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 18 }}><BackBar /></View>
        <PressScale scale={0.97} accessibilityLabel={tx('Symbol ändern', 'Change icon')} onPress={pickIcon} style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon key={e.icon} name={e.icon} size={160} />
          <View style={{ position: 'absolute', right: 18, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <LineIcon name="sparkle" size={13} color={tokens.ink} />
            <Txt size={13} weight={600}>{tx('Symbol', 'Icon')}</Txt>
          </View>
        </PressScale>
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 14 }}>
        <Fresh id={`${e.id}:title`} radius={12} style={{ gap: 4 }}>
          <EditText key={`t-${e.title}`} value={e.title} size={30} weight={700} placeholder={tx('Titel', 'Title')} onCommit={(t) => t && actions.updateEvent(target(), { title: t })} />
          {/* An empty place shows no field, only a quiet link that opens one (Julian 26.10.). */}
          {e.place || e.sub || addPlace ? (
            <EditText key={`p-${e.place ?? e.sub ?? ''}`} value={e.place ?? e.sub ?? ''} size={15} weight={400} color={tokens.sub} placeholder={tx('Ort oder Notiz', 'Place or note')} autoFocus={addPlace} onDone={() => setAddPlace(false)} onCommit={(t) => { actions.updateEvent(target(), e.place !== undefined || !e.sub ? { place: t || undefined } : { sub: t || undefined }); }} />
          ) : (
            <PressScale hitSlop={8} onPress={() => { haptics.select(); setAddPlace(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
              <LineIcon name="plus" size={14} color={tokens.sub} />
              <Txt size={15} color={tokens.sub}>{tx('Ort oder Notiz', 'Place or note')}</Txt>
            </PressScale>
          )}
        </Fresh>
        {e.countdown ? <Txt size={15} weight={600} color={tokens.done}>{daysTo(e.date)}</Txt> : null}
        {series ? (
          <View style={{ gap: 6 }}>
            <Seg items={[{ key: 'one', label: tx('Nur dieser Termin', 'Only this one') }, { key: 'all', label: tx('Ganze Serie', 'Whole series') }]} value={scope} onChange={(k) => setScope(k as 'one' | 'all')} />
            <Meta>{scope === 'one' ? tx('Änderungen gelten nur für diesen Tag.', 'Changes apply to this day only.') : tx('Änderungen gelten für jeden Termin der Serie.', 'Changes apply to every date in the series.')}</Meta>
          </View>
        ) : null}
        <Fresh id={`${e.id}:when`} radius={22}>
          <WhenField card value={draft ?? now} onChange={change} onDone={done} extra={overlap} />
        </Fresh>
        <Fresh id={`${e.id}:who`} radius={22}>
        <Card pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Owner who={e.who} size={32} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight={600}>{w.t}</Txt>
              <Meta>{w.s}</Meta>
            </View>
            <Chip onPress={() => { haptics.select(); actions.setEventWho(target(), NEXT[String(e.who)]); }}>{tx('Ändern', 'Change')}</Chip>
          </View>
          <View style={{ height: 1, backgroundColor: tokens.hair, marginVertical: 12 }} />
          <TerminPeople ids={e.people ?? []} onToggle={(pid) => actions.toggleEventPerson(target(), pid)} />
        </Card>
        </Fresh>
        <TerminDetails key={e.id} e={e} onPatch={patch} />
        <Card pad={14} gap={10}>
          <Txt size={13} weight={600} color={tokens.sub}>{tx('Mitnehmen', 'Bring')}</Txt>
          <View style={{ marginHorizontal: -14 }}>
            {(e.bring ?? []).map((b) => (
              <Fresh key={b.id} id={`bring:${b.id}`}>
              <ItemRow
                title={b.t}
                meta={b.by === 'assistent' ? `${tx('Vom Assistenten ergänzt', 'Added by the assistant')}${b.src ? ' · ' + b.src : ''}` : undefined}
                metaColor={tokens.done}
                done={b.done}
                who={b.who ?? null}
                onToggle={() => actions.toggleBring(target(), b.id)}
                onEdit={(t) => actions.editBring(target(), b.id, t)}
                onCycleWho={() => actions.cycleBringWho(target(), b.id)}
                onDelete={() => actions.deleteBring(target(), b.id)}
                editHint={tx('Leer lassen löscht die Zeile', 'Leave empty to delete the line')}
              />
              </Fresh>
            ))}
          </View>
          {added.length ? <SourceLink prefix={tx(`${added.length} Dinge ergänzt nach`, `${added.length} things added from`)} s={{ label: added[0].src!, url: added[0].url }} /> : null}
          <View style={{ marginHorizontal: -14, marginBottom: -14 }}>
            <AddInline placeholder={tx('Hinzufügen', 'Add')} onAdd={(t) => actions.addBring(target(), t)} />
          </View>
        </Card>
        <TerminComments eventId={e.id} />
        {e.source ? <SourceLink prefix={tx('Aus', 'From')} s={{ label: e.source }} /> : null}
        {series ? (
          <PressScale
            accessibilityRole="button"
            onPress={() => {
              haptics.commit();
              router.back();
              const before = actions.skipOccurrence(e.id);
              toast(tx(`„${e.title}“ am ${WD_SHORT[weekday(e.date)]} gelöscht`, `“${e.title}” on ${WD_SHORT[weekday(e.date)]} deleted`), before ? () => actions.restoreEvent(before) : undefined);
            }}
            style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, marginTop: 8 }}
          >
            <LineIcon name="trash" size={18} color={tokens.danger} />
            <Txt size={15} weight={600} color={tokens.danger}>{tx('Nur diesen Termin löschen', 'Delete only this one')}</Txt>
          </PressScale>
        ) : null}
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={series ? tx('Ganze Serie löschen', 'Delete whole series') : tx('Termin löschen', 'Delete event')}
          onPress={() => {
            haptics.commit();
            const gone = get().events.find((x) => x.id === sid) ?? e;
            router.back();
            actions.removeEvent(gone.id);
            toast(tx(`„${gone.title}“ gelöscht`, `“${gone.title}” deleted`), () => actions.addEvent(gone));
          }}
          style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, marginTop: 8 }}
        >
          <LineIcon name="trash" size={18} color={tokens.danger} />
          <Txt size={15} weight={600} color={tokens.danger}>{series ? tx('Ganze Serie löschen', 'Delete whole series') : tx('Termin löschen', 'Delete event')}</Txt>
        </PressScale>
      </View>
    </ScrollView>
  );
}

/** Text that looks like text and edits in place; empty puts the old text back. */
function EditText({ value, size, weight, color = tokens.ink, placeholder, autoFocus, onDone, onCommit }: { value: string; size: number; weight: 400 | 600 | 700; color?: string; placeholder: string; autoFocus?: boolean; onDone?: () => void; onCommit: (t: string) => void }) {
  const [t, setT] = useState(value);
  const commit = () => { const v = t.trim(); if (v !== value) { haptics.commit(); onCommit(v); } if (!v && size > 20) setT(value); onDone?.(); };
  return (
    <TextInput
      value={t}
      onChangeText={setT}
      autoFocus={autoFocus}
      onBlur={commit}
      onSubmitEditing={commit}
      returnKeyType="done"
      multiline={size > 20 && Platform.OS !== 'web'}
      blurOnSubmit
      placeholder={placeholder}
      placeholderTextColor={tokens.mute}
      selectionColor={tokens.select} cursorColor={tokens.ink}
      style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: Math.round(size * 1.2), letterSpacing: size > 20 ? -0.8 : 0, color, padding: 0 }, noOutline]}
    />
  );
}
