/**
 * The Termin form of the klar draft Julian approved (14.11., "Termin, neu"): a bar with one round button, the name of
 * the page and one dark pill; the symbol beside a big title; then quiet lines with the question on the left and the
 * answer on the right, fine lines between. "Neuer Termin" and the page behind "Ändern" are both built from these
 * parts, so they look the same.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform, useWindowDimensions, type ScrollView, type LayoutChangeEvent } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { ClayIcon } from './ui/Clay';
import { Avatar, PersonDot, usePersons } from './ui/Person';
import LineIcon, { type LineName } from './ui/LineIcon';
import { tokens, fonts, shade, allColors, personPalette } from '../theme';
import { useStore } from '../state/store';
import { haptics } from '../lib/haptics';
import { whenLine, type When } from '../lib/when';
import { short, hm, minutes } from '../lib/dates';
import { tx } from '../i18n/lang';
import type { ClayName } from '../lib/clayIcons';
import type { Who } from '../state/types';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

/** One line of the form (40 of 284 in the draft). */
export const FORM_ROW = 52;
/** The bar stands still on top of the page: its room there. */
const FORM_HEAD = 70;

/**
 * The bar: a round button on the left, the page's name in the middle, the dark pill on the right. It is the page's
 * `head`, so it stands still while the lines scroll and the one "Fertig" is always there (Julian 15.11.).
 */
export function FormBar({ title, icon, leftLabel, onLeft, action, onAction }: { title?: string; icon?: LineName; leftLabel: string; onLeft: () => void; action?: string; onAction?: () => void }) {
  // Brand (27.11.): two quiet words, no buttons. Back reads "‹ Kalender", a new page "Abbrechen" and "Sichern".
  const back = icon === 'back';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
      <PressScale accessibilityRole="button" accessibilityLabel={leftLabel} scale={0.96} hitSlop={10} onPress={onLeft}>
        <Txt size={15} line={20} weight={500} color={tokens.sub}>{back ? `‹ ${leftLabel}` : leftLabel}</Txt>
      </PressScale>
      {action && onAction ? (
        <PressScale accessibilityRole="button" accessibilityLabel={action} scale={0.96} hitSlop={10} onPress={onAction}>
          <Txt size={15} line={20} weight={600}>{action}</Txt>
        </PressScale>
      ) : null}
    </View>
  );
}

/** The rows of a form lie together on the soft grey of the brand, in small groups. */
export function FormGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: tokens.group, borderRadius: 16, paddingHorizontal: 14 }}>{children}</View>;
}

/** Who goes, as soft pills under the title: a dot in their colour and the name. A tap adds or takes them off. */
export function WhoChips({ who, people, onWho, onPerson }: { who: Who; people: string[]; onWho: (w: Who) => void; onPerson: (id: string) => void }) {
  const family = useStore((s) => s.people);
  const pp = usePersons();
  const has = (p: 'J' | 'T') => who === p || who === 'both';
  const flip = (p: 'J' | 'T') => {
    const o = p === 'J' ? 'T' : 'J';
    haptics.select();
    onWho(has(p) ? (has(o) ? o : null) : has(o) ? 'both' : p);
  };
  const chip = (key: string, on: boolean, name: string, color: string, onPress: () => void) => (
    <PressScale key={key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={name} scale={0.94} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? tokens.group : 'transparent', borderWidth: on ? 0 : 1, borderColor: tokens.hair }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: on ? 1 : 0.35 }} />
      <Txt size={15} line={20} weight={500} color={on ? tokens.ink : tokens.mute}>{name}</Txt>
    </PressScale>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['J', 'T'] as const).map((p) => chip(p, has(p), pp[p]?.name ?? p, pp[p]?.tint ?? tokens.sub, () => flip(p)))}
      {family.map((f) => chip(f.id, people.includes(f.id), f.name.split(' ')[0], shade(allColors.find((x) => x.name === f.color) ?? personPalette[2]).bg, () => { haptics.select(); onPerson(f.id); }))}
    </View>
  );
}

/**
 * The symbol and the big title. With `onCommit` the text is kept when the field is left (a Termin that exists: an
 * empty title puts the old one back); with `onChange` every letter goes out (a new Termin).
 */
export function FormTitle({ icon, value, onIcon, onChange, onCommit, autoFocus, hero, tint }: { icon: ClayName; value: string; onIcon: () => void; onChange?: (t: string) => void; onCommit?: (t: string) => void; autoFocus?: boolean; hero?: boolean; tint?: string }) {
  const [t, setT] = useState(value);
  // A spoken change arrives from outside.
  useEffect(() => { setT(value); }, [value]);
  const commit = () => {
    if (!onCommit) return;
    const v = t.trim();
    if (!v) return setT(value);
    if (v !== value) { haptics.commit(); onCommit(v); }
  };
  const input = (
    <TextInput
      value={t}
      onChangeText={(x) => { setT(x); onChange?.(x); }}
      onBlur={commit}
      onSubmitEditing={commit}
      autoFocus={autoFocus}
      returnKeyType="done"
      blurOnSubmit
      accessibilityLabel={tx('Titel', 'Title')}
      placeholder={tx('Titel', 'Title')}
      placeholderTextColor={tokens.mute}
      selectionColor={tokens.select} cursorColor={tokens.ink}
      style={[{ flex: 1, minWidth: 0, fontFamily: fonts[600], fontSize: 29, lineHeight: 35, letterSpacing: -0.5, color: tokens.ink, padding: 0 }, noOutline]}
    />
  );
  // Brand (27.11.): the title itself is the head of the page, big and tight, on as many lines as it needs.
  if (hero) return (
    <TextInput
      value={t}
      onChangeText={(x) => { setT(x); onChange?.(x); }}
      onBlur={commit}
      onSubmitEditing={commit}
      autoFocus={autoFocus}
      multiline
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      accessibilityLabel={tx('Titel', 'Title')}
      placeholder={tx('Neuer Termin', 'New event')}
      placeholderTextColor={tokens.mute}
      selectionColor={tokens.select} cursorColor={tokens.ink}
      style={[{ fontFamily: fonts[700], fontSize: 34, lineHeight: 38, letterSpacing: -0.95, color: tokens.ink, padding: 0 }, noOutline]}
    />
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <PressScale accessibilityLabel={tx('Symbol ändern', 'Change icon')} scale={0.9} hitSlop={10} onPress={onIcon}>
        <ClayIcon key={icon} name={icon} size={32} />
      </PressScale>
      {input}
    </View>
  );
}

/** About how high the open "Wann" card is with its line: head, sentence, the pills for start and length, one month. */
const WHEN_OPEN = 634;

/**
 * With the symbol large on top, the open "Wann" card can end below a short screen. The page then moves up by just what
 * is missing, never more. Put the returned handler on the box that holds the lines.
 */
export function useWhenInView(scroll: React.RefObject<ScrollView | null>, open: boolean) {
  const { height } = useWindowDimensions();
  const y = useRef(-1);
  const show = () => {
    if (!open || y.current < 0) return;
    // What the page shows: the screen without the bar on top and the talk bar at the foot.
    const over = y.current + WHEN_OPEN - (height - FORM_HEAD - 110);
    if (over > 0) scroll.current?.scrollTo({ y: Math.min(Math.max(0, y.current - 8), over), animated: true });
  };
  useEffect(() => { const t = setTimeout(show, 120); return () => clearTimeout(t); }, [open]);
  return (e: LayoutChangeEvent) => { const first = y.current < 0; y.current = e.nativeEvent.layout.y; if (first) show(); };
}

/** One line: the question on the left, the answer on the right; `below` opens under it (pills, a calendar, a list). */
export function FormRow({ label, children, onPress, last, below }: { label: string; children?: React.ReactNode; onPress?: () => void; last?: boolean; below?: React.ReactNode }) {
  const row = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: FORM_ROW, paddingVertical: 10 }}>
      <Txt size={15.5} line={21} weight={500} tracking={-0.19}>{label}</Txt>
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>{children}</View>
    </View>
  );
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.groupLine }}>
      {onPress ? <PressScale scale={0.99} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>{row}</PressScale> : row}
      {below ? <View style={{ paddingBottom: 12 }}>{below}</View> : null}
    </View>
  );
}

/** The answer as plain words; grey when nothing is set yet ("Nie", "Hinzufügen"). */
export function FormValue({ children, dim }: { children: string; dim?: boolean }) {
  return <Txt size={15} line={20} color={dim ? tokens.mute : tokens.sub} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>{children}</Txt>;
}

/** A white pill in a line: the day, the time, how long. */
export function FormChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" scale={0.95} onPress={onPress}
      style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.group }}>
      <Txt size={15} line={20} weight={500} numberOfLines={1}>{label}</Txt>
    </PressScale>
  );
}

/** The choices that open under a line: the chosen one is dark. */
export function FormPicks({ items, value, onPick }: { items: { key: string; label: string }[]; value: string | null; onPick: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <PressScale key={it.key || 'none'} accessibilityRole="button" accessibilityState={{ selected: on }} scale={0.95} onPress={() => { haptics.select(); onPick(it.key); }}
            style={{ height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: on ? tokens.ink : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={14.5} weight={on ? 600 : 500} color={on ? tokens.onInk : tokens.ink}>{it.label}</Txt>
          </PressScale>
        );
      })}
    </View>
  );
}

/** Words written straight into a line, on the right. Kept when the field is left, or letter by letter with `live`. */
export function FormInput({ value, placeholder, label, onCommit, live }: { value: string; placeholder: string; label: string; onCommit: (t: string) => void; live?: boolean }) {
  const [t, setT] = useState(value);
  useEffect(() => { setT(value); }, [value]);
  const commit = () => { const v = t.trim(); if (v !== value.trim()) { if (!live) haptics.commit(); onCommit(v); } };
  return (
    <TextInput
      value={t}
      onChangeText={(x) => { setT(x); if (live) onCommit(x); }}
      onBlur={commit}
      onSubmitEditing={commit}
      returnKeyType="done"
      blurOnSubmit
      accessibilityLabel={label}
      placeholder={placeholder}
      placeholderTextColor={tokens.mute}
      selectionColor={tokens.select} cursorColor={tokens.ink}
      maxLength={2000}
      style={[{ flex: 1, minWidth: 0, textAlign: 'right', fontFamily: fonts[400], fontSize: 15, color: tokens.sub, padding: 0 }, noOutline]}
    />
  );
}

/** Who has it: the parents and the family as circles, the ones who go stand full, the others faint. One tap each. */
export function FormWho({ who, people, onWho, onPerson }: { who: Who; people: string[]; onWho: (w: Who) => void; onPerson: (id: string) => void }) {
  const family = useStore((s) => s.people);
  const has = (p: 'J' | 'T') => who === p || who === 'both';
  const flip = (p: 'J' | 'T') => {
    const o = p === 'J' ? 'T' : 'J';
    haptics.select();
    onWho(has(p) ? (has(o) ? o : null) : has(o) ? 'both' : p);
  };
  const circle = (key: string, on: boolean, name: string, onPress: () => void, child: React.ReactNode) => (
    <PressScale key={key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={name} scale={0.9} hitSlop={4} onPress={onPress} style={{ opacity: on ? 1 : 0.38 }}>
      {child}
    </PressScale>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
      {(['J', 'T'] as const).map((p) => circle(p, has(p), p, () => flip(p), <Avatar p={p} size={28} />))}
      {family.map((f) => circle(f.id, people.includes(f.id), f.name, () => { haptics.select(); onPerson(f.id); }, <PersonDot name={f.name} color={f.color} size={28} id={f.id} />))}
    </View>
  );
}

const lengthLabel = (m: number) => (m < 60 ? tx(`${m} Min`, `${m} min`) : m % 60 === 0 ? tx(`${m / 60} Std`, `${m / 60} h`) : tx(`${Math.floor(m / 60)} Std ${m % 60}`, `${Math.floor(m / 60)} h ${m % 60}`));

/** When, as one quiet line of the brand: "Sa 2. Jan · 09:15 bis 10:00". */
export function whenText(w: When): string {
  if (w.endDate && w.endDate > w.date) return whenLine({ date: w.date, endDate: w.endDate });
  if (!w.start) return `${short(w.date)} · ${tx('ganztägig', 'all day')}`;
  return w.end && w.end > w.start ? `${short(w.date)} · ${hm(w.start)} ${tx('bis', 'to')} ${hm(w.end)}` : `${short(w.date)} · ${hm(w.start)}`;
}

/** When, as the pills of the draft: the day, the time and how long. A whole day says so; several days stand as one pill. */
export function whenChips(w: When): string[] {
  if (w.endDate && w.endDate > w.date) return [whenLine({ date: w.date, endDate: w.endDate })];
  if (!w.start) return [short(w.date), tx('Ganztägig', 'All day')];
  const len = w.end ? minutes(w.end) - minutes(w.start) : 0;
  return len > 0 ? [short(w.date), hm(w.start), lengthLabel(len)] : [short(w.date), hm(w.start)];
}
