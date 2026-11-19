/**
 * Termin ändern: the page a tap on a Termin opens (Julian 16.11.: "The sheet middle steps seems unnecessary why don't
 * I jump straight into event detail edit mode"; the route app/termin/[id].tsx shows this page), built as the form of the klar
 * draft Julian approved (14.11.): the symbol large on top as the head of the page, to tap (Julian 15.11.: "a larger
 * icon that you can click on and that kind of acted as the header"), the big title, then one line each for when, who,
 * where, the reminder, what to bring, repeating and a note. Everything stays editable (Julian 26.10.) and every change
 * counts at once. There is one "Fertig" (Julian 15.11.: "these two done buttons are confusing"): the "Wann" card only
 * folds, and a day or time still open in it is taken along on every way out. `verschieben` opens the day and time at
 * once. Deleting stands at the foot of the page (it sat on the sheet, under "Mehr"), followed by Rückgängig.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { keepPhoneEdit, dropPhoneEvents } from '../src/lib/phoneSync';
import { splitOf, dropSplit } from '../src/lib/splitDay';
import { Screen, Chip, Meta, Seg } from '../src/components/ui/kit';
import ItemRow from '../src/components/ItemRow';
import SourceLink from '../src/components/SourceLink';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import LineIcon from '../src/components/ui/LineIcon';
import AddInline from '../src/components/AddInline';
import DateField from '../src/components/DateField';
import { FormBar, FormTitle, FormRow, FormValue, FormChip, FormPicks, FormInput, FormWho, whenChips, useWhenInView } from '../src/components/TerminForm';
import { tokens, persons } from '../src/theme';
import { useStore, actions, toast, get } from '../src/state/store';
import WhenField from '../src/components/WhenField';
import { whenLine, When } from '../src/lib/when';
import { WD_SHORT, weekday, hm, minutes, addDays, daysBetween, dayMonth, year, TODAY } from '../src/lib/dates';
import type { CalEvent } from '../src/state/types';
import { haptics } from '../src/lib/haptics';
import Fresh from '../src/components/Fresh';
import { goBack } from '../src/lib/nav';
import { tx } from '../src/i18n/lang';
import { REMINDERS, reminderKey, reminderLabel, repeatOptions, daysTo } from '../src/components/TerminDetails';
import TerminComments from '../src/components/TerminComments';
import { eventById } from '../src/lib/useEvents';
import { seriesId, ruleOf } from '../src/lib/repeat';
import { evTint } from '../src/lib/evColor';

type Open = 'wann' | 'erinnern' | 'mitbringen' | 'wiederholen' | null;

/** A way to delete, at the foot of the page. */
function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" scale={0.985} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      <LineIcon name="trash" size={19} color={tokens.danger} />
      <Txt size={17} color={tokens.danger}>{label}</Txt>
    </PressScale>
  );
}

const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

export default function Termin() {
  const { id, verschieben } = useLocalSearchParams<{ id: string; verschieben?: string }>();
  const all = useStore((s) => s.events);
  // One day changed as "Nur dieser Termin" is a Termin of its own now: the page follows it at once (lib/splitDay).
  const e = eventById(all, splitOf(id) ?? id);
  useEffect(() => () => dropSplit(id), [id]);
  // The page deleted its Termin itself and is already on its way out.
  const leaving = useRef(false);
  // Its Termin is gone some other way (spoken, or on another phone): the page has nothing left to show.
  const gone = !e;
  useEffect(() => { if (gone && !leaving.current) goBack(); }, [gone]);
  // A series asks once what a change is for: this day or every day (TimeTree asks on save).
  const [scope, setScope] = useState<'one' | 'all'>('all');
  const [draft, setDraftState] = useState<When | null>(null);
  // The open day or time, also at hand when the page goes (Julian 15.11.: a change must never be lost, whichever way out).
  const pending = useRef<When | null>(null);
  const setDraft = (w: When | null) => { pending.current = w; setDraftState(w); };
  const leave = useRef<() => void>(() => {});
  useEffect(() => () => leave.current(), []);
  const [open, setOpen] = useState<Open>(verschieben ? 'wann' : null);
  // Spoken changes land on the fields below (Julian 27.10.).
  const scroll = useRef<ScrollView>(null);
  const linesAt = useWhenInView(scroll, open === 'wann');
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
  // Something to bring that arrives while the page is open (spoken, or added by the assistant) opens its line, so it is seen landing.
  const brings = e?.bring?.length ?? 0;
  const before = useRef(brings);
  useEffect(() => { if (brings > before.current) setOpen('mitbringen'); before.current = brings; }, [brings]);
  if (!e) { leave.current = () => {}; return null; }
  const series = !!ruleOf(e.repeat) && !e.work;
  const sid = seriesId(e.id);
  /** Where a change goes: the series, or this day split off as its own Termin. */
  const target = (stay = true): string => {
    if (!series || scope === 'all') return sid;
    const nid = actions.detachOccurrence(e.id);
    if (!nid) return sid;
    // The page follows the day that was split off; not when it is already leaving.
    if (stay) router.setParams({ id: nid });
    return nid;
  };
  const patch = (p: Partial<CalEvent>) => {
    haptics.commit();
    // Repeat and its end always belong to the whole series.
    const seriesOnly = 'repeat' in p || 'repeatUntil' in p;
    const id = seriesOnly ? sid : target();
    actions.updateEvent(id, p);
    void keepPhoneEdit(id);
  };
  const pickIcon = () => { haptics.select(); picking.current = true; actions.pickSymbol(e.icon); router.push('/symbol'); };
  const now: When = { date: e.date, endDate: e.endDate, start: e.allDay ? undefined : e.start, end: e.end, repeat: e.work ? undefined : e.repeat };
  // Moving keeps the duration when only the start changes.
  const change = (w: When) => {
    const d = e.end && !e.allDay ? minutes(e.end) - minutes(e.start) : 0;
    const keep = w.start && !w.end && d > 0 ? { ...w, end: addMin(w.start, d) } : w;
    setDraft(keep);
  };
  /** Takes the open day or time over. Safe to call twice: what is open is taken once. */
  const done = (stay = true) => {
    const draft = pending.current;
    if (!draft) return;
    setDraft(null);
    if (whenLine(draft) === whenLine(now)) return;
    const t = target(stay);
    const base = get().events.find((x) => x.id === t);
    // Moving the whole series shifts its first day by as much as this day moved.
    const shift = t === sid && base && base.date !== e.date ? daysBetween(e.date, draft.date) : 0;
    const w = shift ? { ...draft, date: addDays(base!.date, shift), endDate: draft.endDate ? addDays(base!.endDate ?? base!.date, shift) : undefined } : draft;
    const before = actions.moveEvent(t, w);
    void keepPhoneEdit(t);
    if (!e.work && (draft.repeat ?? '') !== (e.repeat ?? '')) actions.updateEvent(sid, { repeat: draft.repeat || undefined });
    toast(`${tx('Verschoben auf', 'Moved to')} ${WD_SHORT[weekday(draft.date)]}${draft.start ? ' ' + hm(draft.start) : ''}`, before ? () => actions.restoreEvent(before) : undefined, { kind: 'done' });
  };
  // The net under every way out (back gesture, the arrow, "Fertig"): the page never goes with a day still open.
  leave.current = () => done(false);
  const overlap = (w: When) => {
    if (!w.start) return undefined;
    const a = minutes(w.start); const b = w.end ? minutes(w.end) : a + 30;
    const o = all.find((x: CalEvent) => x.id !== e.id && !x.work && x.date === w.date && minutes(x.start) < b && (x.end ? minutes(x.end) : minutes(x.start) + 30) > a);
    if (!o) return undefined;
    const name = o.who === 'J' ? persons.J.name : o.who === 'T' ? persons.T.name : o.who === 'both' ? tx('ihr beide', 'both of you') : tx('noch niemand', 'nobody yet');
    return `${tx('Gleichzeitig', 'At the same time')}: ${o.title}, ${name}, ${hm(o.start)}${o.end ? ` ${tx('bis', 'to')} ` + hm(o.end) : ''}.`;
  };
  const added = (e.bring ?? []).filter((b) => b.by === 'assistent' && b.src);
  const things = (e.bring ?? []).map((b) => b.t).join(', ');
  const rep = repeatOptions(e.date);
  const untilText = (d: string) => (year(d) === year(TODAY) ? dayMonth(d) : `${dayMonth(d)} ${year(d)}`);
  const toggle = (k: Open) => { haptics.select(); setOpen(open === k ? null : k); };
  const add = tx('Hinzufügen', 'Add');
  // Deleting: the page goes first, then the Termin, and the note offers Rückgängig. A day or time still open is dropped.
  const out = () => { haptics.commit(); leaving.current = true; setDraft(null); goBack(); };
  const removeWork = () => {
    // Work comes in many blocks; one tap clears all of that person's from this day on (Julian 29.10.).
    const these = get().events.filter((x) => x.work && x.who === e.who && x.date >= e.date);
    out();
    these.forEach((x) => actions.removeEvent(x.id));
    void dropPhoneEvents(these.map((x) => x.id));
    toast(tx(`${these.length} Arbeitstermine gelöscht`, `${these.length} work blocks deleted`), () => { these.forEach((x) => actions.addEvent(x)); void dropPhoneEvents(these.map((x) => x.id), true); });
  };
  const removeOne = () => {
    out();
    const before = actions.skipOccurrence(e.id);
    toast(tx(`„${e.title}“ am ${WD_SHORT[weekday(e.date)]} gelöscht`, `“${e.title}” on ${WD_SHORT[weekday(e.date)]} deleted`), before ? () => actions.restoreEvent(before) : undefined);
  };
  const removeAll = () => {
    const it = get().events.find((x) => x.id === sid) ?? e;
    out();
    actions.removeEvent(it.id);
    void dropPhoneEvents([it.id]);
    toast(tx(`„${it.title}“ gelöscht`, `“${it.title}” deleted`), () => { actions.addEvent(it); void dropPhoneEvents([it.id], true); });
  };
  return (
    <Screen gap={18} scrollRef={scroll}
      head={<FormBar title={tx('Termin ändern', 'Edit event')} icon="back" leftLabel={tx('Zurück', 'Back')} onLeft={() => { done(); goBack(); }} action={tx('Fertig', 'Done')} onAction={() => { haptics.select(); done(); goBack(); }} />}>
      <Fresh id={`${e.id}:title`} radius={12}>
        <FormTitle hero tint={evTint(e)} icon={e.icon} value={e.title} onIcon={pickIcon} onCommit={(t) => actions.updateEvent(target(), { title: t })} />
      </Fresh>
      {series ? (
        <View style={{ gap: 6 }}>
          <Seg items={[{ key: 'one', label: tx('Nur dieser Termin', 'Only this one') }, { key: 'all', label: tx('Ganze Serie', 'Whole series') }]} value={scope} onChange={(k) => setScope(k as 'one' | 'all')} />
          <Meta>{scope === 'one' ? tx('Änderungen gelten nur für diesen Tag.', 'Changes apply to this day only.') : tx('Änderungen gelten für jeden Termin der Serie.', 'Changes apply to every date in the series.')}</Meta>
        </View>
      ) : null}
      <View onLayout={linesAt}>
        <Fresh id={`${e.id}:when`} radius={12}>
          <FormRow label={tx('Wann', 'When')} below={open === 'wann' ? <WhenField card fold startOpen value={draft ?? now} onChange={change} onDone={() => { done(); setOpen(null); }} extra={overlap} /> : undefined}>
            {open === 'wann' ? null : whenChips(now).map((c) => <FormChip key={c} label={c} onPress={() => toggle('wann')} />)}
          </FormRow>
        </Fresh>
        <Fresh id={`${e.id}:who`} radius={12}>
          <FormRow label={tx('Wer', 'Who')}>
            {/* Work is just whose work it is (Julian 30.10.: "Coming along? Auf Arbeit?"). */}
            {e.work ? <FormValue>{e.who === 'T' ? persons.T.name : persons.J.name}</FormValue>
              : <FormWho who={e.who} people={e.people ?? []} onWho={(w) => actions.setEventWho(target(), w)} onPerson={(pid) => actions.toggleEventPerson(target(), pid)} />}
          </FormRow>
        </Fresh>
        <FormRow label={tx('Wo', 'Where')}>
          <FormInput label={tx('Wo', 'Where')} value={e.place ?? e.sub ?? ''} placeholder={add} onCommit={(t) => { actions.updateEvent(target(), e.place !== undefined || !e.sub ? { place: t || undefined } : { sub: t || undefined }); }} />
        </FormRow>
        {/* Work days are single entries; their repeat text is only a note, so no reminder, things to bring or series here. */}
        {e.work ? null : (
          <>
            <FormRow label={tx('Erinnern', 'Reminder')} onPress={() => toggle('erinnern')}
              below={open === 'erinnern' ? (
                <View style={{ gap: 10 }}>
                  <FormPicks items={REMINDERS.filter((r) => !e.allDay || !/m$|h$/.test(r.key) || r.key === '')} value={reminderKey(e.reminder)} onPick={(k) => { patch({ reminder: k || undefined }); setOpen(null); }} />
                  <FormPicks items={[{ key: 'tage', label: e.countdown ? tx(`Tage zählen: ${daysTo(e.date)}`, `Counting days: ${daysTo(e.date)}`) : tx('Tage bis zum Termin zählen', 'Count the days to go') }]} value={e.countdown ? 'tage' : null} onPick={() => patch({ countdown: e.countdown ? undefined : true })} />
                </View>
              ) : undefined}>
              <FormValue dim={!reminderKey(e.reminder)}>{reminderLabel(e.reminder) || tx('Keine', 'None')}</FormValue>
            </FormRow>
            <FormRow label={tx('Mitbringen', 'Bring')} onPress={() => toggle('mitbringen')}
              below={open === 'mitbringen' ? (
                <View>
                  {(e.bring ?? []).map((b) => (
                    <Fresh key={b.id} id={`bring:${b.id}`}>
                      <ItemRow
                        flat
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
                  {added.length ? <SourceLink prefix={tx(`${added.length} Dinge ergänzt nach`, `${added.length} things added from`)} s={{ label: added[0].src!, url: added[0].url }} /> : null}
                  <AddInline flat placeholder={tx('Hinzufügen …', 'Add …')} onAdd={(t) => actions.addBring(target(), t)} />
                </View>
              ) : undefined}>
              <FormValue dim={!things}>{things || add}</FormValue>
            </FormRow>
            <FormRow label={tx('Wiederholen', 'Repeat')} onPress={() => toggle('wiederholen')}
              below={open === 'wiederholen' ? (
                <View style={{ gap: 10 }}>
                  <FormPicks items={e.repeat && !rep.some((r) => r.key === e.repeat) ? [{ key: e.repeat, label: e.repeat }, ...rep] : rep} value={e.repeat ?? ''} onPick={(k) => { patch({ repeat: k || undefined, ...(k ? {} : { repeatUntil: undefined }) }); if (!k) setOpen(null); }} />
                  {e.repeat ? (
                    <DateField
                      label={tx('Serie endet', 'Series ends')}
                      value={e.repeatUntil ?? null}
                      onChange={(d) => patch({ repeatUntil: d < e.date ? e.date : d })}
                      right={e.repeatUntil ? <Chip onPress={() => { haptics.select(); patch({ repeatUntil: undefined }); }}>{tx('Nie', 'Never')}</Chip> : <Txt size={14} color={tokens.sub}>{tx('Nie', 'Never')}</Txt>}
                      extra={(d) => tx(`Letzter Termin am ${untilText(d)}.`, `Last one on ${untilText(d)}.`)}
                    />
                  ) : null}
                </View>
              ) : undefined}>
              <FormValue dim={!e.repeat}>{e.repeat || tx('Nie', 'Never')}</FormValue>
            </FormRow>
          </>
        )}
        <FormRow last label={tx('Notiz', 'Note')}>
          <FormInput label={tx('Notiz', 'Note')} value={e.note ?? ''} placeholder={add} onCommit={(t) => patch({ note: t || undefined })} />
        </FormRow>
      </View>
      {e.source ? <SourceLink prefix={tx('Aus', 'From')} s={{ label: e.source }} /> : null}
      {e.work ? null : <TerminComments flat eventId={e.id} />}
      <View>
        {series ? <Remove label={tx('Nur diesen Termin löschen', 'Delete only this one')} onPress={removeOne} /> : null}
        <Remove label={series ? tx('Ganze Serie löschen', 'Delete whole series') : tx('Termin löschen', 'Delete event')} onPress={removeAll} />
        {e.work ? <Remove label={tx('Alle Arbeitstermine ab hier löschen', 'Delete all work from here on')} onPress={removeWork} /> : null}
      </View>
    </Screen>
  );
}
