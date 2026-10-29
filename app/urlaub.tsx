/**
 * Urlaub und Feiertage (Julian 29.10.): each parent sets their own Urlaubstage per year,
 * the app counts every Urlaub Termin against it. The Bundesland decides the Feiertage.
 */
import React from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1, Lead, H2, Card, Meta, Chip } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import { Avatar } from '../src/components/ui/Person';
import { tokens } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import type { PersonId } from '../src/theme';
import { TODAY, short } from '../src/lib/dates';
import { usedDays, isVacation, costOf } from '../src/lib/urlaub';
import { feiertage } from '../src/lib/feiertage';
import { saveVacation, saveLand } from '../src/lib/sync';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

export const LANDS = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];

export default function Urlaub() {
  const names = useStore((s) => s.names);
  const land = useStore((s) => s.land);
  const year = Number(TODAY.slice(0, 4));
  const next = feiertage(year, land).concat(feiertage(year + 1, land)).filter(([d]) => d >= TODAY).slice(0, 3);
  return (
    <Screen gap={14}>
      <BackBar />
      <H1>{tx('Urlaub und Feiertage', 'Vacation and holidays')}</H1>
      <Lead>{tx('Jeder Urlaubstag im Kalender zählt. Wochenenden und Feiertage kosten nichts.', 'Every vacation day in the calendar counts. Weekends and public holidays cost nothing.')}</Lead>
      {(['J', 'T'] as PersonId[]).filter((p) => names[p] || p === 'J').map((p) => <Budget key={p} p={p} name={names[p] || tx('Du', 'You')} year={year} />)}
      <H2>{tx('Feiertage', 'Public holidays')}</H2>
      <Meta>{land
        ? tx(`Für ${land}. Nächste: ${next.map(([d, t]) => `${t} ${short(d)}`).join(', ')}.`, `For ${land}. Next: ${next.map(([d, t]) => `${t} ${short(d)}`).join(', ')}.`)
        : tx('Wählt euer Bundesland, dann stehen auch die Feiertage dort im Kalender. Bis dahin nur die bundesweiten.', 'Pick your state so its holidays are in the calendar too. Until then only the nationwide ones.')}</Meta>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANDS.map((l) => (
          <Chip key={l} bg={l === land ? tokens.ink : tokens.chipBg} color={l === land ? tokens.bg : tokens.ink} onPress={() => { haptics.select(); actions.setLand(l === land ? '' : l); void saveLand(); }}>{l}</Chip>
        ))}
      </View>
    </Screen>
  );
}

function Budget({ p, name, year }: { p: PersonId; name: string; year: number }) {
  const budget = useStore((s) => s.vacation[p]);
  const events = useStore((s) => s.events);
  const land = useStore((s) => s.land);
  const used = usedDays(events, p, year, land);
  const trips = events.filter((e) => isVacation(e) && (e.who === p || e.who === 'both') && costOf(e, year, land) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const step = (d: number) => { haptics.select(); actions.setVacation(p, (budget ?? 30) + (budget ? d : 0)); void saveVacation(); };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar p={p} size={34} />
        <View style={{ flex: 1 }}>
          <Txt size={16} weight={600}>{name}</Txt>
          <Meta>{budget
            ? tx(`${used} genutzt · noch ${budget - used} ${year}`, `${used} used · ${budget - used} left in ${year}`)
            : tx('Noch kein Budget · tippe auf +', 'No budget yet · tap +')}</Meta>
        </View>
        <Round label="−" onPress={() => step(-1)} disabled={!budget} />
        <Txt size={20} weight={700} style={{ minWidth: 34, textAlign: 'center' }}>{budget ?? '–'}</Txt>
        <Round label="+" onPress={() => step(1)} />
      </View>
      {trips.length ? (
        <View style={{ gap: 4 }}>
          {trips.map((e) => (
            <Meta key={e.id}>{`${e.title} · ${short(e.date)}${e.endDate ? ` ${tx('bis', 'to')} ${short(e.endDate)}` : ''} · ${tx(`${costOf(e, year, land)} Tage`, `${costOf(e, year, land)} days`)}`}</Meta>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const Round = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <PressScale onPress={onPress} disabled={disabled} accessibilityLabel={label === '+' ? tx('Mehr Urlaubstage', 'More days') : tx('Weniger Urlaubstage', 'Fewer days')} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
    <Txt size={19} weight={600}>{label}</Txt>
  </PressScale>
);
