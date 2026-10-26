/** The photographed letter. Objekt bleibt Objekt: camera, reading and Infozettel show the same sheet. */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';

const LINES = [92, 88, 95, 60, 90, 85, 70, 93, 40];

export default function Letter({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ flex: 1, borderRadius: 8 * scale, backgroundColor: '#F4F1EA', paddingVertical: 30 * scale, paddingHorizontal: 26 * scale, gap: 10 * scale }}>
      <Txt size={11 * scale} line={14 * scale} color="#6B6B6B">Elterngeldstelle Bayern · ZBFS</Txt>
      <Txt size={15 * scale} line={19 * scale} weight={700} color="#222">Ihr Antrag auf Elterngeld</Txt>
      {LINES.map((w, i) => <View key={i} style={{ height: 7 * scale, borderRadius: 3, backgroundColor: '#D8D4CB', width: `${w}%` }} />)}
      <Txt size={12 * scale} line={16 * scale} weight={600} color="#333">Bitte reichen Sie bis 12.12.2026 nach: Arbeitgeberbescheinigung</Txt>
      {[90, 75, 88].map((w, i) => <View key={i} style={{ height: 7 * scale, borderRadius: 3, backgroundColor: '#D8D4CB', width: `${w}%` }} />)}
    </View>
  );
}

