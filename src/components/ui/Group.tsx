/**
 * Grouped lists of the brand (27.11., polished like iOS settings and Notion): rows lie together on one soft grey
 * ground with rounded corners, a fine line between them, a section title above. One shape for Termine, list items
 * and settings, so every screen reads the same way.
 *
 * Motion: a row presses down a little (PressScale); rows that arrive together rise in one after another (rise), a row
 * that leaves sinks away (cardOut). Transform and opacity only.
 */
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Txt from './Txt';
import LineIcon from './LineIcon';
import PressScale from './PressScale';
import { tokens, persons, allColors, personPalette, shade, PersonId } from '../../theme';
import { useStore } from '../../state/store';
import { usePersons } from './Person';

/** The section title above a group ("Aufgaben", "Familie"). */
export function SectionLabel({ children, right, first }: { children: React.ReactNode; right?: React.ReactNode; first?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: first ? 4 : 26, marginBottom: 10 }}>
      <Txt size={17} line={22} weight={600} tracking={-0.25}>{children}</Txt>
      {right}
    </View>
  );
}

/** The grey ground a group of rows lies on. Children are rows; the lines between them are drawn here. */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: tokens.group, borderRadius: 16, paddingHorizontal: 14 }, style]}>
      {rows.map((r, i) => (
        <View key={(r as any).key ?? i} style={i ? { borderTopWidth: 1, borderTopColor: tokens.groupLine } : undefined}>{r}</View>
      ))}
    </View>
  );
}

/** A settings row: the label on the left, the value grey on the right, a chevron when it opens something. */
export function GroupRow({ label, value, onPress, right, chev = !!onPress, danger }: { label: string; value?: string; onPress?: () => void; right?: React.ReactNode; chev?: boolean; danger?: boolean }) {
  const body = (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
      <Txt size={15.5} line={21} weight={500} tracking={-0.19} color={danger ? tokens.danger : tokens.ink} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>{label}</Txt>
      {right ?? (value ? <Txt size={15} line={20} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Txt> : null)}
      {chev ? <LineIcon name="chev" size={14} color={tokens.mute} stroke={2} /> : null}
    </View>
  );
  if (!onPress) return body;
  return <PressScale scale={0.985} onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label}>{body}</PressScale>;
}

type Face = { key: string; bg: string; letter: string };

/** Who a Termin or an item is for: their initials on their colour, overlapping a little. Nobody: a dashed ring. */
export function Initials({ who, people: ids, size = 24, ring = tokens.group, open }: { who?: PersonId | 'both' | null; people?: string[]; size?: number; ring?: string; open?: boolean }) {
  const stored = useStore((s) => s.people);
  const pp = usePersons();
  const parents: PersonId[] = who === 'both' ? ['J', 'T'] : who ? [who] : [];
  const faces: Face[] = [
    ...parents.map((p) => ({ key: p as string, bg: pp[p]?.tint ?? persons[p].tint, letter: (pp[p]?.name ?? persons[p].name).trim()[0]?.toUpperCase() || p })),
    ...(ids ?? []).flatMap((id) => {
      const p = stored.find((x) => x.id === id);
      if (!p) return [];
      const c = shade(allColors.find((x) => x.name === p.color) ?? personPalette[2]);
      return [{ key: p.id, bg: c.bg, letter: p.name.trim()[0]?.toUpperCase() ?? '?' }];
    }),
  ];
  if (!faces.length) {
    if (!open) return null;
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B4C0BE' }} />;
  }
  const shown = faces.slice(0, 4);
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((f, i) => (
        <View key={f.key} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center', marginLeft: i ? -7 : 0, boxShadow: `0 0 0 2px ${ring}` } as any}>
          <Txt size={size * 0.46} line={size * 0.6} weight={600} color="#FFFFFF">{f.letter}</Txt>
        </View>
      ))}
    </View>
  );
}
