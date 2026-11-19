/**
 * Kalender Abo und Export (Julian 28.10., Lücke zu TimeTree; Spec R6 "Export
 * ab Tag 1"). One secret link shows the family's Termine in Apple or Google
 * Kalender and updates itself; opened in a browser it downloads the .ics
 * file. A new link makes the old one stop working.
 */
import React, { useState } from 'react';
import { View, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, H1, Lead, Group, Btn, Note, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import PressScale from '../src/components/ui/PressScale';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens } from '../src/theme';
import { toast } from '../src/state/store';
import { getFamily, renewIcsToken } from '../src/lib/sync';
import { FUNCTIONS_URL } from '../src/lib/cloud';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

export default function KalenderAbo() {
  const [token, setToken] = useState(getFamily()?.ics_token ?? null);
  const [confirm, setConfirm] = useState(false);
  const https = token && FUNCTIONS_URL ? `${FUNCTIONS_URL}/kalender?t=${token}` : null;
  const webcal = https?.replace(/^https:/, 'webcal:');
  const open = (u: string) => { haptics.tap(); Linking.openURL(u).catch(() => toast(tx('Das ging nicht auf', 'Could not open that'))); };
  const copy = async () => { if (!https) return; haptics.select(); await Clipboard.setStringAsync(https).catch(() => {}); toast(tx('Link kopiert', 'Link copied')); };
  const renew = async () => {
    haptics.commit();
    setConfirm(false);
    const t = await renewIcsToken();
    if (t) { setToken(t); toast(tx('Neuer Link. Der alte zeigt nichts mehr.', 'New link. The old one shows nothing now.')); } else toast(tx('Das hat nicht geklappt', 'That did not work'));
  };
  return (
    <Screen>
      <BackBar />
      <H1 dot=".">{tx('Kalender Abo', 'Calendar feed')}</H1>
      <Lead>{tx('Eure gemeinsamen Termine erscheinen in Apple oder Google Kalender und bleiben dort aktuell. Arbeitszeiten und eure Handykalender sind nicht dabei.', 'Your shared events show up in Apple or Google Calendar and stay up to date. Work hours and your phone calendars are not included.')}</Lead>
      {!https ? (
        <Note>{tx('Das Abo gibt es, sobald ihr angemeldet seid.', 'The feed is available once you are signed in.')}</Note>
      ) : (
        <>
          <Btn label={tx('In Google Kalender abonnieren', 'Subscribe in Google Calendar')} onPress={() => open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}`)} />
          <Btn primary={false} label={tx('In Apple Kalender abonnieren', 'Subscribe in Apple Calendar')} onPress={() => open(webcal!)} />
          <Group>
            <PressScale onPress={copy} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: tokens.row }}>
              <LineIcon name="copy" size={20} color={tokens.sub} />
              <View style={{ flex: 1 }}>
                <Txt size={16} weight={600}>{tx('Link kopieren', 'Copy link')}</Txt>
                <Meta numberOfLines={1}>{tx('Für Outlook und andere Kalender', 'For Outlook and other calendars')}</Meta>
              </View>
            </PressScale>
            <PressScale onPress={() => open(https)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: tokens.row }}>
              <LineIcon name="papier" size={20} color={tokens.sub} />
              <View style={{ flex: 1 }}>
                <Txt size={16} weight={600}>{tx('Als Datei exportieren', 'Export as file')}</Txt>
                <Meta>{tx('Alle Termine als .ics', 'All events as .ics')}</Meta>
              </View>
            </PressScale>
          </Group>
          <Meta>{tx('Wer den Link hat, sieht eure Termine. Gebt ihn nur weiter, wem ihr vertraut.', 'Anyone with the link sees your events. Only share it with people you trust.')}</Meta>
          {confirm ? (
            <View style={{ gap: 10 }}>
              <Txt size={15}>{tx('Der alte Link zeigt danach nichts mehr. Abos müsst ihr neu einrichten.', 'The old link will stop working. You will need to subscribe again.')}</Txt>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn primary={false} label={tx('Abbrechen', 'Cancel')} onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                <Btn label={tx('Neuer Link', 'New link')} onPress={renew} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <PressScale onPress={() => { haptics.select(); setConfirm(true); }} style={{ alignSelf: 'center', paddingVertical: 10 }}>
              <Txt size={15} weight={600} color={tokens.sub}>{tx('Neuen Link erstellen', 'Create a new link')}</Txt>
            </PressScale>
          )}
        </>
      )}
    </Screen>
  );
}
