/**
 * Datenschutz (Julian 05.11.2026): what goes where, and three switches.
 * - Ohne KI, for the whole family: on at once; back on only after a second tap,
 *   because then sentences go out again.
 * - Alle Daten löschen: the account and what only it holds; asks twice.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, H1, H2, Group, Toggle, Btn, Card } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { tokens } from '../src/theme';
import { tx } from '../src/i18n/lang';
import { toast, actions } from '../src/state/store';
import { usePrivat, setOhneKi, stimmeZu } from '../src/lib/privat';
import { KI_TEXT } from '../src/components/KiWahl';
import { supabase } from '../src/lib/cloud';
import { getAuth, signOut } from '../src/lib/auth';
import { forgetLocal } from '../src/lib/sync';
import { track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';

function Line({ t, sub, value, onChange }: { t: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: tokens.row }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15.5} weight={500}>{t}</Txt>
        <Txt size={13} line={18} color={tokens.sub}>{sub}</Txt>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

export default function Datenschutz() {
  const p = usePrivat();
  const [kiBack, setKiBack] = useState(false);
  const [del, setDel] = useState(0);
  const [busy, setBusy] = useState(false);

  const ohne = async (v: boolean) => {
    if (!v) { setKiBack(true); return; }
    setKiBack(false);
    const ok = await setOhneKi(true);
    track('ai_choice', { choice: 'ohne_ki', source: 'settings' });
    toast(ok ? tx('Ohne KI ist an, für die ganze Familie.', 'Without AI is on, for the whole family.') : tx('Auf diesem Handy aus. Für die Familie klappt es, sobald ihr online seid.', 'Off on this phone. For the family once you are online.'));
  };
  const kiAn = async () => {
    stimmeZu();
    await setOhneKi(false);
    setKiBack(false);
    track('ai_choice', { choice: 'mit_ki', source: 'settings' });
    toast(tx('KI ist wieder an.', 'AI is on again.'));
  };
  const loeschen = async () => {
    if (del < 1) { setDel(1); haptics.select(); return; }
    setBusy(true);
    const { error } = supabase && getAuth().session ? await supabase.rpc('delete_my_account') : { error: null };
    setBusy(false);
    if (error) { toast(tx('Das hat nicht geklappt. Bitte später nochmal.', "That didn't work. Please try again later.")); return; }
    track('account_deleted');
    await forgetLocal();
    await signOut().catch(() => {});
    actions.reset();
    router.dismissAll();
    router.replace('/');
    toast(tx('Alles gelöscht.', 'Everything deleted.'));
  };

  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{tx('Datenschutz', 'Privacy')}</H1>
      <Group>
        <Line t={tx('Ohne KI', 'Without AI')} sub={tx('Nur von Hand eintragen, das Sprechen fällt weg. Gilt für die ganze Familie.', 'Add by hand only, talking goes away. Holds for the whole family.')} value={p.ohneKi} onChange={(v) => void ohne(v)} />
      </Group>
      {kiBack ? (
        <Card>
          <Txt size={15} line={21}>{tx('KI wieder einschalten? Dann gehen eure Sätze wieder an Claude, so wie unten beschrieben. Das gilt für die ganze Familie.', 'Turn AI back on? Your sentences go to Claude again as described below. This holds for the whole family.')}</Txt>
          <Btn label={tx('KI einschalten', 'Turn AI on')} onPress={() => void kiAn()} />
          <Btn primary={false} label={tx('Abbrechen', 'Cancel')} onPress={() => setKiBack(false)} />
        </Card>
      ) : null}

      <H2>{tx('Was rausgeht', 'What goes out')}</H2>
      <View style={{ gap: 10, paddingHorizontal: 4 }}>
        {KI_TEXT().map((t, i) => <Txt key={i} size={14} line={20} color={tokens.sub}>{t}</Txt>)}
        <Txt size={14} line={20} color={tokens.sub}>{tx('Ohne KI geht nichts davon raus. Euer Kalender liegt dann nur bei uns (Supabase, EU) und auf euren Handys.', 'Without AI none of it goes out. Your calendar then only lives with us (Supabase, EU) and on your phones.')}</Txt>
      </View>

      <H2>{tx('Konto', 'Account')}</H2>
      {del ? (
        <Card>
          <Txt size={15} line={21}>{tx('Wirklich alles löschen? Dein Konto und alles, was nur du hast, ist dann weg. Ist dein Partner noch in der Familie, bleibt euer gemeinsamer Kalender bei ihm. Sonst wird auch er gelöscht.', 'Really delete everything? Your account and everything only you have will be gone. If your partner is still in the family, your shared calendar stays with them. Otherwise it is deleted too.')}</Txt>
          <Btn label={busy ? tx('Lösche …', 'Deleting …') : tx('Ja, alles löschen', 'Yes, delete everything')} disabled={busy} style={{ backgroundColor: tokens.danger }} onPress={() => void loeschen()} />
          <Btn primary={false} label={tx('Abbrechen', 'Cancel')} onPress={() => setDel(0)} />
        </Card>
      ) : (
        <Btn primary={false} label={tx('Alle Daten löschen', 'Delete all data')} onPress={() => void loeschen()} />
      )}
    </Screen>
  );
}
