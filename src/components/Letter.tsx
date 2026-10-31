/**
 * The photographed letter. Objekt bleibt Objekt: camera, reading and
 * Infozettel show the same sheet. Real sentences instead of grey bars, so the
 * prototype reads like an actual Bescheid (Julian 26.10.: "Was ist hier los").
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';

export default function Letter({ scale = 1 }: { scale?: number }) {
  const t = (size: number, children: string, o: { weight?: 400 | 600 | 700; color?: string } = {}) => (
    <Txt size={size * scale} line={Math.round(size * 1.35 * scale)} weight={o.weight ?? 400} color={o.color ?? '#3A3A3A'}>{children}</Txt>
  );
  return (
    <View style={{ flex: 1, borderRadius: 8 * scale, backgroundColor: '#F4F1EA', paddingVertical: 26 * scale, paddingHorizontal: 24 * scale, gap: 9 * scale, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {t(9, 'Zentrum Bayern Familie und Soziales\nElterngeldstelle', { color: '#6B6B6B' })}
        {t(9, '24.10.2026', { color: '#6B6B6B' })}
      </View>
      {t(9, 'Aktenzeichen EG-2026-118734', { color: '#6B6B6B' })}
      {t(14, 'Ihr Antrag auf Elterngeld', { weight: 700, color: '#222' })}
      {t(10.5, 'Sehr geehrter Herr Huber,')}
      {t(10.5, 'vielen Dank für Ihren Antrag vom 2. Oktober 2026. Damit wir über Ihren Anspruch entscheiden können, fehlt uns noch eine Unterlage.')}
      {t(11, 'Bitte reichen Sie bis zum 12.12.2026 nach: Arbeitgeberbescheinigung über die Elternzeit', { weight: 600, color: '#222' })}
      {t(10.5, 'Geht die Unterlage nicht rechtzeitig ein, können wir den Antrag nur nach Aktenlage entscheiden.')}
      {t(10.5, 'Mit freundlichen Grüßen\nIhre Elterngeldstelle')}
    </View>
  );
}
