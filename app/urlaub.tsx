/**
 * Urlaub und Feiertage (Julian 29.10.): each parent sets their own Urlaubstage per year,
 * the app counts every Urlaub Termin against it. The Bundesland decides the Feiertage.
 */
import React, { useState } from 'react';
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
import { COUNTRIES, countryName, regions, regionName, phoneCountry } from '../src/lib/holidays';
import { suggestPlaces } from '../src/lib/places';
import { Field } from '../src/components/Field';
import { saveVacation, saveLand } from '../src/lib/sync';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

export default function Urlaub() {
  const names = useStore((s) => s.names);
  const land = useStore((s) => s.land);
  const country = useStore((s) => s.country);
  const city = useStore((s) => s.city);
  const events = useStore((s) => s.events);
  const [allCountries, setAllCountries] = useState(false);
  const [ort, setOrtText] = useState(city);
  const year = Number(TODAY.slice(0, 4));
  const next = events.filter((e) => e.cal === 'feiertage' && e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const here = country === 'DE' ? land : land ? regionName(country, land) : '';
  const list = regions(country);
  const shown = allCountries ? COUNTRIES.map(([c]) => c) : [...new Set([country, phoneCountry(), 'DE', 'AT', 'CH', 'US', 'GB'])];
  const pickCountry = (c: string) => { haptics.select(); actions.setCountry(c); setAllCountries(false); void saveLand(); };
  const pickRegion = (r: string) => { haptics.select(); actions.setLand(r === land ? '' : r); void saveLand(); };
  const places = country === 'DE' && land === 'Bayern' && ort !== city ? suggestPlaces(ort, 4).filter((p) => p.land === 'Bayern') : [];
  return (
    <Screen gap={14}>
      <BackBar />
      <H1>{tx('Urlaub und Feiertage', 'Vacation and holidays')}</H1>
      <Lead>{tx('Jeder Urlaubstag im Kalender zählt. Wochenenden und Feiertage kosten nichts.', 'Every vacation day in the calendar counts. Weekends and public holidays cost nothing.')}</Lead>
      {(['J', 'T'] as PersonId[]).filter((p) => names[p] || p === 'J').map((p) => <Budget key={p} p={p} name={names[p] || tx('Du', 'You')} year={year} />)}
      <H2>{tx('Feiertage', 'Public holidays')}</H2>
      <Meta>{next.length
        ? tx(`${[countryName(country), here].filter(Boolean).join(', ')}. Nächste: ${next.map((e) => `${e.title} ${short(e.date)}`).join(', ')}.`, `${[countryName(country), here].filter(Boolean).join(', ')}. Next: ${next.map((e) => `${e.title} ${short(e.date)}`).join(', ')}.`)
        : tx('Wählt Land und Region, dann stehen eure Feiertage im Kalender.', 'Pick your country and region so your holidays are in the calendar.')}</Meta>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {shown.map((c) => <Pick key={c} on={c === country} label={countryName(c)} onPress={() => pickCountry(c)} />)}
        {allCountries ? null : <Pick on={false} label={tx('Anderes Land …', 'Other country …')} onPress={() => setAllCountries(true)} />}
      </View>
      {list.length ? (
        <>
          <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4 }}>{country === 'DE' ? tx('Bundesland', 'State') : country === 'US' ? tx('Bundesstaat', 'State') : tx('Region', 'Region')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {list.map((r) => <Pick key={r.key} on={r.key === land} label={r.label} onPress={() => pickRegion(r.key)} />)}
          </View>
        </>
      ) : null}
      {country === 'DE' && land === 'Bayern' ? (
        <View style={{ gap: 8 }}>
          <Field label={tx('Wohnort (für Mariä Himmelfahrt)', 'Town (for Assumption Day)')} value={ort} onChangeText={setOrtText} placeholder={tx('Zum Beispiel Fürth', 'For example Fürth')} />
          {places.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {places.map((p) => <Pick key={p.name} on={false} label={p.name} onPress={() => { haptics.select(); setOrtText(p.name); actions.setOrt(p.name); void saveLand(); }} />)}
            </View>
          ) : null}
          <Meta>{tx('In Bayern ist der 15. August nur in Gemeinden mit mehr Katholiken frei (1 708 von 2 056, Landesamt für Statistik).', 'In Bavaria, 15 August is only a holiday in mostly Catholic towns (1,708 of 2,056, state statistics office).')}</Meta>
        </View>
      ) : null}
    </Screen>
  );
}

const Pick = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <Chip bg={on ? tokens.ink : tokens.chipBg} color={on ? tokens.bg : tokens.ink} onPress={onPress}>{label}</Chip>
);

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
