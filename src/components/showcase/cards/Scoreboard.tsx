/**
 * The table of a points list (Julian 30.10.: Rommé): who leads, how many rounds, each player's last
 * rounds and total, and the sentence to say next. Pure view, moved out of app/(tabs)/listen.tsx
 * 02.11. so the onboarding showcase draws the same board from its demo list. Buttons that change
 * the list (Neue Partie, "Ist die Partie vorbei?") come in from the caller through `action`/`alert`.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from '../../ui/Txt';
import { tokens } from '../../../theme';
import type { Item, List } from '../../../state/types';
import { players, roundsOf, total, ranked, lowWinsOf } from '../../../lib/points';
import { gameRule, KNIFFEL_FIELDS, kniffelUpper } from '../../../lib/games';
import { tx } from '../../../i18n/lang';

const isKniffel = (l: List) => /kniffel|yahtzee/i.test(l.name);

/** Kniffel block (Julian 01.11.): every box per player, top sum with the 35 bonus, total. */
export function KniffelSheet({ list }: { list: List }) {
  const ps = players(list);
  if (!ps.length) return null;
  const cell = { width: 44, textAlign: 'right' as const };
  const row = (label: string, vals: (string | number)[], strong = false, key = label) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderTopWidth: strong ? 1 : 0, borderTopColor: tokens.hair }}>
      <Txt size={13.5} weight={strong ? 700 : 500} color={strong ? tokens.ink : tokens.sub} style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
      {vals.map((v, i) => <Txt key={i} size={14} weight={strong ? 700 : 500} color={v === '·' ? tokens.mute : tokens.ink} style={cell}>{v}</Txt>)}
    </View>
  );
  const f = (p: Item) => p.data?.fields ?? {};
  const v = (p: Item, k: string) => (f(p)[k] ?? '·');
  return (
    <View style={{ gap: 0 }}>
      {row('', ps.map((p) => p.name.slice(0, 5)), false, 'head')}
      {KNIFFEL_FIELDS.filter((x) => x.face).map((x) => row(tx(x.de, x.en), ps.map((p) => v(p, x.key)), false, x.key))}
      {row(tx('Oben', 'Top'), ps.map((p) => kniffelUpper(f(p))), true, 'top')}
      {row(tx('Bonus ab 63', 'Bonus at 63'), ps.map((p) => f(p).bonus ?? `${Math.max(0, 63 - kniffelUpper(f(p)))}`), false, 'bonus')}
      {KNIFFEL_FIELDS.filter((x) => !x.face).map((x) => row(tx(x.de, x.en), ps.map((p) => v(p, x.key)), false, x.key))}
      {row(tx('Gesamt', 'Total'), ps.map((p) => total(p)), true, 'sum')}
    </View>
  );
}

export type ScoreboardProps = {
  list: List;
  /** Right of "Nach 2 Runden" (listen.tsx: Neue Partie). Only shown once a round is in. */
  action?: React.ReactNode;
  /** Between the rule and the leader (listen.tsx: "Ist die Partie vorbei?"). */
  alert?: React.ReactNode;
  /** The "Sag einfach …" line at the bottom; on by default. */
  hint?: boolean;
};

export default function Scoreboard({ list, action, alert, hint = true }: ScoreboardProps) {
  const ps = players(list);
  const n = roundsOf(list);
  const sorted = ranked(list);
  const lead = n ? sorted[0] : undefined;
  const rule = gameRule(list.name);
  const low = lowWinsOf(list);
  const example = isKniffel(list) ? `${ps[0]?.name ?? 'Julian'} Full House, ${ps[1]?.name ?? 'Sophia'} ${tx('drei Sechser', 'three sixes')}` : ps.length ? ps.slice(0, 2).map((p, i) => `${p.name} ${i ? 12 : 35}`).join(', ') : tx('Julian 35, Sophia 12', 'Julian 35, Sophia 12');
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 22, backgroundColor: tokens.row }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt size={13} weight={600} color={tokens.sub}>{n ? tx(`Nach ${n} ${n === 1 ? 'Runde' : 'Runden'}`, `After ${n} ${n === 1 ? 'round' : 'rounds'}`) : tx('Noch keine Runde', 'No round yet')}</Txt>
        {n ? action : null}
      </View>
      {!n && rule ? <Txt size={14} line={20} color={tokens.sub}>{rule.how()}</Txt> : null}
      {alert}
      {lead ? <Txt size={22} line={28} weight={700} tracking={-0.4}>{tx(`${lead.name} führt mit ${total(lead)}`, `${lead.name} leads with ${total(lead)}`)}</Txt> : null}
      {n && isKniffel(list) ? <KniffelSheet list={list} /> : null}
      {n && !isKniffel(list) ? (
        <View style={{ gap: 6 }}>
          {sorted.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt size={15} weight={700} color={tokens.sub} style={{ width: 18 }}>{i + 1}</Txt>
              <Txt size={15.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>{p.name}</Txt>
              <Txt size={13} color={tokens.mute} numberOfLines={1}>{(p.data?.rounds ?? []).slice(-4).join(' · ')}</Txt>
              <Txt size={17} weight={700} style={{ minWidth: 44, textAlign: 'right' }}>{total(p)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {hint ? <Txt size={13.5} line={19} color={tokens.sub}>{tx(`Sag einfach „${example}“. ${list.blueprint?.points?.doubleWord ? '„Hand“ oder „auf einmal raus“ zählt die Runde doppelt. ' : ''}${low ? 'Wenig Punkte gewinnt.' : 'Viele Punkte gewinnt.'}`, `Just say “${example}”. ${list.blueprint?.points?.doubleWord ? '“Hand” or “all at once” doubles the round. ' : ''}${low ? 'Fewest points win.' : 'Most points win.'}`)}</Txt> : null}
    </View>
  );
}
