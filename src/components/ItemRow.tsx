/**
 * A list line with the three fixed gestures (Julian 26.10., "wie Wabi"):
 * - Haken antippen: erledigt (the only way).
 * - Text antippen: the line becomes a text field, nothing else. Quantity and
 *   note are read from the text ("2 Hafermilch, ungesüßt").
 * - Person antippen: Tom, Julia, niemand.
 * - Nach links wischen: löschen, then Rückgängig (SwipeRow).
 */
import React, { useState } from 'react';
import { View, Pressable, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import { Check, Meta } from './ui/kit';
import { Owner } from './ui/Person';
import { ClayIcon } from './ui/Clay';
import SwipeRow from './SwipeRow';
import { tokens, fonts } from '../theme';
import { haptics } from '../lib/haptics';
import type { ClayName } from '../lib/clayIcons';
import type { Who } from '../state/types';

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
};

export default function ItemRow({ title, editText, meta, metaColor, done, who, icon, onToggle, onEdit, onCycleWho, onDelete, onPressTitle, editHint = 'Menge und Notiz einfach mitschreiben' }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(editText ?? title);

  const commit = () => {
    setEditing(false);
    if (onEdit && text.trim() !== (editText ?? title)) onEdit(text);
  };

  const body = (
    <View style={{ paddingVertical: editing ? 12 : 10, paddingHorizontal: 14, backgroundColor: tokens.row, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Check done={done} onPress={onToggle} />
        {icon ? <ClayIcon name={icon} size={30} /> : null}
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
          <Pressable
            style={{ flex: 1, minWidth: 0 }}
            onPress={() => {
              if (onPressTitle) return onPressTitle();
              if (!onEdit) return;
              setText(editText ?? title);
              setEditing(true);
            }}
          >
            <Txt size={16} weight={500} strike={done} color={done ? tokens.mute : tokens.ink}>{title}</Txt>
            {meta ? <Meta color={metaColor}>{meta}</Meta> : null}
          </Pressable>
        )}
        <Pressable
          hitSlop={10}
          disabled={!onCycleWho}
          accessibilityLabel="Zuständig wechseln"
          onPress={() => { haptics.select(); onCycleWho?.(); }}
        >
          {who || (onCycleWho && !done) ? <Owner who={who} size={editing ? 26 : 22} /> : null}
        </Pressable>
      </View>
      {editing ? <Txt size={13} color={tokens.mute} style={{ paddingLeft: 38 }}>{editHint}</Txt> : null}
    </View>
  );

  return onDelete ? <SwipeRow onDelete={onDelete}>{body}</SwipeRow> : body;
}
