/**
 * Wer ist dabei (Julian 28.10.): besides the parent who goes, the children,
 * grandparents and others of the family, one tap each. New people are added
 * on the Familie page.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { PersonDot } from './ui/Person';
import { tokens } from '../theme';
import { useStore } from '../state/store';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

export default function TerminPeople({ ids, onToggle }: { ids: string[]; onToggle: (id: string) => void }) {
  const people = useStore((s) => s.people);
  return (
    <View style={{ gap: 8 }}>
      <Txt size={13} weight={600} color={tokens.sub}>{tx('Dabei', 'Coming along')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {people.map((p) => {
          const on = ids.includes(p.id);
          return (
            <PressScale key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { haptics.select(); onToggle(p.id); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 5, paddingRight: 12, borderRadius: 999, backgroundColor: on ? tokens.doneSoft : tokens.chipBg, borderWidth: 1.5, borderColor: on ? tokens.done : 'transparent' }}>
              <PersonDot name={p.name} color={p.color} size={24} />
              <Txt size={14} weight={on ? 600 : 500} color={on ? tokens.done : tokens.ink}>{p.name}</Txt>
            </PressScale>
          );
        })}
        <PressScale accessibilityLabel={tx('Person hinzufügen', 'Add person')} onPress={() => { haptics.select(); router.push('/personen'); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tokens.circleLine }}>
          <LineIcon name="plus" size={14} color={tokens.sub} />
          <Txt size={14} color={tokens.sub}>{people.length ? tx('Person', 'Person') : tx('Kinder, Großeltern', 'Kids, grandparents')}</Txt>
        </PressScale>
      </View>
    </View>
  );
}
