/**
 * Erstes Jahr (Julian 28.11.: the Chat tab goes, this tab makes the positioning visible; he picked draft A "Diese
 * Woche"). Where the child stands in its first year, one sentence from Memo on what really counts this week, the next
 * steps with their countdown and who has them, then what comes after. Everything comes from the milestones the app
 * built from the birth date (firstYear.ts), nothing here is invented.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, H1 } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import PressScale from '../../src/components/ui/PressScale';
import LineIcon from '../../src/components/ui/LineIcon';
import Pin from '../../src/components/buddy/Pin';
import { Avatar, usePersons } from '../../src/components/ui/Person';
import { tokens, type PersonId } from '../../src/theme';
import { actions, useStore } from '../../src/state/store';
import { TODAY, daysBetween, MONTHS_SHORT, monthIdx, dayNum } from '../../src/lib/dates';
import { addMonths } from '../../src/data/firstYear';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';
import type { Milestone } from '../../src/state/types';

/** Whole months between two days, the way Lebensmonate count (from the birthday to the same day next month). */
function monthsSince(born: string, day: string) {
  let n = 0;
  while (n < 24 && addMonths(born, n + 1) <= day) n++;
  return n;
}

const countdown = (d: number) =>
  d < 0 ? tx(`war vor ${-d} Tagen`, `was ${-d} days ago`) : d === 0 ? tx('heute', 'today') : d === 1 ? tx('morgen', 'tomorrow') : tx(`noch ${d} Tage`, `${d} days left`);

export default function Jahr() {
  const kid = useStore((s) => s.kid);
  const all = useStore((s) => s.milestones);
  const pp = usePersons();

  const born = kid?.born;
  const lm = born ? monthsSince(born, TODAY) : -1; // finished Lebensmonate
  const weeks = born ? Math.floor(daysBetween(born, TODAY) / 7) : 0;
  const name = kid?.name || tx('Euer Kind', 'Your child');
  const kicker = born
    ? tx(`${name} ist ${weeks} Wochen alt · ${lm + 1}. Lebensmonat`, `${name} is ${weeks} weeks old · month ${lm + 1}`)
    : kid?.due ? tx(`Noch ${Math.max(0, Math.ceil(daysBetween(TODAY, kid.due) / 7))} Wochen bis zum Termin`, `${Math.max(0, Math.ceil(daysBetween(TODAY, kid.due) / 7))} weeks to the due date`)
    : tx('Euer erstes Jahr', 'Your first year');

  // Open steps: deadlines that passed stay (they still matter), other past things the app cannot judge are left out.
  const open = all
    .filter((m) => !m.done && (m.date >= TODAY || m.frist))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const next = open.slice(0, 3);
  const later = open.slice(3, 9);

  // Memo's sentence: the closest deadline, and who has it.
  const top = open.find((m) => m.frist && m.date >= TODAY) ?? open.find((m) => m.date >= TODAY);
  const owner = (w: Milestone['who']) => (w === 'J' || w === 'T' ? pp[w].name : w === 'both' ? tx('Ihr beide', 'You both') : '');
  const say = !top ? tx('Gerade steht nichts an. Ich sage Bescheid, wenn sich das ändert.', 'Nothing is due right now. I will tell you when that changes.')
    : tx(`${daysBetween(TODAY, top.date) <= 7 ? 'Diese Woche' : 'Als Nächstes'} zählt eins wirklich: ${top.title}.`, `${daysBetween(TODAY, top.date) <= 7 ? 'This week' : 'Next'} one thing really counts: ${top.title}.`)
      + ' ' + (top.who ? tx(`${owner(top.who)} hat es übernommen.`, `${owner(top.who)} has it.`) : tx('Noch hat es keiner übernommen.', 'Nobody has taken it yet.'));

  return (
    <Screen tab gap={12} head={<H1 sub={kicker}>{tx('Erstes Jahr', 'First year')}</H1>}>
      <YearBar done={lm} on={born != null} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tokens.row, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: tokens.groupLine }}>
        <Pin size={44} mood="idle" ground={tokens.row} />
        <Txt size={16} line={22} weight={500} style={{ flex: 1 }}>{say}</Txt>
      </View>

      {next.length ? <Txt size={13} weight={600} color={tokens.mute} style={{ marginTop: 6, letterSpacing: 0.6, textTransform: 'uppercase' }}>{tx('Als Nächstes', 'Next up')}</Txt> : null}
      {next.map((m) => <Step key={m.id} m={m} />)}

      {later.length ? (
        <>
          <Txt size={13} weight={600} color={tokens.mute} style={{ marginTop: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>{tx('Danach', 'After that')}</Txt>
          <View style={{ backgroundColor: tokens.group, borderRadius: 16, paddingHorizontal: 14 }}>
            {later.map((m, i) => (
              <PressScale key={m.id} scale={0.98} accessibilityLabel={m.title} onPress={() => { haptics.select(); router.push(`/meilenstein/${m.id}` as any); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: tokens.groupLine }}>
                <Txt size={14} weight={600} color={tokens.mute} style={{ width: 34 }}>{MONTHS_SHORT[monthIdx(m.date)]}</Txt>
                <Txt size={15} weight={500} numberOfLines={1} style={{ flex: 1 }}>{m.title}</Txt>
                {m.who ? <Avatar p={m.who === 'both' ? 'J' : m.who} size={20} /> : null}
              </PressScale>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/** Twelve Lebensmonate, from the birth to the first birthday; the ones lived are ink, the current one half. */
function YearBar({ done, on }: { done: number; on: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: on && i < done ? tokens.ink : on && i === done ? tokens.sub : tokens.group }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt size={12} weight={500} color={tokens.mute}>{tx('Geburt', 'Birth')}</Txt>
        <Txt size={12} weight={500} color={tokens.mute}>{tx('1. Geburtstag', '1st birthday')}</Txt>
      </View>
    </View>
  );
}

/** One next step: what, when at the latest, the countdown, and who has it (or the chip to take it). */
function Step({ m }: { m: Milestone }) {
  const d = daysBetween(TODAY, m.date);
  const [pick, setPick] = useState(false);
  const urgent = !!m.frist && d <= 45;
  const take = (w: PersonId) => { haptics.commit(); actions.setMilestoneWho(m.id, w); setPick(false); };
  // A deadline that passed: the app cannot know if it happened, so it asks, and only the check marks it done.
  const past = d < 0;
  return (
    <PressScale scale={0.98} accessibilityLabel={m.title} onPress={() => { haptics.select(); router.push(`/meilenstein/${m.id}` as any); }}
      style={{ backgroundColor: tokens.group, borderRadius: 18, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={17} line={22} weight={600}>{m.title}</Txt>
          <Txt size={14} line={19} weight={500} color={tokens.sub} numberOfLines={2}>
            {`${dayNum(m.date)}. ${MONTHS_SHORT[monthIdx(m.date)]}${m.frist ? tx(' · spätestens', ' · at the latest') : ''}`}
          </Txt>
        </View>
        {m.who ? (
          <PressScale accessibilityLabel={tx('Anderer übernimmt', 'Someone else takes it')} hitSlop={8} onPress={() => setPick((x) => !x)}>
            <Avatar p={m.who === 'both' ? 'J' : m.who} size={28} />
          </PressScale>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Txt size={14} weight={600} color={urgent && !past ? tokens.frist : tokens.sub}>{countdown(d)}</Txt>
        {past ? (
          <PressScale accessibilityLabel={tx('Ist erledigt', 'It is done')} onPress={() => { haptics.commit(); actions.toggleMilestone(m.id); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.groupLine }}>
            <LineIcon name="check" size={15} color={tokens.ink} stroke={2.2} />
            <Txt size={13} weight={600}>{tx('Schon erledigt?', 'Already done?')}</Txt>
          </PressScale>
        ) : null}
        {!past && !m.who && !pick ? (
          <PressScale accessibilityLabel={tx('Wer übernimmt?', 'Who takes it?')} onPress={() => { haptics.select(); setPick(true); }}
            style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.groupLine }}>
            <Txt size={13} weight={600}>{tx('Wer übernimmt?', 'Who takes it?')}</Txt>
          </PressScale>
        ) : null}
        {pick ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['J', 'T'] as PersonId[]).map((w) => (
              <PressScale key={w} accessibilityLabel={w} hitSlop={6} onPress={() => take(w)}><Avatar p={w} size={30} /></PressScale>
            ))}
          </View>
        ) : null}
      </View>
    </PressScale>
  );
}
