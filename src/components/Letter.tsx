/**
 * The photographed letter. Objekt bleibt Objekt: camera, reading and
 * Infozettel show the same sheet. Real sentences instead of grey bars, so the
 * prototype reads like an actual Bescheid (Julian 26.10.: "Was ist hier los").
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import { tx } from '../i18n/lang';

export default function Letter({ scale = 1 }: { scale?: number }) {
  const t = (size: number, children: string, o: { weight?: 400 | 600 | 700; color?: string } = {}) => (
    <Txt size={size * scale} line={Math.round(size * 1.35 * scale)} weight={o.weight ?? 400} color={o.color ?? '#3A3A3A'}>{children}</Txt>
  );
  return (
    <View style={{ flex: 1, borderRadius: 8 * scale, backgroundColor: '#F4F1EA', paddingVertical: 26 * scale, paddingHorizontal: 24 * scale, gap: 9 * scale, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {t(9, tx('Zentrum Bayern Familie und Soziales\nElterngeldstelle', 'Family Benefits Office\nParental allowance'), { color: '#6B6B6B' })}
        {t(9, '24.10.2026', { color: '#6B6B6B' })}
      </View>
      {t(9, tx('Aktenzeichen EG-2026-118734', 'Reference EG-2026-118734'), { color: '#6B6B6B' })}
      {t(14, tx('Ihr Antrag auf Elterngeld', 'Your parental allowance application'), { weight: 700, color: '#222' })}
      {t(10.5, tx('Sehr geehrter Herr Huber,', 'Dear Mr Huber,'))}
      {t(10.5, tx('vielen Dank für Ihren Antrag vom 2. Oktober 2026. Damit wir über Ihren Anspruch entscheiden können, fehlt uns noch eine Unterlage.', 'thank you for your application of 2 October 2026. Before we can decide on your claim, one document is still missing.'))}
      {t(11, tx('Bitte reichen Sie bis zum 12.12.2026 nach: Arbeitgeberbescheinigung über die Elternzeit', 'Please send by 12 Dec 2026: employer confirmation of parental leave'), { weight: 600, color: '#222' })}
      {t(10.5, tx('Geht die Unterlage nicht rechtzeitig ein, können wir den Antrag nur nach Aktenlage entscheiden.', 'If it does not arrive in time, we can only decide on the documents we have.'))}
      {t(10.5, tx('Mit freundlichen Grüßen\nIhre Elterngeldstelle', 'Kind regards\nParental Allowance Office'))}
    </View>
  );
}
