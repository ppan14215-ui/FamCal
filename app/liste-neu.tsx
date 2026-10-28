/**
 * Listen · Neue Liste (Canvas "Neue Liste", Julian 28.10.: "Template nicht
 * klar erkennbar"). First the name, then one clear switch: Zum Abhaken or
 * Sammlung. A Sammlung shows a live sample row and its building blocks to
 * toggle; a checklist offers a fitting template, the rest sit apart below.
 * Like Notion the list gets its own icon: it follows the name until picked.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, CancelBar, Btn, Chip, Toggle, Group } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import PressScale from '../src/components/ui/PressScale';
import { ClayIcon } from '../src/components/ui/Clay';
import ItemRow from '../src/components/ItemRow';
import { Cover, Stars, SeenPill, FactChips, factLine } from '../src/components/Blocks';
import { tokens, tint, fonts } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import { templates, kliniktasche, listFromTemplate } from '../src/data/sample';
import { iconFor } from '../src/lib/iconWords';
import { blueprintFor } from '../src/lib/blueprint';
import { haptics } from '../src/lib/haptics';
import type { ClayName } from '../src/lib/clayIcons';
import type { List, Blueprint, Block, ItemData } from '../src/state/types';
import { tx } from '../src/i18n/lang';

type Kind = 'abhaken' | 'sammlung';
type Tpl = 'klinik' | 'urlaub' | 'erst';

const TEMPLATES: { key: Tpl; icon: ClayName; title: string; count: number; re: RegExp }[] = [
  { key: 'urlaub', icon: 'reise', title: 'Urlaub mit Baby', count: 24, re: /urlaub|ostsee|nordsee|pack|reise|ferien|holiday|trip|vacation/i },
  { key: 'klinik', icon: 'hebamme', title: 'Kliniktasche', count: 18, re: /klinik|geburt|kreißsaal|hospital bag|birth/i },
  { key: 'erst', icon: 'einkauf', title: 'Erstausstattung', count: 30, re: /erstausstattung|baby ?sachen|first things|newborn/i },
];

const BLOCKS: { b: Block; label: string }[] = [
  { b: 'cover', label: tx('Cover', 'Cover') }, { b: 'year', label: tx('Jahr', 'Year') }, { b: 'by', label: tx('Autor oder Regie', 'Author or director') },
  { b: 'stars', label: tx('Bewertung', 'Rating') }, { b: 'seen', label: tx('Abhaken', 'Done') }, { b: 'link', label: 'Link' },
  { b: 'price', label: tx('Preis', 'Price') }, { b: 'place', label: tx('Ort', 'Place') }, { b: 'date', label: tx('Datum', 'Date') }, { b: 'note', label: tx('Notiz', 'Note') },
];

/** What a sample entry looks like, so the preview reads like the real thing. */
function sampleOf(bp: Blueprint): { title: string; data: ItemData } {
  if (bp.source === 'movies') return { title: 'Little Women', data: { year: '2019', by: 'Greta Gerwig', stars: 4, link: 'https://www.themoviedb.org', price: '12,99 €', place: 'Kino am Markt', date: 'Fr 31. Okt' } };
  if (bp.source === 'books') return { title: tx('Der kleine Prinz', 'The Little Prince'), data: { year: '1943', by: 'Antoine de Saint-Exupéry', stars: 5, link: 'https://openlibrary.org', price: '9 €', place: tx('Bücherei', 'Library'), date: 'Sa 1. Nov' } };
  return { title: tx('Beispiel', 'Example'), data: { year: '2026', by: tx('von Julia', 'by Julia'), stars: 3, link: 'https://famcal.app', price: '24 €', place: tx('Am Markt 3', '3 Market St'), date: 'So 2. Nov' } };
}

const GENERIC: Blueprint = { blocks: ['note', 'seen'], source: null, seenLabel: tx('Erledigt', 'Done') };

function build(kind: Kind, tpl: Tpl | null, name: string, icon: ClayName, bp: Blueprint): List {
  if (kind === 'sammlung') return { ...listFromTemplate(name, icon, null), kind: 'collection', blueprint: bp };
  if (tpl === 'klinik') {
    const l = kliniktasche();
    return { ...l, name, icon, sections: l.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, done: false, who: null })) })) };
  }
  if (tpl === 'urlaub') return listFromTemplate(name, icon, templates.urlaub);
  if (tpl === 'erst') return listFromTemplate(name, icon, templates.erstausstattung);
  return listFromTemplate(name, icon, null);
}

const Label = ({ children }: { children: string }) => <Txt size={12.5} weight={600} color={tokens.sub} tracking={0.6} style={{ marginTop: 8 }}>{children.toUpperCase()}</Txt>;

export default function ListeNeu() {
  const { vorschlag } = useLocalSearchParams<{ vorschlag?: string }>();
  const fromHint = vorschlag === 'urlaub';
  const draft = useStore((s) => s.draftSymbol);
  const [name, setName] = useState(fromHint ? 'Ostsee mit Ben' : '');
  const [picked, setPicked] = useState<ClayName | null>(null);
  // null: follow the name; set once the person taps the switch.
  const [kindSet, setKindSet] = useState<Kind | null>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [tplOn, setTplOn] = useState(true);
  const [tplPicked, setTplPicked] = useState<Tpl | null>(null);

  const rule = blueprintFor(name);
  const kind: Kind = kindSet ?? (rule ? 'sammlung' : 'abhaken');
  const baseBp = rule ?? GENERIC;
  const bp: Blueprint = { ...baseBp, blocks: blocks ?? baseBp.blocks };
  const suggested = TEMPLATES.find((t) => t.re.test(name)) ?? null;
  const tpl: Tpl | null = kind === 'abhaken' ? tplPicked ?? (suggested && tplOn ? suggested.key : null) : null;
  const auto = iconFor(name);
  const icon: ClayName | null = picked ?? (!name.trim() ? null : auto !== 'kalender' ? auto : tpl ? TEMPLATES.find((t) => t.key === tpl)!.icon : kind === 'sammlung' ? 'notizblock' : 'checkliste');

  // A new kind of name starts from its own blocks again.
  useEffect(() => { setBlocks(null); }, [rule?.source, rule?.seenLabel]);

  // Only a pick made from here counts: a symbol left over from a Termin once gave a new list a basketball (Julian 28.10.).
  const asked = useRef(false);
  useEffect(() => () => actions.clearDraftSymbol(), []);
  useEffect(() => {
    if (!draft) return;
    if (asked.current) setPicked(draft);
    asked.current = false;
    actions.clearDraftSymbol();
  }, [draft]);

  const toggleBlock = (b: Block) => {
    haptics.select();
    const now = bp.blocks;
    setBlocks(now.includes(b) ? now.filter((x) => x !== b) : BLOCKS.map((x) => x.b).filter((x) => x === b || now.includes(x)));
  };
  const sample = sampleOf(bp);
  const has = (b: Block) => bp.blocks.includes(b);

  return (
    <Screen
      gap={12}
      footer={
        <Btn
          label={tx('Liste anlegen', 'Create list')}
          disabled={!name.trim()}
          onPress={() => {
            actions.createList(build(kind, tpl, name.trim(), icon ?? 'checkliste', bp));
            if (fromHint) actions.dismissHint('urlaub');
            goBack();
          }}
        />
      }
    >
      <View style={{ minHeight: 32, justifyContent: 'center' }}>
        <CancelBar />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <Txt size={16} weight={600}>{tx('Neue Liste', 'New list')}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <PressScale
          accessibilityLabel={tx('Symbol der Liste wählen', 'Choose the list icon')}
          onPress={() => { haptics.select(); asked.current = true; actions.clearDraftSymbol(); router.push('/symbol'); }}
          style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: icon ? tint(icon) : 'transparent', borderWidth: icon ? 0 : 1.5, borderStyle: 'dashed', borderColor: tokens.circleLine }}
        >
          {icon ? <ClayIcon name={icon} size={52} /> : <LineIcon name="plus" size={22} color={tokens.mute} />}
          {icon ? (
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={11} color={tokens.sub}>✎</Txt>
            </View>
          ) : null}
        </PressScale>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={12.5} weight={600} color={tokens.sub} tracking={0.6}>NAME</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tx('Wofür ist die Liste?', 'What is the list for?')}
            placeholderTextColor={tokens.mute}
            selectionColor={tokens.ink}
            style={[{ fontFamily: fonts[700], fontSize: 24, letterSpacing: -0.5, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
      </View>

      <Label>{tx('Was für eine Liste?', 'What kind of list?')}</Label>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: tokens.segBg }}>
        {(['abhaken', 'sammlung'] as Kind[]).map((k) => {
          const on = kind === k;
          return (
            <PressScale key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { haptics.select(); setKindSet(k); }} style={{ flex: 1, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tokens.ink : 'transparent' }}>
              <Txt size={15} weight={600} color={on ? '#FFFFFF' : tokens.sub}>{k === 'abhaken' ? tx('Zum Abhaken', 'To check off') : tx('Sammlung', 'Collection')}</Txt>
            </PressScale>
          );
        })}
      </View>
      <Txt size={13} line={18} color={tokens.sub}>{kind === 'abhaken' ? tx('Einkauf, Packen, Erledigen: jeder Eintrag bekommt einen Haken.', 'Shopping, packing, to-dos: every entry gets a check.') : tx('Filme, Bücher, Ideen: Einträge zum Sammeln und Bewerten.', 'Films, books, ideas: entries to collect and rate.')}</Txt>

      {kind === 'sammlung' ? (
        <>
          <Label>{tx('So sieht ein Eintrag aus', 'An entry looks like this')}</Label>
          <Group>
            <ItemRow
              title={sample.title}
              meta={factLine(bp, sample.data)}
              done={false}
              noCheck
              who={null}
              onToggle={() => {}}
              lead={has('cover') ? <Cover title={sample.title} data={sample.data} /> : undefined}
              below={has('stars') || bp.blocks.some((b) => ['link', 'price', 'place', 'date', 'note'].includes(b)) ? (
                <View style={{ gap: 6 }}>
                  {has('stars') ? <Stars value={sample.data.stars} onChange={() => {}} /> : null}
                  <FactChips bp={bp} data={sample.data} note={tx('Notiz', 'Note')} />
                </View>
              ) : undefined}
              trailing={has('seen') ? <SeenPill label={bp.seenLabel ?? tx('Erledigt', 'Done')} seen={false} onToggle={() => {}} /> : undefined}
            />
          </Group>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BLOCKS.map(({ b, label }) => {
              const on = has(b);
              return (
                <PressScale key={b} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleBlock(b)} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: on ? tokens.ink : 'transparent', borderWidth: 1, borderColor: on ? tokens.ink : tokens.circleLine }}>
                  <Txt size={13} weight={600} color={on ? '#FFFFFF' : tokens.sub}>{`${on ? '✓' : '+'} ${b === 'seen' ? bp.seenLabel ?? label : label}`}</Txt>
                </PressScale>
              );
            })}
          </View>
          {bp.source && has('cover') ? <Txt size={13} line={18} color={tokens.sub}>{bp.source === 'movies' ? tx('Cover, Jahr und Regie suche ich bei jedem neuen Film selbst.', 'I look up cover, year and director for every new film.') : tx('Cover, Jahr und Autor suche ich bei jedem neuen Buch selbst.', 'I look up cover, year and author for every new book.')}</Txt> : null}
        </>
      ) : (
        <>
          {suggested && !tplPicked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: tokens.row }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tint(suggested.icon), alignItems: 'center', justifyContent: 'center' }}><ClayIcon name={suggested.icon} size={40} /></View>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight={600}>{tx('Vorlage übernehmen?', 'Use the template?')}</Txt>
                <Txt size={13} color={tokens.sub}>{tx(`${suggested.title}, ${suggested.count} Dinge`, `${suggested.title}, ${suggested.count} things`)}</Txt>
              </View>
              <Toggle value={tplOn} onChange={setTplOn} />
            </View>
          ) : null}
          <Label>{tx('Oder mit einer Vorlage starten', 'Or start from a template')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TEMPLATES.filter((t) => tplPicked || t.key !== suggested?.key).map((t) => {
              const on = tplPicked === t.key;
              return (
                <Chip
                  key={t.key}
                  bg={on ? tokens.ink : tokens.row}
                  color={on ? '#FFFFFF' : tokens.ink}
                  height={36}
                  icon={<ClayIcon name={t.icon} size={22} />}
                  onPress={() => {
                    haptics.select();
                    setTplPicked(on ? null : t.key);
                    if (!on && !name.trim()) setName(t.title);
                  }}
                >
                  {on ? `✓ ${t.title}` : t.title}
                </Chip>
              );
            })}
          </View>
        </>
      )}
      {fromHint ? <Txt size={13.5} line={19} color={tokens.sub}>{tx('Name, Datum und Vorlage kommen aus dem Urlaub in eurem Kalender.', 'Name, date and template come from the trip in your calendar.')}</Txt> : null}
    </Screen>
  );
}
