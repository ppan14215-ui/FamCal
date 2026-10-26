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
import type { Who } from '../../src/state/types';

const NEXT: Record<string, Who> = { T: 'J', J: 'both', both: null, null: 'T' };

function whoLine(who: Who, title: string): { t: string; s: string } {
  const kid = get().kid?.name;
  const withKid = !!kid && /U\d|Impf|Pass|Arzt|Dr\./.test(title);
  const go = (p: 'J' | 'T') => (withKid ? `${persons[p].name} bringt ${kid}` : `${persons[p].name} geht hin`);
  if (who === 'T') return { t: go('T'), s: 'selbst übernommen' };
  if (who === 'J') return { t: go('J'), s: 'selbst übernommen' };
  if (who === 'both') return { t: 'Ihr geht beide', s: 'zusammen' };
  return { t: 'Noch niemand', s: 'Wer geht hin?' };
}

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

export default function Termin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const insets = useSafeAreaInsets();
  const all = useStore((s) => s.events);
  const [draft, setDraft] = useState<When | null>(null);
  const [addPlace, setAddPlace] = useState(false);
  // Symbol: the picker writes draftSymbol; we take it over when we asked.
  const picked = useStore((s) => s.draftSymbol);
  const picking = useRef(false);
  useEffect(() => {
    // The picker opens with the current symbol as draft; only a different one counts.
    if (!picking.current || !e || !picked || picked === e.icon) return;
    picking.current = false;
    actions.updateEvent(e.id, { icon: picked });
    haptics.commit();
    actions.clearDraftSymbol();
  }, [picked]);
  if (!e) return null;
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
    const before = actions.moveEvent(e.id, draft);
    setDraft(null);
    toast(`Verschoben auf ${WD_SHORT[weekday(draft.date)]}${draft.start ? ' ' + hm(draft.start) : ''}`, before ? () => actions.restoreEvent(before) : undefined);
  };
  const overlap = (w: When) => {
    if (!w.start) return undefined;
    const a = minutes(w.start); const b = w.end ? minutes(w.end) : a + 30;
    const o = all.find((x: CalEvent) => x.id !== e.id && !x.work && x.date === w.date && minutes(x.start) < b && (x.end ? minutes(x.end) : minutes(x.start) + 30) > a);
    if (!o) return undefined;
    const name = o.who === 'J' ? persons.J.name : o.who === 'T' ? persons.T.name : o.who === 'both' ? 'ihr beide' : 'noch niemand';
    return `Gleichzeitig: ${o.title}, ${name}, ${hm(o.start)}${o.end ? ' bis ' + hm(o.end) : ''}.`;
  };
  const w = whoLine(e.who, e.title);
  const added = (e.bring ?? []).filter((b) => b.by === 'assistent' && b.src);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 34 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: tint(e.icon), paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 18 }}><BackBar /></View>
        <PressScale scale={0.97} accessibilityLabel="Symbol ändern" onPress={pickIcon} style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <ClayIcon key={e.icon} name={e.icon} size={160} />
          <View style={{ position: 'absolute', right: 18, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <LineIcon name="sparkle" size={13} color={tokens.ink} />
            <Txt size={13} weight={600}>Symbol</Txt>
          </View>
        </PressScale>
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <EditText key={`t-${e.title}`} value={e.title} size={30} weight={700} placeholder="Titel" onCommit={(t) => t && actions.updateEvent(e.id, { title: t })} />
          {/* An empty place shows no field, only a quiet link that opens one (Julian 26.10.). */}
          {e.place || e.sub || addPlace ? (
            <EditText key={`p-${e.place ?? e.sub ?? ''}`} value={e.place ?? e.sub ?? ''} size={15} weight={400} color={tokens.sub} placeholder="Ort oder Notiz" autoFocus={addPlace} onDone={() => setAddPlace(false)} onCommit={(t) => { actions.updateEvent(e.id, e.place !== undefined || !e.sub ? { place: t || undefined } : { sub: t || undefined }); }} />
          ) : (
            <PressScale hitSlop={8} onPress={() => { haptics.select(); setAddPlace(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
              <LineIcon name="plus" size={14} color={tokens.sub} />
              <Txt size={15} color={tokens.sub}>Ort oder Notiz</Txt>
            </PressScale>
          )}
        </View>
        <WhenField card value={draft ?? now} onChange={change} onDone={done} extra={overlap} />
        <Card pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Owner who={e.who} size={32} />
            <View style={{ flex: 1 }}>
              <Txt size={15} weight={600}>{w.t}</Txt>
              <Meta>{w.s}</Meta>
            </View>
            <Chip onPress={() => { haptics.select(); actions.setEventWho(e.id, NEXT[String(e.who)]); }}>Ändern</Chip>
          </View>
        </Card>
        <Card pad={14} gap={10}>
          <Txt size={13} weight={600} color={tokens.sub}>Mitnehmen</Txt>
          <View style={{ marginHorizontal: -14 }}>
            {(e.bring ?? []).map((b) => (
              <ItemRow
                key={b.id}
                title={b.t}
                meta={b.by === 'assistent' ? `Vom Assistenten ergänzt${b.src ? ' · ' + b.src : ''}` : undefined}
                metaColor={tokens.done}
                done={b.done}
                who={b.who ?? null}
                onToggle={() => actions.toggleBring(e.id, b.id)}
                onEdit={(t) => actions.editBring(e.id, b.id, t)}
                onCycleWho={() => actions.cycleBringWho(e.id, b.id)}
                onDelete={() => actions.deleteBring(e.id, b.id)}
                editHint="Leer lassen löscht die Zeile"
              />
            ))}
          </View>
          {added.length ? <SourceLink prefix={`${added.length} Dinge ergänzt nach`} s={{ label: added[0].src!, url: added[0].url }} /> : null}
          <View style={{ marginHorizontal: -14, marginBottom: -14 }}>
            <AddInline placeholder="Hinzufügen" onAdd={(t) => actions.addBring(e.id, t)} />
          </View>
        </Card>
        {e.source ? <SourceLink prefix="Aus" s={{ label: e.source }} /> : null}
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
      selectionColor={tokens.ink}
      style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: Math.round(size * 1.2), letterSpacing: size > 20 ? -0.8 : 0, color, padding: 0 }, noOutline]}
    />
  );
}
