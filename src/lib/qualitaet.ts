/**
 * Qualitätstest (Julian 28.10.: "Hat das Auswirkungen auf die Qualität?").
 * 30 feste Sätze laufen als angemeldete Person durch "verstehen", immer mit
 * demselben Heute (Mi 28. Oktober 2026, 12 Uhr), damit Ergebnisse vergleichbar
 * sind. Jeder Satz hat Prüfungen; ein Satz zählt nur, wenn alle passen. Die
 * Ergebnisse landen in eval_runs, damit man sie ohne Handy auswerten kann.
 * Ein Lauf kostet etwa 3 Cent und zählt 30 Sätze gegen das Tageslimit.
 */
import { supabase } from './cloud';
import { TERMIN_ICON_NAMES, type Understood } from './talk';

const TODAY = '2026-10-28';
const NOW = '12:00';

type R = Understood;
type Check = [string, (r: R) => boolean];
type Case = { id: string; said: string; checks: Check[] };

const kind = (k: R['kind']): Check => [`kind ${k}`, (r) => r.kind === k];
const date = (d: string): Check => [`date ${d}`, (r) => r.date === d];
const start = (t: string | null): Check => [`start ${t ?? 'leer'}`, (r) => (r.start || null) === t];
const title = (re: RegExp): Check => [`title ${re}`, (r) => re.test(r.title ?? '')];
const asks: Check = ['fragt nach', (r) => !!r.question];
const noAsk: Check = ['fragt nicht', (r) => !r.question];
const list = (l: 'einkauf' | 'aufgaben'): Check => [`liste ${l}`, (r) => r.kind === 'liste' && r.list === l];
const items = (...re: RegExp[]): Check => [`items ${re.join(' ')}`, (r) => re.every((x) => (r.items ?? []).some((i) => x.test(i)))];
const who = (w: R['who']): Check => [`who ${w}`, (r) => r.who === w];
const icon = (i: string): Check => [`icon ${i}`, (r) => r.icon === i];
const all = (r: R) => [r, ...(r.more ?? [])] as { title: string; date: string | null; end_date: string | null; start: string | null }[];

export const CASES: Case[] = [
  { id: 'zahnarzt-julia', said: 'Julia hat Freitag um 15 Uhr Zahnarzt', checks: [kind('termin'), date('2026-10-30'), start('15:00'), who('J'), title(/zahnarzt/i), icon('zahnarzt')] },
  { id: 'kinderarzt-morgen', said: 'Morgen 9 Uhr Kinderarzt mit Ben', checks: [kind('termin'), date('2026-10-29'), start('09:00'), title(/arzt/i)] },
  { id: 'friseur-deutsch', said: 'Ich habe am Freitag um 13 Uhr einen Friseurtermin', checks: [kind('termin'), date('2026-10-30'), start('13:00'), title(/friseur/i), ['nicht übersetzt', (r) => !/hair/i.test(r.title)]] },
  { id: 'urlaub-seit', said: 'Wir sind seit Sonntag im Urlaub', checks: [kind('termin'), title(/urlaub/i), who('both'), date('2026-10-25')] },
  { id: 'abgebrochen', said: 'Wir sind seit Sonntag', checks: [kind('abgebrochen')] },
  { id: 'fussball-freunde', said: 'Ich gehe am Sonntag mit Annie und Irene zum Fußball beim FCN', checks: [kind('termin'), date('2026-11-01'), title(/fu(ß|ss)ball/i), ['Begleitung genannt', (r) => /annie/i.test(`${r.title} ${r.sub ?? ''}`)], asks, icon('fussball')] },
  { id: 'urlaub-und-arbeit', said: 'Ab heute Urlaub bis Sonntag, danach Arbeit von 8 bis 17 Uhr ab Dienstag', checks: [kind('termin'), ['zwei Termine', (r) => all(r).length >= 2], ['Urlaub 28.10. bis 1.11.', (r) => all(r).some((e) => /urlaub/i.test(e.title) && e.date === '2026-10-28' && e.end_date === '2026-11-01')], ['Arbeit ab Di 8 Uhr', (r) => all(r).some((e) => /arbeit/i.test(e.title) && e.date === '2026-11-03' && e.start === '08:00')]] },
  { id: 'einkauf-drei', said: 'Zucker, Mehl und Milch auf die Einkaufsliste', checks: [list('einkauf'), items(/zucker/i, /mehl/i, /milch/i)] },
  { id: 'karottenkuchen', said: 'Zucker, Mehl und Milch auf die Einkaufsliste, alles was man für einen Karottenkuchen braucht', checks: [list('einkauf'), ['Gericht erkannt', (r) => /karotten/i.test(r.dish ?? '')], ['Karotten ergänzt', (r) => [...(r.extra ?? []), ...(r.items ?? [])].some((i) => /karotte|möhre/i.test(i))]] },
  { id: 'bolognese', said: 'Ich will heute Abend Bolognese kochen', checks: [['Gericht erkannt', (r) => /bolognese/i.test(r.dish ?? '')], ['Zutaten oder Varianten', (r) => (r.extra ?? []).length + (r.variants ?? []).length > 0]] },
  { id: 'frage-frei', said: 'Wann haben wir beide frei?', checks: [kind('frage')] },
  { id: 'frage-morgen', said: 'Was steht morgen an?', checks: [kind('frage')] },
  { id: 'steuer-frist', said: 'Tom muss die Steuererklärung bis Freitag abgeben', checks: [['Aufgabe oder Termin am Freitag', (r) => (r.kind === 'liste' && r.list === 'aufgaben') || (r.kind === 'termin' && r.date === '2026-10-30')]] },
  { id: 'erinnern', said: 'Erinnere mich an die Kita Anmeldung', checks: [list('aufgaben')] },
  { id: 'elternabend', said: 'Elternabend Kita am Dienstag um 19:30', checks: [kind('termin'), date('2026-11-03'), start('19:30'), title(/elternabend/i)] },
  { id: 'schwimmkurs', said: 'Jeden Dienstag 17 Uhr Schwimmkurs für Ben', checks: [kind('termin'), start('17:00'), ['wiederholt sich', (r) => !!r.repeat], icon('schwimmen')] },
  { id: 'oma-mittag', said: 'Oma kommt am Samstag zum Mittagessen', checks: [kind('termin'), date('2026-10-31'), title(/oma|mittag/i)] },
  { id: 'impfpass', said: 'Freitag 10 Uhr Impfung Karlo, Impfpass mitnehmen', checks: [kind('termin'), date('2026-10-30'), start('10:00'), ['Impfpass mitnehmen', (r) => (r.bring ?? []).some((b) => /impfpass/i.test(b))]] },
  { id: 'englisch', said: 'Dentist on Friday at 3pm', checks: [kind('termin'), date('2026-10-30'), start('15:00'), title(/dentist/i)] },
  { id: 'windeln', said: 'Wir brauchen Windeln', checks: [list('einkauf'), items(/windel/i)] },
  { id: 'ohne-datum', said: 'Zahnarzt', checks: [kind('termin'), ['kein Datum geraten', (r) => !r.date], asks] },
  { id: 'unklar', said: 'äh', checks: [['unklar oder abgebrochen', (r) => r.kind === 'unklar' || r.kind === 'abgebrochen']] },
  { id: 'flug', said: 'Nächsten Freitag um 8 Uhr Flug nach Mallorca', checks: [kind('termin'), date('2026-10-30'), start('08:00'), icon('flugzeug')] },
  { id: 'geburtstag', said: 'Am 12. November hat Mia Geburtstag', checks: [kind('termin'), date('2026-11-12'), start(null), noAsk] },
  { id: 'kino-beide', said: 'Tom und ich gehen Samstag um 20 Uhr ins Kino', checks: [kind('termin'), date('2026-10-31'), start('20:00'), who('both')] },
  { id: 'friseur-ohne-zeit', said: 'Ich gehe am Montag zum Friseur', checks: [kind('termin'), date('2026-11-02'), asks] },
  { id: 'milch-brot', said: 'Milch und zwei Brot', checks: [list('einkauf'), items(/milch/i, /brot/i)] },
  { id: 'naechste-woche', said: 'Nächste Woche Mittwoch 16 Uhr Physiotherapie', checks: [kind('termin'), date('2026-11-04'), start('16:00'), title(/physio/i)] },
  { id: 'trag-ein', said: 'Bitte trag für übermorgen um 11 Uhr den Handwerker ein', checks: [kind('termin'), date('2026-10-30'), start('11:00'), title(/handwerker/i), ['kein Befehl im Titel', (r) => !/trag/i.test(r.title)]] },
  { id: 'urlaub-ab-heute', said: 'Wir sind ab heute im Urlaub bis Sonntag', checks: [kind('termin'), title(/urlaub/i), date('2026-10-28'), ['bis Sonntag', (r) => r.end_date === '2026-11-01'], start(null)] },
];

export type Outcome = { id: string; said: string; ok: boolean; failed: string[]; got: R | null };

/** Runs every case one after the other; `onStep` reports progress for the screen. */
export async function runQualityTest(onStep?: (done: number, total: number) => void): Promise<{ runId: string; results: Outcome[] }> {
  const runId = `q-${Date.now()}`;
  const results: Outcome[] = [];
  for (const c of CASES) {
    let got: R | null = null;
    let failed: string[];
    if (!supabase) failed = ['kein Server'];
    else {
      const { data, error } = await supabase.functions.invoke<R>('verstehen', {
        body: { text: c.said, today: TODAY, now: NOW, names: { J: 'Julia', T: 'Tom' }, lang: 'de', icons: TERMIN_ICON_NAMES },
      });
      got = error ? null : data;
      failed = got ? c.checks.filter(([, f]) => { try { return !f(got!); } catch { return true; } }).map(([l]) => l) : [`Fehler ${(error as { context?: { status?: number } } | null)?.context?.status ?? ''}`.trim()];
    }
    const o = { id: c.id, said: c.said, ok: !failed.length, failed, got };
    results.push(o);
    // Missing table or offline: the screen still shows the score.
    await supabase?.from('eval_runs').insert({ run_id: runId, case_id: o.id, said: o.said, ok: o.ok, failed: o.failed, got: o.got }).then(() => {}, () => {});
    onStep?.(results.length, CASES.length);
  }
  return { runId, results };
}
