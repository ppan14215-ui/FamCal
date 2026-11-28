/**
 * A list line with the three fixed gestures (Julian 26.10., "wie Wabi"):
 * - Haken antippen: erledigt (the only way).
 * - Text antippen: the line becomes a text field, nothing else. Quantity and
 *   note are read from the text ("2 Hafermilch, ungesüßt").
 * - Person antippen: Tom, Julia, niemand.
 * - Nach links wischen: löschen, then Rückgängig (SwipeRow).
 */
import React, { useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import { Check, Meta } from './ui/kit';
import { Owner } from './ui/Person';
import { Initials } from './ui/Group';
import { ClayIcon } from './ui/Clay';
import SwipeRow from './SwipeRow';
import { tokens, fonts, persons } from '../theme';
import { haptics } from '../lib/haptics';
import type { ClayName } from '../lib/clayIcons';
import type { Who } from '../state/types';
import PressScale from './ui/PressScale';
import { tx } from '../i18n/lang';

type Props = {
  title: string;
  /** Text shown in the editor (may include quantity and note). */
  editText?: string;
  meta?: string;
  metaColor?: string;
  done: boolean;
  who: Who;
  icon?: ClayName;
  onToggle: () => void;
  onEdit?: (text: string) => void;
  onCycleWho?: () => void;
  onDelete?: () => void;
  onPressTitle?: () => void;
  editHint?: string;
  /** Collections have no check: a film to watch is never done. */
  noCheck?: boolean;
  /** Left of the title, e.g. a cover. */
  lead?: React.ReactNode;
  /** Under the title, e.g. stars and fact chips. */
  below?: React.ReactNode;
  /** In place of the person, e.g. the seen pill. */
  trailing?: React.ReactNode;
  /** Seen in a collection: dimmed, but stays in place. */
  dim?: boolean;
  /**
   * Klar look as Julian approved it (14.11.): the line lies flat on the page ground, hairlines only. Check, small
   * icon, the title with its note behind it on the same line, and who as a small dot in the person's colour.
   */
  flat?: boolean;
  /** Flat: keep the icon's place free on a line without one, so the titles of a list stand in one column. */
  iconSlot?: boolean;
};

/** Who is on it, as a dot in the person's colour; nobody yet is a faint ring you can tap. */
function WhoDots({ who, empty }: { who: Who; empty: boolean }) {
  const dot = (c: string, k: number) => <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />;
  if (who === 'both') return <View style={{ flexDirection: 'row', gap: 3 }}>{dot(persons.J.ink, 0)}{dot(persons.T.ink, 1)}</View>;
  if (who) return dot(persons[who].ink, 0);
  return empty ? <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: tokens.circleLine }} /> : null;
}

export default function ItemRow({ title, editText, meta, metaColor, done, who, icon, onToggle, onEdit, onCycleWho, onDelete, onPressTitle, noCheck, lead, below, trailing, dim, flat, iconSlot, editHint = tx('Menge und Notiz einfach mitschreiben', 'Just add amount and note') }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(editText ?? title);

  // Submit and blur both commit; the ref keeps it to once.
  const open = useRef(false);
  const commit = () => {
    if (!open.current) return;
    open.current = false;
    setEditing(false);
    const t = text.trim();
    // An emptied line is deleted (with Rückgängig), or keeps its old text.
    if (!t) { if (onDelete) onDelete(); else setText(editText ?? title); return; }
    if (onEdit && t !== (editText ?? title)) onEdit(t);
  };

  // Flat: the note stands behind the title on the same line, unless the row carries more (a cover, stars).
  // Brand (27.11.): the note stands under the title in grey, never behind it.
  const inline = false;
  const ink = who && who !== 'both' ? persons[who].ink : tokens.ink;
  const body = (
    <View style={flat ? { minHeight: 56, justifyContent: 'center', paddingVertical: editing ? 12 : 10, backgroundColor: tokens.group, gap: 6 } : { paddingVertical: editing ? 12 : 10, paddingHorizontal: 14, backgroundColor: tokens.row, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: lead ? 'flex-start' : 'center', gap: 12 }}>
        {noCheck ? null : <Check done={done} onPress={onToggle} />}
        {lead}
        {/* Brand (27.11.): no icons in the lines, the words carry it. */}
        {flat ? null : icon ? <ClayIcon name={icon} size={42} celebrate={done} /> : null}
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            onBlur={commit}
            onSubmitEditing={commit}
            returnKeyType="done"
            selectionColor={tokens.select} cursorColor={tokens.ink}
            style={[{ flex: 1, minWidth: 0, fontFamily: fonts[flat ? 400 : 500], fontSize: 17, color: tokens.ink, paddingVertical: 2 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        ) : (
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <PressScale
            style={{ minWidth: 0 }}
            onPress={() => {
              if (onPressTitle) return onPressTitle();
              if (!onEdit) return;
              setText(editText ?? title);
              open.current = true;
              setEditing(true);
            }}
          >
            {flat ? (
              <Txt size={15.5} line={21} weight={500} tracking={-0.19} color={done || dim ? tokens.mute : tokens.ink}>
                {title}
                {meta && inline ? <Txt size={14.5} line={22} color={metaColor ?? tokens.sub}>{`  ${meta}`}</Txt> : null}
              </Txt>
            ) : <Txt size={16} weight={500} strike={done} color={done || dim ? tokens.mute : tokens.ink}>{title}</Txt>}
            {meta && !inline ? <Txt size={13} line={17} color={metaColor ?? (done ? tokens.mute : tokens.sub)} numberOfLines={2}>{meta}</Txt> : null}
          </PressScale>
          {below}
          </View>
        )}
        {trailing}
        <PressScale
          hitSlop={flat ? 16 : 10}
          disabled={!onCycleWho}
          accessibilityLabel={tx('Zuständig wechseln', 'Change who\'s on it')}
          onPress={() => { haptics.select(); onCycleWho?.(); }}
        >
          {flat ? <View style={{ opacity: done ? 0.45 : 1 }}><Initials who={who} open={!!onCycleWho && !done} /></View> : who || (onCycleWho && !done) ? <Owner who={who} size={editing ? 26 : 22} /> : null}
        </PressScale>
      </View>
      {editing ? <Txt size={13} color={tokens.mute} style={{ paddingLeft: noCheck ? 0 : 36 }}>{editHint}</Txt> : null}
    </View>
  );

  return onDelete ? <SwipeRow onDelete={onDelete} bg={flat ? tokens.group : undefined}>{body}</SwipeRow> : body;
}
