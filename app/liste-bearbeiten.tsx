/**
 * Liste bearbeiten (Julian 30.10.: "Listen und Icons für Listen können nicht
 * bearbeitet werden?"): name and icon, like when it was made. Opened by holding
 * a list's tab or from "Bearbeiten" under the list.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, CancelBar, Btn } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import { tokens, tint, fonts } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

export default function ListeBearbeiten() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const draft = useStore((s) => s.draftSymbol);
  const [name, setName] = useState(list?.name ?? '');
  const [icon, setIcon] = useState(list?.icon ?? 'checkliste');

  // Only a pick made from here counts, as on Neue Liste.
  const asked = useRef(false);
  useEffect(() => () => actions.clearDraftSymbol(), []);
  useEffect(() => {
    if (!draft) return;
    if (asked.current) setIcon(draft);
    asked.current = false;
    actions.clearDraftSymbol();
  }, [draft]);

  if (!list) return <Screen gap={12}><CancelBar /><Txt size={15} color={tokens.sub}>{tx('Die Liste gibt es nicht mehr.', 'This list is gone.')}</Txt></Screen>;
  const shopping = list.id === 'einkauf';

  return (
    <Screen
      gap={12}
      footer={
        <Btn
          label={tx('Speichern', 'Save')}
          disabled={!name.trim()}
          onPress={() => { haptics.success(); actions.updateList(list.id, { name: name.trim(), icon }); goBack(); }}
        />
      }
    >
      <View style={{ minHeight: 32, justifyContent: 'center' }}>
        <CancelBar />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <Txt size={16} weight={600}>{tx('Liste bearbeiten', 'Edit list')}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <PressScale
          accessibilityLabel={tx('Symbol der Liste wählen', 'Choose the list icon')}
          onPress={() => { haptics.select(); asked.current = true; actions.clearDraftSymbol(); router.push('/symbol'); }}
          style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(icon) }}
        >
          <ClayIcon name={icon} size={52} />
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={11} color={tokens.sub}>✎</Txt>
          </View>
        </PressScale>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={12.5} weight={600} color={tokens.sub} tracking={0.6}>NAME</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus={!shopping}
            selectTextOnFocus
            placeholder={tx('Wofür ist die Liste?', 'What is the list for?')}
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.select} cursorColor={tokens.ink}
            style={[{ fontFamily: fonts[700], fontSize: 24, letterSpacing: -0.5, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
      </View>
      <Txt size={13} line={18} color={tokens.sub}>{tx('Symbol antippen, um es zu ändern.', 'Tap the icon to change it.')}</Txt>

      {!shopping ? (
        <PressScale
          accessibilityLabel={tx(`Liste ${list.name} löschen`, `Delete list ${list.name}`)}
          onPress={() => { haptics.tap(); actions.deleteList(list.id); goBack(); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 12 }}
        >
          <LineIcon name="x" size={16} color={tokens.frist} />
          <Txt size={15} weight={600} color={tokens.frist}>{tx('Liste löschen', 'Delete list')}</Txt>
        </PressScale>
      ) : null}
    </Screen>
  );
}
