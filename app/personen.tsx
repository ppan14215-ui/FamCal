/**
 * Eure Familie (Julian 28.10.: "auch Kinder und Großeltern"). The two parents
 * come from the sign-in; everyone else is added here with a name, what they
 * are and a colour, a birthday if you like (it becomes a yearly Termin with a
 * reminder a week before). They can then be "dabei" on any Termin.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1, Group, Meta, Seg, Btn, Lead } from '../src/components/ui/kit';
import { Field } from '../src/components/Field';
import DateField from '../src/components/DateField';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import LineIcon from '../src/components/ui/LineIcon';
import { Avatar, PersonDot } from '../src/components/ui/Person';
import { tokens, personPalette, persons, shade } from '../src/theme';
import { useStore, actions, toast, get } from '../src/state/store';
import type { Person, CalEvent } from '../src/state/types';
import { dayMonth, year, TODAY } from '../src/lib/dates';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

const KINDS: { key: Person['kind']; label: string }[] = [
  { key: 'kind', label: tx('Kind', 'Child') },
  { key: 'grosseltern', label: tx('Großeltern', 'Grandparent') },
  { key: 'andere', label: tx('Andere', 'Other') },
];
const kindLabel = (k: Person['kind']) => KINDS.find((x) => x.key === k)?.label ?? '';

/** The next birthday as a yearly Termin, reminded a week before, unless one is there already. */
function birthdayEvent(p: Person) {
  if (!p.birthday) return;
  const [, m, d] = p.birthday.split('-');
  let next = `${year(TODAY)}-${m}-${d}`;
  if (next < TODAY) next = `${year(TODAY) + 1}-${m}-${d}`;
  // A name that already says it ("Jerome Geburtstag") must not say it twice (Julian 31.10.).
  const name = p.name.replace(/\s*\b(geburtstag|birthday|bday)\b\s*/gi, ' ').trim() || p.name;
  const title = tx(`Geburtstag ${name}`, `${name}'s birthday`);
  if (get().events.some((e) => e.title === title)) return;
  const e: CalEvent = { id: `bd-${p.id}`, title, icon: 'geburtstag', date: next, start: '00:00', allDay: true, who: 'both', repeat: tx('Jährlich', 'Every year'), reminder: '1w', countdown: true, people: [p.id], note: tx('Geschenkidee: ', 'Gift idea: ') };
  actions.addEvent(e);
  return next;
}

export default function Personen() {
  const people = useStore((s) => s.people);
  const names = useStore((s) => s.names);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Person['kind']>('kind');
  const [color, setColor] = useState(personPalette[2].name);
  const [birthday, setBirthday] = useState<string | null>(null);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    haptics.commit();
    const id = actions.addPerson({ name: n, kind, color, birthday: birthday ?? undefined });
    const p = get().people.find((x) => x.id === id);
    const bd = p ? birthdayEvent(p) : undefined;
    toast(bd ? tx(`${n} ist dabei, Geburtstag am ${dayMonth(bd)} eingetragen`, `${n} added, birthday on ${dayMonth(bd)}`) : tx(`${n} ist dabei`, `${n} added`));
    setName(''); setBirthday(null);
  };
  const remove = (p: Person) => {
    haptics.commit();
    const gone = actions.removePerson(p.id);
    if (gone) toast(tx(`${p.name} entfernt`, `${p.name} removed`), () => actions.setPeople([...get().people, gone]));
  };

  return (
    <Screen>
      <BackBar />
      <H1 dot=".">{tx('Eure Familie', 'Your family')}</H1>
      <Lead>{tx('Wer bei einem Termin dabei ist, wählt ihr dann mit einem Tipp. Geburtstage landen als jährlicher Termin im Kalender.', 'Pick who is coming along on any event with one tap. Birthdays become a yearly event.')}</Lead>
      <Group>
        {(['J', 'T'] as const).filter((r) => names[r]).map((r) => (
          <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: tokens.row }}>
            <Avatar p={r} size={32} />
            <View style={{ flex: 1 }}><Txt size={16} weight={600}>{persons[r].name}</Txt><Meta>{tx('Elternteil', 'Parent')}</Meta></View>
          </View>
        ))}
        {people.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: tokens.row }}>
            <PersonDot name={p.name} color={p.color} size={32} />
            <View style={{ flex: 1 }}>
              <Txt size={16} weight={600}>{p.name}</Txt>
              <Meta>{[kindLabel(p.kind), p.birthday ? tx(`Geburtstag ${dayMonth(p.birthday)}`, `Birthday ${dayMonth(p.birthday)}`) : null].filter(Boolean).join(' · ')}</Meta>
            </View>
            <PressScale hitSlop={10} accessibilityLabel={tx(`${p.name} entfernen`, `Remove ${p.name}`)} onPress={() => remove(p)}>
              <LineIcon name="x" size={18} color={tokens.mute} />
            </PressScale>
          </View>
        ))}
      </Group>

      <Txt size={13} weight={600} color={tokens.sub} style={{ marginTop: 8 }}>{tx('Jemanden hinzufügen', 'Add someone')}</Txt>
      <Field label={tx('Name', 'Name')} value={name} onChangeText={setName} placeholder={tx('Zum Beispiel Mia oder Oma Gisela', 'For example Mia or Grandma')} />
      <Seg items={KINDS} value={kind} onChange={(k) => setKind(k as Person['kind'])} />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {personPalette.map(shade).map((c) => (
          <PressScale key={c.name} accessibilityLabel={c.name} accessibilityState={{ selected: color === c.name }} onPress={() => { haptics.select(); setColor(c.name); }}
            style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color === c.name ? c.fg : 'transparent' }}>
            <Txt size={15} weight={600} color={c.fg}>{name.trim()[0]?.toUpperCase() ?? ''}</Txt>
          </PressScale>
        ))}
      </View>
      <Group>
        <DateField label={tx('Geburtstag (optional)', 'Birthday (optional)')} value={birthday} onChange={setBirthday} past />
      </Group>
      <Btn label={tx('Hinzufügen', 'Add')} onPress={add} disabled={!name.trim()} />
    </Screen>
  );
}
