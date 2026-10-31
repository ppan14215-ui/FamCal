/** Kommentare am Termin: short notes between the parents, newest at the bottom. */
import React, { useEffect, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { Avatar } from './ui/Person';
import { Card } from './ui/kit';
import { tokens, fonts, persons } from '../theme';
import { useStore } from '../state/store';
import { loadComments, addComment, deleteComment } from '../lib/comments';
import { myRole, getFamily } from '../lib/sync';
import { seriesId } from '../lib/repeat';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const clock = (iso: string) => { const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export default function TerminComments({ eventId }: { eventId: string }) {
  const eid = seriesId(eventId);
  const list = useStore((s) => s.comments[eid]) ?? [];
  const [text, setText] = useState('');
  useEffect(() => { void loadComments(eid); }, [eid]);
  const me = getFamily() ? myRole() : 'J';
  const send = () => { const t = text.trim(); if (!t) return; haptics.commit(); setText(''); void addComment(eid, t); };
  return (
    <Card pad={14} gap={10}>
      <Txt size={13} weight={600} color={tokens.sub}>{tx('Kommentare', 'Comments')}</Txt>
      {list.map((c) => (
        <View key={c.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Avatar p={c.role} size={26} />
          <View style={{ flex: 1 }}>
            <Txt size={15} line={21}>{c.body}</Txt>
            <Txt size={12} color={tokens.mute}>{persons[c.role].name} · {clock(c.at)}</Txt>
          </View>
          {c.role === me ? (
            <PressScale hitSlop={8} accessibilityLabel={tx('Kommentar löschen', 'Delete comment')} onPress={() => { haptics.select(); void deleteComment(eid, c.id); }}>
              <LineIcon name="x" size={16} color={tokens.mute} />
            </PressScale>
          ) : null}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: tokens.chipBg, paddingLeft: 14, paddingRight: 4, minHeight: 40 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
          maxLength={1000}
          placeholder={list.length ? tx('Antworten …', 'Reply …') : tx('Zum Beispiel: Ich hol ihn ab', 'For example: I will pick him up')}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.select} cursorColor={tokens.ink}
          style={[{ flex: 1, fontFamily: fonts[400], fontSize: 15, color: tokens.ink, paddingVertical: 8 }, noOutline]}
        />
        {text.trim() ? (
          <PressScale accessibilityLabel={tx('Senden', 'Send')} onPress={send} style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
            <LineIcon name="send" size={16} color={tokens.onInk} />
          </PressScale>
        ) : null}
      </View>
    </Card>
  );
}
