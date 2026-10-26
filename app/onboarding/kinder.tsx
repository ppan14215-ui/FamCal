/**
 * 3 · Eure Kinder. Starts empty like a real first launch (Julian 26.10.):
 * name with a placeholder, the date through the Schreibzeile, the state from
 * a list that opens under the field.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Btn, Seg, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Field } from '../../src/components/Field';
import WhenField from '../../src/components/WhenField';
import PressScale from '../../src/components/ui/PressScale';
import { tokens, rise, rowIn, rowOut } from '../../src/theme';
import { TODAY, daysBetween } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import type { When } from '../../src/lib/when';
import { actions, get } from '../../src/state/store';
import { findCity } from '../../src/data/cities';

const LAENDER = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
  'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
];

const age = (born: string) => {
  const d = daysBetween(born, TODAY);
  if (d < 14) return d === 1 ? '1 Tag' : `${d} Tage`;
  if (d < 7 * 9) return `${Math.floor(d / 7)} Wochen`;
  const m = Math.floor(d / 30.44);
  return m < 24 ? `${m} Monate` : `${Math.floor(m / 12)} Jahre`;
};
// Pregnancy week from the due date (40 weeks).
const ssw = (due: string) => 40 - Math.ceil(daysBetween(TODAY, due) / 7) + 1;

export default function Kinder() {
  const [mode, setMode] = useState<'da' | 'unterwegs'>('da');
  const [name, setName] = useState('');
  const [born, setBorn] = useState<When | null>(null);
  // The Bundesland follows from the city when the app knows it; still changeable.
  const city = findCity(get().city);
  const [land, setLand] = useState<string | null>(city?.land ?? null);
  const [kids, setKids] = useState(1);
  const [name2, setName2] = useState('');
  const da = mode === 'da';
  const who = name.trim() || (da ? 'Euer Kind' : 'Euer Baby');
  return (
    <Screen footer={<Btn label="Weiter" disabled={!born} onPress={() => { actions.setKid({ name: name.trim(), born: da ? born?.date : undefined, due: da ? undefined : born?.date, land: land ?? undefined }); router.push('/onboarding/kalender'); }} />}>
      <BackBar center={<StepDots i={3} />} />
      <H1>Eure Kinder</H1>
      <Seg height={38} items={[{ key: 'da', label: 'Schon da' }, { key: 'unterwegs', label: 'Noch unterwegs' }]} value={mode} onChange={(k) => { setMode(k as 'da' | 'unterwegs'); setBorn(null); }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder={da ? 'Zum Beispiel Ben' : 'Falls ihr ihn schon wisst'} />
      <WhenField
        key={mode}
        card
        kind="tag"
        past={da}
        closeOnPick
        label={da ? 'Geboren am' : 'Errechneter Termin'}
        value={born}
        onChange={setBorn}
        right={born ? <Meta>{da ? age(born.date) : `SSW ${ssw(born.date)}`}</Meta> : <LineIcon name="cal" size={20} color={tokens.sub} />}
        extra={(w) => (da ? `${who} ist ${age(w.date)} alt.` : `Heute ist SSW ${ssw(w.date)}.`)}
      />
      <Dropdown label="Bundesland" placeholder="Bundesland wählen" value={land} options={LAENDER} onChange={setLand} hint={city && land === city.land ? `Aus ${city.name}. Für Feiertage, Elterngeld und Kita-Fristen.` : "Für Feiertage, Elterngeld und Kita-Fristen."} />
      {kids > 1 ? <Animated.View entering={rise()}><Field label="Name des zweiten Kindes" value={name2} onChangeText={setName2} placeholder="Name" /></Animated.View> : null}
      <PressScale
        onPress={() => { haptics.select(); setKids(2); }}
        style={{ height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: tokens.dotOff, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <LineIcon name="plus" size={18} />
        <Txt size={15} weight={600}>Weiteres Kind hinzufügen</Txt>
      </PressScale>
    </Screen>
  );
}

/** A field that opens its options right under itself, no sheet. */
function Dropdown({ label, placeholder, value, options, onChange, hint }: { label: string; placeholder: string; value: string | null; options: string[]; onChange: (v: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderRadius: 18, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <PressScale
        scale={0.985}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => { haptics.select(); setOpen(!open); }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={13} color={tokens.sub}>{label}</Txt>
          <Txt size={18} weight={600} color={value ? tokens.ink : tokens.mute}>{value ?? placeholder}</Txt>
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={18} color={tokens.mute} /></View>
      </PressScale>
      {open ? (
        <Animated.View entering={rowIn} exiting={rowOut} style={{ borderTopWidth: 1, borderTopColor: tokens.hair, paddingVertical: 4 }}>
          {hint ? <Txt size={13} color={tokens.sub} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>{hint}</Txt> : null}
          {options.map((o, i) => {
            const on = o === value;
            return (
              <Animated.View key={o} entering={rise(i)}>
                <PressScale
                  scale={0.985}
                  onPress={() => { haptics.select(); onChange(o); setTimeout(() => setOpen(false), 120); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16 }}
                >
                  <Txt size={16} weight={on ? 600 : 400} style={{ flex: 1 }}>{o}</Txt>
                  {on ? <LineIcon name="check" size={18} stroke={2.2} /> : null}
                </PressScale>
              </Animated.View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}
