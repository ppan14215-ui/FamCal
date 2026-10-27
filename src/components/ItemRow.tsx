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
import { ClayIcon } from './ui/Clay';
import SwipeRow from './SwipeRow';
import { tokens, fonts } from '../theme';
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
};

export default function ItemRow({ title, editText, meta, metaColor, done, who, icon, onToggle, onEdit, onCycleWho, onDelete, onPressTitle, noCheck, editHint = tx('Menge und Notiz einfach mitschreiben', 'Just add amount and note') }: Props) {
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

  const body = (
    <View style={{ paddingVertical: editing ? 12 : 10, paddingHorizontal: 14, backgroundColor: tokens.row, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {noCheck ? null : <Check done={done} onPress={onToggle} />}
        {icon ? <ClayIcon name={icon} size={42} celebrate={done} /> : null}
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            onBlur={commit}
            onSubmitEditing={commit}
            returnKeyType="done"
            selectionColor={tokens.ink}
            style={[{ flex: 1, minWidth: 0, fontFamily: fonts[500], fontSize: 17, color: tokens.ink, paddingVertical: 2 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        ) : (
          <PressScale
            style={{ flex: 1, minWidth: 0 }}
            onPress={() => {
              if (onPressTitle) return onPressTitle();
              if (!onEdit) return;
              setText(editText ?? title);
              open.current = true;
              setEditing(true);
            }}
          >
            <Txt size={16} weight={500} strike={done} color={done ? tokens.mute : tokens.ink}>{title}</Txt>
            {meta ? <Meta color={metaColor}>{meta}</Meta> : null}
          </PressScale>
        )}
        <PressScale
          hitSlop={10}
          disabled={!onCycleWho}
          accessibilityLabel={tx('Zuständig wechseln', 'Change who\'s on it')}
          onPress={() => { haptics.select(); onCycleWho?.(); }}
        >
          {who || (onCycleWho && !done) ? <Owner who={who} size={editing ? 26 : 22} /> : null}
        </PressScale>
      </View>
      {editing ? <Txt size={13} color={tokens.mute} style={{ paddingLeft: noCheck ? 0 : 38 }}>{editHint}</Txt> : null}
    </View>
  );

  return onDelete ? <SwipeRow onDelete={onDelete}>{body}</SwipeRow> : body;
}
