/**
 * Familie, exactly as in the klar draft Julian approved (14.11., "Familie"): the back button and "Einladen" on top,
 * the name of the page with how many you are, then one quiet line per person: the circle, the name with a short grey
 * word behind it, and the person's colour as a dot on the right. Nothing else stands here. "Einladen" opens what is
 * needed to bring someone in: the family code for a partner, or name, colour and birthday for a child or the
 * grandparents (a birthday becomes a yearly Termin with a reminder a week before). A swipe to the left removes.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, H1, H2, Group, Seg, Btn } from '../src/components/ui/kit';
import { Field } from '../src/components/Field';
import DateField from '../src/components/DateField';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import SwipeRow from '../src/components/SwipeRow';
import { HeadBtn, HEAD_SHADOW } from '../src/components/ui/HeaderRight';
import { FormRow, FormValue } from '../src/components/TerminForm';
import { Avatar, PersonDot } from '../src/components/ui/Person';
import { tokens, personPalette, persons, shade, allColors } from '../src/theme';
import { useStore, actions, toast, get } from '../src/state/store';
import type { Person, CalEvent } from '../src/state/types';
import { dayMonth, year, TODAY } from '../src/lib/dates';
import { getFamily } from '../src/lib/sync';
import { goBack } from '../src/lib/nav';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

const KINDS: { key: Person['kind']; label: string }[] = [
  { key: 'kind', label: tx('Kind', 'Child') },
  { key: 'grosseltern', label: tx('Großeltern', 'Grandparent') },
  { key: 'andere', label: tx('Andere', 'Other') },
];

/** The short grey word behind a name: a child's age ("7 J."), or what the person is. */
function note(p: Person) {
  if (p.kind === 'kind' && p.birthday) {
    const [y, m, d] = p.birthday.split('-').map(Number);
    const [ty, tm, td] = TODAY.split('-').map(Number);
    const months = (ty - y) * 12 + (tm - m) - (td < d ? 1 : 0);
    if (months >= 0) return months < 24 ? tx(`${months} Mon.`, `${months} mo`) : tx(`${Math.floor(months / 12)} J.`, `${Math.floor(months / 12)} y`);
  }
  return p.kind === 'kind' ? tx('Kind', 'Child') : p.kind === 'grosseltern' ? tx('Großeltern', 'Grandparent') : '';
}

/** One person as one quiet line (40 of 284 in the draft). */
function Line({ circle, name, word, dot, last }: { circle: React.ReactNode; name: string; word?: string; dot: string; last: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, backgroundColor: tokens.bg, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair }}>
      {circle}
      <Txt size={17} line={22} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
        {name}
        {word ? <Txt size={14.5} line={22} color={tokens.sub}>{`  ${word}`}</Txt> : null}
      </Txt>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
    </View>
  );
}

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
  // "Person hinzufügen" from a Termin opens the form right away.
  const { neu } = useLocalSearchParams<{ neu?: string }>();
  const [adding, setAdding] = useState(neu === '1');
  const code = getFamily()?.invite_code;

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

  const parents = (['J', 'T'] as const).filter((r) => names[r]);
  const count = parents.length + people.length;
  return (
    <Screen gap={18} padTop={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <HeadBtn icon="back" label={tx('Zurück', 'Back')} onPress={goBack} size={19} />
        <PressScale accessibilityRole="button" scale={0.95} hitSlop={6} onPress={() => { haptics.select(); setAdding((a) => !a); }}
          style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', boxShadow: HEAD_SHADOW } as any}>
          <Txt size={16.5} weight={500}>{adding ? tx('Fertig', 'Done') : tx('Einladen', 'Invite')}</Txt>
        </PressScale>
      </View>
      <H1 sub={count === 1 ? tx('1 Person', '1 person') : tx(`${count} Personen`, `${count} people`)}>{tx('Familie', 'Family')}</H1>
      <View style={{ marginTop: -6 }}>
        {parents.map((r, i) => (
          <Line key={r} circle={<Avatar p={r} size={34} />} name={persons[r].name} dot={persons[r].ink} last={i === count - 1} />
        ))}
        {people.map((p, i) => {
          const c = allColors.find((x) => x.name === p.color);
          return (
            <SwipeRow key={p.id} bg={tokens.bg} onDelete={() => remove(p)}>
              <Line circle={<PersonDot name={p.name} color={p.color} size={34} />} name={p.name} word={note(p)} dot={c ? shade(c).fg : tokens.circleLine} last={parents.length + i === count - 1} />
            </SwipeRow>
          );
        })}
      </View>
      {adding ? (
        <>
          {code ? (
            <View>
              <H2>{tx('Mit eigenem Handy', 'With their own phone')}</H2>
              <FormRow last label={tx('Familiencode', 'Family code')} onPress={async () => { await Clipboard.setStringAsync(code).catch(() => {}); toast(tx('Code kopiert', 'Code copied')); }}>
                <FormValue>{code}</FormValue>
              </FormRow>
            </View>
          ) : null}
          <H2>{tx('Ohne eigenes Handy', 'Without a phone')}</H2>
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
        </>
      ) : null}
    </Screen>
  );
}
