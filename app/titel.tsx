/**
 * A film, series or book from a list, opened by tapping its cover (Julian
 * 31.10.: "Mit einem Klick auf das Cover … zu der Karte, die es von Google
 * gibt"). Big cover, year, who made it and one Wikipedia sentence; the
 * button opens Google's own card for the title.
 */
import React from 'react';
import { View, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Sheet from '../src/components/Sheet';
import { Btn, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { BigCover } from '../src/components/Blocks';
import { tokens } from '../src/theme';
import { useStore } from '../src/state/store';
import { tx, LANG } from '../src/i18n/lang';

const KIND = { film: ['Film', 'Film'], serie: ['Serie', 'Series'], buch: ['Buch', 'Book'] } as const;

export default function Titel() {
  const { l, i } = useLocalSearchParams<{ l: string; i: string }>();
  const item = useStore((s) => s.lists.find((x) => x.id === l)?.sections.flatMap((sec) => sec.items).find((x) => x.id === i));
  if (!item) return null;
  const d = item.data ?? {};
  const kind = d.kind ? KIND[d.kind][LANG === 'en' ? 1 : 0] : undefined;
  const facts = [kind, d.year, d.by].filter(Boolean).join(' · ');
  // Google shows its knowledge card for the title on top of the results.
  const word = d.kind === 'buch' ? tx('Buch', 'book') : d.kind === 'serie' ? tx('Serie', 'TV series') : tx('Film', 'film');
  const google = () => Linking.openURL(`https://www.google.com/search?hl=${LANG}&q=${encodeURIComponent(`${item.name} ${d.kind === 'film' && d.year ? d.year : ''} ${word}`.replace(/\s+/g, ' ').trim())}`);
  return (
    <Sheet bg={tokens.row}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <BigCover title={item.name} data={d} />
        <View style={{ flex: 1, gap: 6, paddingTop: 4 }}>
          <Txt size={21} weight={700} tracking={-0.4} line={26}>{item.name}</Txt>
          {facts ? <Meta>{facts}</Meta> : null}
          {d.about ? <Txt size={15} line={22} color={tokens.sub}>{d.about}</Txt> : null}
          {!d.about && d.looking ? <Meta>{tx('Suche Infos …', 'Looking it up …')}</Meta> : null}
        </View>
      </View>
      <Btn label={tx('Bei Google ansehen', 'Open on Google')} onPress={google} />
    </Sheet>
  );
}
