/**
 * Liste aus Bild: pick a screenshot or take a photo, the phone reads the text,
 * Claude says what kind of list it is, and the family sees it before anything
 * is made (Julian 29.10.: "nie von selber, aber mitdenken"). One tap creates it.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, BackBar, Btn, Meta, Hint } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { ClayIcon } from '../src/components/ui/Clay';
import { Step } from '../src/components/Veil';
import { tokens } from '../src/theme';
import { actions, toast } from '../src/state/store';
import { newId } from '../src/data/sample';
import { blueprintFor } from '../src/lib/blueprint';
import { haptics } from '../src/lib/haptics';
import { pickImage, readLines, understandLines, type ReadList } from '../src/lib/screenshot';
import { scoreText } from '../src/components/Blocks';
import { myRole } from '../src/lib/sync';
import { tx } from '../src/i18n/lang';
import type { Blueprint, List } from '../src/state/types';

type Phase = 'pick' | 'read' | 'think' | 'show' | 'none';

export default function BildListe() {
  const { from, uri: given } = useLocalSearchParams<{ from?: string; uri?: string }>();
  const [phase, setPhase] = useState<Phase>('pick');
  const [lines, setLines] = useState(0);
  const [list, setList] = useState<ReadList | null>(null);

  useEffect(() => {
    let gone = false;
    (async () => {
      const uri = given || (await pickImage(from === 'camera' ? 'camera' : 'gallery').catch(() => null));
      if (gone) return;
      if (!uri) return router.back();
      setPhase('read');
      const ls = await readLines(uri).catch(() => []);
      if (gone) return;
      setLines(ls.length);
      if (!ls.length) return setPhase('none');
      setPhase('think');
      const l = await understandLines(ls).catch(() => null);
      if (gone) return;
      setList(l);
      setPhase(l ? 'show' : 'none');
      haptics.select();
    })();
    return () => { gone = true; };
  }, []);

  const make = () => {
    if (!list) return;
    const bp: Blueprint | null = list.source === 'movies'
      ? { blocks: ['cover', 'year', 'by', 'stars', 'seen'], source: 'movies', seenLabel: tx('Gesehen', 'Watched') }
      : list.source === 'books' ? { blocks: ['cover', 'by', 'year', 'stars', 'seen'], source: 'books', seenLabel: tx('Gelesen', 'Read') }
      : blueprintFor(list.name);
    const me = myRole();
    const l: List = { id: newId('l'), name: list.name, icon: list.source === 'books' ? 'buch' : 'karten', kind: 'collection', blueprint: bp ?? undefined, sections: [{ id: newId('s'), title: '', items: [] }] };
    actions.createList(l);
    for (const it of list.items) {
      const id = actions.addItem(l.id, it.name);
      if (!id) continue;
      // Films show a score out of 10, so stars from the picture become one (4 stars is 8,0).
      const score = it.score ?? (list.source === 'movies' && it.stars != null ? Math.min(10, it.stars * 2) : undefined);
      const data = { ...(score != null ? { scores: { [me]: score } } : {}), ...(it.stars != null ? { stars: it.stars } : {}), ...(it.year ? { year: it.year } : {}), ...(it.seen ? { seen: true } : {}) };
      if (Object.keys(data).length) actions.setItemData(l.id, id, data);
    }
    haptics.success();
    toast(tx(`„${list.name}“ mit ${list.items.length} Einträgen angelegt`, `“${list.name}” with ${list.items.length} entries`));
    router.replace('/listen');
  };

  return (
    <Screen gap={16}>
      <BackBar />
      {phase === 'show' && list ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ClayIcon name={list.source === 'books' ? 'buch' : 'karten'} size={56} />
            <View style={{ flex: 1 }}>
              <Txt size={24} weight={700} tracking={-0.5}>{list.name}</Txt>
              <Meta>{[tx(`${list.items.length} Einträge erkannt`, `${list.items.length} entries found`), list.rating === 'score' ? tx('mit Noten von 10', 'with scores out of 10') : list.rating === 'stars' ? tx('mit Sternen', 'with stars') : null, list.source === 'movies' ? tx('Cover kommen dazu', 'covers will be added') : null].filter(Boolean).join(' · ')}</Meta>
            </View>
          </View>
          <View style={{ borderRadius: 20, backgroundColor: tokens.row, paddingVertical: 6 }}>
            {list.items.slice(0, 40).map((it, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Txt size={15.5} style={{ flex: 1 }} numberOfLines={1}>{it.name}{it.year ? <Txt size={13} color={tokens.sub}>{`  ${it.year}`}</Txt> : null}</Txt>
                {it.score != null ? <Txt size={14} weight={700}>{`${scoreText(it.score)}/10`}</Txt> : it.stars != null ? <Txt size={14} color={tokens.sub}>{'★'.repeat(Math.round(it.stars))}</Txt> : null}
              </View>
            ))}
            {list.items.length > 40 ? <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}><Meta>{tx(`und ${list.items.length - 40} weitere`, `and ${list.items.length - 40} more`)}</Meta></View> : null}
          </View>
          <Btn label={tx('Liste anlegen', 'Create list')} onPress={make} />
          <Hint center>{tx('Das Bild hat dein Handy nicht verlassen, nur der Text.', 'The picture never left your phone, only the text.')}</Hint>
        </>
      ) : phase === 'none' ? (
        <View style={{ gap: 12, paddingTop: 40 }}>
          <Txt size={22} weight={700}>{lines ? tx('Das sieht nicht nach einer Liste aus.', 'That does not look like a list.') : tx('Auf dem Bild war kein Text zu lesen.', 'No text found in the picture.')}</Txt>
          <Btn label={tx('Anderes Bild', 'Another picture')} onPress={() => router.replace({ pathname: '/bild-liste', params: { from } })} />
        </View>
      ) : (
        <View style={{ gap: 12, paddingTop: 40 }}>
          <Step label={tx('Bild wählen', 'Choose a picture')} state={phase === 'pick' ? 'now' : 'done'} />
          <Step label={phase === 'read' || phase === 'pick' ? tx('Text lesen, auf dem Handy', 'Reading the text, on the phone') : tx(`${lines} Zeilen gelesen, auf dem Handy`, `${lines} lines read, on the phone`)} state={phase === 'read' ? 'now' : phase === 'pick' ? 'next' : 'done'} />
          <Step label={tx('Verstehen, was gesammelt wird', 'Working out what is collected')} state={phase === 'think' ? 'now' : 'next'} />
        </View>
      )}
    </Screen>
  );
}
