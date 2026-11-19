/**
 * Wer gehört dazu (storyboard 01.11.2026, step 4): you, your partner, then
 * children and anyone else (grandparents, babysitter). A child's birthday is
 * optional; with it Memo says one line about what it will think of (U-Heft,
 * vaccinations, school registration, computed on this phone). Memo blinks for
 * every new person. Holidays and vacation days are no longer asked here: the
 * assistant asks when it matters, and both stay in Einstellungen.
 */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Btn } from '../../src/components/ui/kit';
import { Field } from '../../src/components/Field';
import DateField from '../../src/components/DateField';
import { Avatar } from '../../src/components/ui/Person';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import PressScale from '../../src/components/ui/PressScale';
import Step, { stepOf } from '../../src/components/onboarding/Step';
import { actions, useStore, get } from '../../src/state/store';
import { dueItems } from '../../src/lib/mitdenken';
import { TODAY } from '../../src/lib/dates';
import { setMyName } from '../../src/lib/sync';
import { isPreview, setPreviewNames } from '../../src/lib/vorschau';
import { haptics } from '../../src/lib/haptics';
import { tokens, fonts, personPalette } from '../../src/theme';
import { stepViewed, onboardingDone, inviteSent, calendarConnected } from '../../src/lib/funnel';
import { tx } from '../../src/i18n/lang';
import { getPref, setPref } from '../../src/lib/prefs';

type Kind = 'kind' | 'grosseltern' | 'andere';
type Draft = { key: string; name: string; kind: Kind; birthday: string | null };

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const appear = (i = 0) => FadeInDown.springify().damping(18).stiffness(220).delay(i * 60);

function years(born: string) {
  const [y, m, d] = born.split('-').map(Number);
  const [ty, tm, td] = TODAY.split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

/** Memo's one line under a child: what it will keep in mind from the age. */
function thinksOf(name: string, born: string, country: string) {
  const first = name.trim().split(' ')[0] || tx('Euer Kind', 'Your child');
  const age = years(born);
  const ageText = age < 1 ? tx(`${first} ist noch kein Jahr alt.`, `${first} is under one.`) : tx(`${first} ist ${age}.`, `${first} is ${age}.`);
  const next = dueItems([{ id: 'x', name: first, kind: 'kind', color: 'Mint', birthday: born }], country, 400)[0];
  if (next) return `${ageText} ${tx(`Ich denke an ${next.title} und sage rechtzeitig Bescheid.`, `I’ll keep ${next.title} in mind and remind you in time.`)}`;
  return `${ageText} ${tx('Ich denke an Geburtstage und Schultermine.', 'I’ll keep birthdays and school dates in mind.')}`;
}

export default function Familie() {
  stepViewed('eltern');
  const names = useStore((s) => s.names);
  const country = useStore((s) => s.country);
  const [j, setJ] = useState(isPreview() ? '' : names.J || getPref('obName') || '');
  const [t, setT] = useState(isPreview() ? '' : names.T || getPref('obPartner') || '');
  const [others, setOthers] = useState<Draft[]>([]);
  const [beat, setBeat] = useState(0);

  const add = (kind: Kind) => {
    haptics.select();
    setOthers((o) => [...o, { key: `d${Date.now()}`, name: '', kind, birthday: null }]);
  };
  const patch = (key: string, p: Partial<Draft>) => setOthers((o) => o.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const remove = (key: string) => { haptics.select(); setOthers((o) => o.filter((d) => d.key !== key)); };
  // A person counts once the name is typed and the field is left: then Memo blinks.
  const named = () => setBeat((b) => b + 1);

  const next = () => {
    if (isPreview()) { setPreviewNames({ J: j.trim(), T: t.trim() }); return router.push('/onboarding/kalender'); }
    actions.setNames({ J: j.trim(), T: t.trim() });
    setMyName(j.trim());
    // The appointment you said in the story onboarding moves in as your first real one, once.
    try {
      const raw = getPref('obEvent');
      if (raw) { const e = JSON.parse(raw); actions.addEvent({ ...e, id: `e-${Date.now()}` }); setPref('obEvent', ''); }
    } catch {}
    const taken = new Set(get().people.map((p) => p.name.toLowerCase()));
    others.filter((d) => d.name.trim()).forEach((d, i) => {
      if (taken.has(d.name.trim().toLowerCase())) return;
      actions.addPerson({ name: d.name.trim(), kind: d.kind, color: personPalette[(i + 2) % personPalette.length].name, ...(d.kind === 'kind' && d.birthday ? { birthday: d.birthday } : {}) });
    });
    router.push('/onboarding/kalender');
  };

  return (
    <Step
      step={stepOf('eltern')}
      memo="blink"
      memoBeat={beat}
      title={tx('Wer gehört zu eurer Familie', 'Who is in your family')}
      lead={tx('Dann weiß ich, wer gemeint ist, wenn ihr „Mia“ oder „ich“ sagt.', 'Then I know who you mean when you say “Mia” or “me”.')}
      footer={<Btn label={tx('Weiter', 'Next')} disabled={!j.trim()} onPress={next} />}
    >
      <View style={{ gap: 8 }}>
        <Animated.View entering={appear(0)}>
          <Field label={tx('Du', 'You')} value={j} onChangeText={setJ} placeholder={tx('Dein Vorname', 'Your first name')} right={<Avatar p="J" letter={j.trim()[0]?.toUpperCase() || '?'} size={34} />} />
        </Animated.View>
        <Animated.View entering={appear(1)}>
          <Field label={tx('Dein Partner', 'Your partner')} value={t} onChangeText={setT} placeholder={tx('Vorname, lädst du gleich ein', 'First name, invite them next')} right={<Avatar p="T" letter={t.trim()[0]?.toUpperCase() || '?'} size={34} />} />
        </Animated.View>
        {others.map((d, i) => (
          <Animated.View key={d.key} entering={appear()} exiting={FadeOut.duration(160)} layout={LinearTransition.springify().damping(20)}>
            <PersonRow d={d} i={i} country={country} onChange={(p) => patch(d.key, p)} onRemove={() => remove(d.key)} onNamed={named} />
          </Animated.View>
        ))}
        <Animated.View layout={LinearTransition.springify().damping(20)} entering={appear(2)} style={{ flexDirection: 'row', gap: 8 }}>
          <AddPill label={tx('Kind', 'Child')} onPress={() => add('kind')} />
          <AddPill label={tx('Oma, Opa, Babysitter', 'Grandparent, sitter')} onPress={() => add('grosseltern')} />
        </Animated.View>
      </View>
    </Step>
  );
}

function AddPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.row }}>
      <LineIcon name="plus" size={16} color={tokens.ink} />
      <Txt size={15} weight={600}>{label}</Txt>
    </PressScale>
  );
}

function PersonRow({ d, i, country, onChange, onRemove, onNamed }: { d: Draft; i: number; country: string; onChange: (p: Partial<Draft>) => void; onRemove: () => void; onNamed: () => void }) {
  const c = personPalette[(i + 2) % personPalette.length];
  const kid = d.kind === 'kind';
  const letter = d.name.trim()[0]?.toUpperCase() || '?';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={15} weight={700} color={c.fg}>{letter}</Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={13} color={tokens.sub}>{kid ? tx('Kind', 'Child') : tx('Oma, Opa, Babysitter …', 'Grandparent, sitter …')}</Txt>
          <TextInput
            value={d.name}
            onChangeText={(v) => onChange({ name: v.slice(0, 40) })}
            onBlur={() => d.name.trim() && onNamed()}
            onSubmitEditing={() => d.name.trim() && onNamed()}
            autoFocus
            placeholder={kid ? tx('Vorname', 'First name') : tx('Zum Beispiel Oma Gisela', 'For example Grandma Ann')}
            placeholderTextColor={tokens.sub}
            style={[{ fontFamily: fonts[600], fontSize: 17, color: tokens.ink, padding: 0 }, noOutline]}
          />
        </View>
        <PressScale onPress={onRemove} hitSlop={10} accessibilityLabel={tx('Entfernen', 'Remove')}>
          <LineIcon name="x" size={18} color={tokens.sub} />
        </PressScale>
      </View>
      {kid ? (
        <DateField
          label={tx(`Geburtstag${d.name.trim() ? ` von ${d.name.trim().split(' ')[0]}` : ''} (optional)`, `Birthday${d.name.trim() ? ` of ${d.name.trim().split(' ')[0]}` : ''} (optional)`)}
          value={d.birthday}
          past
          onChange={(iso) => { if (!d.birthday) onNamed(); onChange({ birthday: iso }); }}
        />
      ) : null}
      {kid && d.birthday ? (
        <Animated.View entering={appear()} style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 6, alignItems: 'flex-start' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.done, marginTop: 8 }} />
          <Txt size={15} line={21} color={tokens.done} style={{ flex: 1 }}>{thinksOf(d.name, d.birthday, country)}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}
