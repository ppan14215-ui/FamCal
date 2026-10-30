/**
 * Die Testliste für den Assistenten (Julian 30.10.: "Wenn wir so weiter
 * machen und immer wieder Fehler haben wird das nicht mit der App"). Jeder
 * Fall ist ein echter Satz, die meisten so, wie Julian sie gesagt hat und wie
 * sie schiefgingen. Geprüft wird nicht, was Claude antwortet, sondern was
 * danach wirklich im Kalender und auf den Listen steht.
 *
 * Neuer Fehler auf dem Handy = neuer Fall hier, bevor er behoben wird.
 */
import type { CalEvent, List, Task } from '../../src/state/types';
import { weekday } from './familie';

export type Stand = { events: CalEvent[]; lists: List[]; tasks: Task[] };
export type Ergebnis = {
  /** Was die App nach allen Sätzen zeigt. */
  stand: Stand;
  vorher: Stand;
  /** Der Satz des Assistenten (antworten) oder seine Rückfrage. */
  antwort: string;
  frage: string | null;
  tools: string[];
  /** Art der Karte: event, done, answer, workClash, recipe, newList … */
  karte: string | null;
};
export type Fall = {
  id: string;
  /** Ein oder mehrere Sätze nacheinander, der zweite mit dem ersten als Verlauf. */
  saetze: string[];
  /** Andere Ausgangslage als die Familie, z.B. ohne Arbeit. */
  start?: (s: Stand) => Stand;
  pruefe: (e: Ergebnis) => string[];
};

// ─── Helfer ────────────────────────────────────────────────────────────────

const work = (s: Stand) => s.events.filter((e) => e.work);
const byId = (s: Stand, id: string) => s.events.find((e) => e.id === id);
const items = (s: Stand, list: string) => (s.lists.find((l) => l.id === list)?.sections.flatMap((x) => x.items) ?? []).map((i) => ({ ...i, text: `${i.qty ? `${i.qty} ` : ''}${i.name}` }));
const neu = (e: Ergebnis) => e.stand.events.filter((x) => !e.vorher.events.some((y) => y.id === x.id));
const fehlt = (e: Ergebnis) => e.vorher.events.filter((x) => !e.stand.events.some((y) => y.id === x.id));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const geaendert = (e: Ergebnis) => e.stand.events.filter((x) => { const y = e.vorher.events.find((v) => v.id === x.id); return y && !same(x, y); });
const buero = (x: CalEvent) => /büro|office/i.test(`${x.title} ${x.place ?? ''} ${x.sub ?? ''}`);
const homeoffice = (x: CalEvent) => /home ?office/i.test(`${x.title} ${x.place ?? ''} ${x.sub ?? ''}`);

const DE = /\b(ich|ist|und|der|die|das|dir|dein|deine|du|wie|viel|oder|um|wann|bis|kommt|trage|eingetragen|steht|habe|mach|gerne?|okay,? ich|alles klar)\b|ganztägig|ä|ö|ü|ß/i;
const EN = /\b(I|I'll|I've|the|your|you|added|done|sure|okay,? I)\b/;
function deutsch(e: Ergebnis): string[] {
  const t = e.frage ?? e.antwort;
  if (!t) return ['kein Satz vom Assistenten'];
  return DE.test(t) ? [] : [`Antwort nicht deutsch: "${t}"`];
}
function englisch(e: Ergebnis): string[] {
  const t = e.frage ?? e.antwort;
  if (!t) return ['kein Satz vom Assistenten'];
  return EN.test(t) && !/\b(ich|und|der|die|das)\b/i.test(t) ? [] : [`Antwort nicht englisch: "${t}"`];
}
const keineNeuen = (e: Ergebnis) => (neu(e).length ? [`neu angelegt statt geändert: ${neu(e).map((x) => `${x.title} ${x.date}`).join(', ')}`] : []);
const nichtsGeloescht = (e: Ergebnis) => (fehlt(e).length ? [`gelöscht: ${fehlt(e).map((x) => `${x.title} ${x.date}`).join(', ')}`] : []);
const keineFrage = (e: Ergebnis) => (e.frage ? [`unnötige Rückfrage: "${e.frage}"`] : []);
const nichtsGeaendert = (e: Ergebnis) => [...keineNeuen(e), ...nichtsGeloescht(e), ...(geaendert(e).length ? [`geändert: ${geaendert(e).map((x) => `${x.title} ${x.date}`).join(', ')}`] : [])];

/** Alle Mittwoche mit Arbeit sind Büro, alle anderen Arbeitstage unverändert. */
function mittwochsBuero(e: Ergebnis): string[] {
  const bad: string[] = [];
  const mi = work(e.stand).filter((x) => weekday(x.date) === 3);
  if (mi.length < 7) bad.push(`nur ${mi.length} Mittwoche mit Arbeit übrig`);
  const nicht = mi.filter((x) => !buero(x)).map((x) => x.date);
  if (nicht.length) bad.push(`${nicht.length} Mittwoche nicht Büro: ${nicht.slice(0, 4).join(', ')}${nicht.length > 4 ? ' …' : ''}`);
  const andere = geaendert(e).filter((x) => weekday(x.date) !== 3);
  if (andere.length) bad.push(`auch andere Tage geändert: ${andere.slice(0, 4).map((x) => x.date).join(', ')}`);
  return bad;
}

const ohneArbeit = (s: Stand): Stand => ({ ...s, events: s.events.filter((x) => !x.work) });

// ─── Die Fälle ─────────────────────────────────────────────────────────────

export const FAELLE: Fall[] = [
  // Julian 30.10., Screenshot: nur der 4.11. wurde geändert, Antwort auf Englisch.
  { id: 'mittwoch-arbeit-auf-buero', saetze: ['Ändere jeden Mittwoch Arbeit auf Büro'],
    pruefe: (e) => [...mittwochsBuero(e), ...keineNeuen(e), ...nichtsGeloescht(e), ...keineFrage(e), ...deutsch(e)] },
  // Julian 30.10.: wurde ein neuer Termin, der den Büro-Tag ersetzt hat.
  { id: 'ich-bin-mittwochs-im-buero', saetze: ['Ich bin jeden Mittwoch im Büro'],
    pruefe: (e) => [...mittwochsBuero(e), ...keineNeuen(e), ...nichtsGeloescht(e), ...deutsch(e)] },
  // Julian 29.10.: "bis Weihnachten" mit Uhrzeit, jeder Werktag ein Eintrag.
  { id: 'arbeit-bis-weihnachten', start: ohneArbeit, saetze: ['Ich muss ab Montag wieder arbeiten, bis Weihnachten jeden Tag von 9 bis 17 Uhr'],
    pruefe: (e) => {
      const w = work(e.stand);
      const bad: string[] = [];
      if (w.length < 35) bad.push(`nur ${w.length} Arbeitstage`);
      if (w.some((x) => weekday(x.date) === 0 || weekday(x.date) === 6)) bad.push('Arbeit am Wochenende');
      if (w.some((x) => x.date < '2026-11-02' || x.date > '2026-12-24')) bad.push(`Arbeit außerhalb 2.11. bis 24.12.: ${w.filter((x) => x.date < '2026-11-02' || x.date > '2026-12-24').map((x) => x.date).slice(0, 3).join(', ')}`);
      const zeit = w.filter((x) => x.allDay || x.start !== '09:00' || x.end !== '17:00');
      if (zeit.length) bad.push(`${zeit.length} Tage nicht 9 bis 17 Uhr`);
      return [...bad, ...deutsch(e)];
    } },
  // Julian 30.10.: "davon" gehört zum Satz davor.
  { id: 'davon-mittwochs-buero', start: ohneArbeit, saetze: ['Ich arbeite ab Montag bis Weihnachten jeden Tag von 9 bis 17 Uhr', 'Jeden Mittwoch davon bin ich im Büro'],
    pruefe: (e) => {
      const w = work(e.stand);
      const bad: string[] = [];
      if (w.length < 35) bad.push(`nur ${w.length} Arbeitstage`);
      const mi = w.filter((x) => weekday(x.date) === 3);
      const nicht = mi.filter((x) => !buero(x));
      if (mi.length < 7 || nicht.length) bad.push(`${nicht.length} von ${mi.length} Mittwochen nicht Büro`);
      const sonst = w.filter((x) => weekday(x.date) !== 3 && buero(x));
      if (sonst.length) bad.push(`${sonst.length} andere Tage auch Büro`);
      if (w.some((x) => x.allDay || x.start !== '09:00')) bad.push('Uhrzeit verloren');
      return [...bad, ...deutsch(e)];
    } },
  // Julian 30.10.: wurde ein neuer Termin von 9 bis 10.
  { id: 'freitag-nur-bis-15', saetze: ['Am Freitag arbeite ich nur bis 15 Uhr'],
    pruefe: (e) => {
      const f = byId(e.stand, 'arb-2026-10-30');
      return [...(f?.start === '09:00' && f.end === '15:00' ? [] : [`Freitag ist ${f ? `${f.start}-${f.end}` : 'weg'} statt 09:00-15:00`]), ...keineNeuen(e), ...deutsch(e)];
    } },
  { id: 'dezember-freitags-homeoffice', saetze: ['Im Dezember bin ich freitags im Homeoffice'],
    pruefe: (e) => {
      const w = work(e.stand).filter((x) => x.date.startsWith('2026-12'));
      const fr = w.filter((x) => weekday(x.date) === 5);
      const bad: string[] = [];
      if (fr.length < 3 || fr.some((x) => !homeoffice(x))) bad.push(`${fr.filter((x) => !homeoffice(x)).length} von ${fr.length} Dezember-Freitagen nicht Homeoffice`);
      if (w.some((x) => weekday(x.date) !== 5 && homeoffice(x))) bad.push('auch andere Tage Homeoffice');
      if (work(e.stand).some((x) => x.date.startsWith('2026-11') && homeoffice(x))) bad.push('auch November geändert');
      return [...bad, ...keineNeuen(e), ...deutsch(e)];
    } },
  { id: 'urlaub-arbeit-austragen', saetze: ['Nächste Woche habe ich Urlaub, nimm die Arbeit raus'],
    pruefe: (e) => {
      const bad: string[] = [];
      const left = work(e.stand).filter((x) => x.date >= '2026-11-02' && x.date <= '2026-11-06');
      if (left.length) bad.push(`noch ${left.length} Arbeitstage in der Woche vom 2.11.`);
      if (!byId(e.stand, 'arb-2026-11-09')) bad.push('auch die Woche danach gelöscht');
      if (!byId(e.stand, 'arb-2026-10-30')) bad.push('auch Freitag 30.10. gelöscht');
      return [...bad, ...deutsch(e)];
    } },
  { id: 'impfung-verschieben', saetze: ['Verschieb die Impfung von Karlo auf Montag um 9'],
    pruefe: (e) => {
      const i = byId(e.stand, 'impfung');
      return [...(i?.date === '2026-11-02' && i.start === '09:00' ? [] : [`Impfung steht auf ${i?.date} ${i?.start}`]), ...keineNeuen(e), ...keineFrage(e), ...deutsch(e)];
    } },
  { id: 'fussball-faellt-aus', saetze: ['Nächsten Dienstag fällt Fußball aus'],
    pruefe: (e) => {
      const f = byId(e.stand, 'fussball');
      if (!f) return ['ganze Fußball-Serie gelöscht'];
      return [...(f.skipDates?.includes('2026-11-03') || f.date > '2026-11-03' ? [] : ['3.11. fällt nicht aus']), ...keineNeuen(e), ...deutsch(e)];
    } },
  { id: 'frage-mittwoch', saetze: ['Was steht am Mittwoch an?'],
    pruefe: (e) => {
      const t = `${e.antwort} ${e.frage ?? ''}`;
      return [...nichtsGeaendert(e), ...(/fry/i.test(t) && /squash/i.test(t) ? [] : [`Fry oder Squash fehlt: "${t}"`]), ...deutsch(e)];
    } },
  { id: 'frage-wann-frei', saetze: ['Wann habe ich nächste Woche abends Zeit?'],
    pruefe: (e) => [...nichtsGeaendert(e), ...(e.antwort || e.frage ? [] : ['keine Antwort']), ...deutsch(e)] },
  { id: 'unklar-fragt-nach', saetze: ['Verschieb den Termin'],
    pruefe: (e) => [...nichtsGeaendert(e), ...(e.frage ? [] : ['keine Rückfrage'])] },
  // Aufgaben sind ausgeblendet (Julian 30.10.): eine Erinnerung landet irgendwo als Eintrag, nie als Termin.
  { id: 'erinnerung-kein-termin', saetze: ['Erinnere mich morgen, die Kita anzurufen'],
    pruefe: (e) => {
      const da = e.stand.tasks.some((x) => /kita/i.test(x.title) && x.id !== 't-kita') || e.stand.lists.some((l) => l.sections.some((x) => x.items.some((i) => /kita/i.test(i.name))));
      return [...(da ? [] : ['nirgends eingetragen']), ...keineNeuen(e), ...deutsch(e)];
    } },
  // Julian 30.10. 22:18: "Bei Kinderarzt sollte der Assistent smart genug sein zu wissen, falls ihr vorher schon mal wart."
  { id: 'kinderarzt-wie-letztes-mal', saetze: ['Nächsten Dienstag um 9 Kinderarzt mit Karlo'],
    pruefe: (e) => {
      const k = neu(e).find((x) => /kinderarzt/i.test(x.title));
      return [...(k?.date === '2026-11-03' && k.start === '09:00' ? [] : [`Kinderarzt: ${k ? `${k.date} ${k.start}` : 'fehlt'}`]), ...(k && /weber/i.test(k.place ?? '') ? [] : [`Ort nicht vom letzten Mal: ${k?.place ?? 'leer'}`]), ...deutsch(e)];
    } },
  // Julian 30.10.: "bestätigt aber das falsche", die Antwort sagte bis 15:39, der ganztägige Arbeitstag blieb ganztägig.
  { id: 'arbeit-nur-bis', saetze: ['Am Freitag, den 6. November, arbeite ich nur bis 15:39'],
    pruefe: (e) => {
      const f = byId(e.stand, 'arb-2026-11-06');
      const other = byId(e.stand, 'arb-2026-11-13');
      return [
        ...(f && !f.allDay && f.end === '15:39' ? [] : [`6.11.: ${f ? `allDay ${f.allDay}, ${f.start} bis ${f.end}` : 'fehlt'}`]),
        ...(other?.allDay && !other.end ? [] : ['13.11. mitgeändert']),
        ...(neu(e).length ? [`neu angelegt: ${neu(e).map((x) => x.title).join(', ')}`] : []),
        ...deutsch(e),
      ];
    } },
  // Julian 30.10.: dreimal "Weihnachten" im Kalender, der Ort stand nur in der Location. "Dass Weihnachten ist, weiß ich selber."
  { id: 'weihnachten-wo', saetze: ['An Weihnachten sind wir bei meiner Mutter. Am zweiten fahren wir zur Oma. Am ersten Feiertag bei Sophias Eltern'],
    pruefe: (e) => {
      const n = neu(e);
      const at = (d: string) => n.find((x) => x.date === d);
      const want: [string, RegExp][] = [['2026-12-24', /mutter|mama/i], ['2026-12-25', /sophia|eltern/i], ['2026-12-26', /oma/i]];
      return [
        ...want.flatMap(([d, re]) => (at(d) && re.test(at(d)!.title) ? [] : [`${d}: Titel ${at(d)?.title ?? 'fehlt'}`])),
        ...(new Set(n.map((x) => x.title)).size === n.length ? [] : ['gleicher Titel mehrmals']),
        ...keineFrage(e), ...deutsch(e),
      ];
    } },
  { id: 'urlaub-ganztaegig', saetze: ['Wir fahren vom 20. bis 27. Dezember zu Oma'],
    pruefe: (e) => {
      const n = neu(e);
      const u = n.find((x) => x.date === '2026-12-20');
      return [...(u ? (u.allDay && u.endDate === '2026-12-27' ? [] : [`${u.title}: allDay ${u.allDay}, bis ${u.endDate}`]) : [`kein Eintrag am 20.12. (${n.map((x) => x.date).join(', ')})`]), ...keineFrage(e), ...deutsch(e)];
    } },
  { id: 'nach-der-arbeit', saetze: ['Marco kommt am Donnerstag nach der Arbeit'],
    pruefe: (e) => {
      const m = neu(e).find((x) => /marco/i.test(x.title));
      if (!m) return ['kein Termin für Marco'];
      const bad = m.date === '2026-11-05' || m.date === '2026-10-29' ? [] : [`Marco am ${m.date}`];
      // Arbeit hat an dem Tag keine Uhrzeit: keine erfundene Startzeit.
      if (!m.allDay && !e.frage) bad.push(`Uhrzeit erfunden: ${m.start}`);
      return [...bad, ...deutsch(e)];
    } },
  { id: 'einkauf-ohne-kommas', saetze: ['Wir brauchen noch Cornflakes Milchzucker Mehl'],
    pruefe: (e) => {
      const got = items(e.stand, 'einkauf').map((i) => i.name.toLowerCase());
      const miss = ['cornflakes', 'milchzucker', 'mehl'].filter((w) => !got.some((g) => g === w || g.startsWith(`${w} `) || g.endsWith(` ${w}`)));
      return [...(miss.length ? [`fehlt einzeln: ${miss.join(', ')} (Liste: ${got.join(', ')})`] : []), ...keineNeuen(e), ...deutsch(e)];
    } },
  { id: 'einkauf-nicht-doppelt', saetze: ['Wir brauchen 3 Hafermilch'],
    pruefe: (e) => {
      const h = items(e.stand, 'einkauf').filter((i) => /hafermilch/i.test(i.name) && !i.done);
      return [...(h.length === 1 ? [] : [`${h.length} mal Hafermilch`]), ...(h[0] && /3/.test(h[0].text) ? [] : [`Menge: ${h[0]?.text}`]), ...deutsch(e)];
    } },
  { id: 'zwei-dinge', saetze: ['Morgen um 10 Zahnarzt und wir brauchen Milch'],
    pruefe: (e) => {
      const z = neu(e).find((x) => /zahnarzt/i.test(x.title));
      const m = items(e.stand, 'einkauf').some((i) => /^milch$/i.test(i.name));
      return [...(z?.date === '2026-10-30' && z.start === '10:00' ? [] : [`Zahnarzt: ${z ? `${z.date} ${z.start}` : 'fehlt'}`]), ...(m ? [] : ['Milch fehlt']), ...deutsch(e)];
    } },
  { id: 'rezept', saetze: ['Heute Abend koche ich Bolognese'],
    pruefe: (e) => [...(e.tools.includes('rezept') ? [] : [`kein Rezept, sondern ${e.tools.join(', ')}`]), ...keineNeuen(e), ...deutsch(e)] },
  { id: 'englisch-bleibt-englisch', saetze: ['I have a dentist appointment next Tuesday at 3pm'],
    pruefe: (e) => {
      const d = neu(e).find((x) => x.date === '2026-11-03');
      return [...(d && /dentist/i.test(d.title) && d.start === '15:00' ? [] : [`Termin: ${d ? `${d.title} ${d.start}` : 'fehlt'}`]), ...englisch(e)];
    } },
  { id: 'gemischt-deutsch', saetze: ['Trag mir am Samstag Grillen mit Freunden ein, so um 6pm'],
    pruefe: (e) => {
      const g = neu(e).find((x) => /grill/i.test(x.title));
      return [...(g?.date === '2026-10-31' && g.start === '18:00' ? [] : [`Grillen: ${g ? `${g.date} ${g.start}` : 'fehlt'}`]), ...deutsch(e)];
    } },
  { id: 'loeschen-einzeln', saetze: ['Lösch den Zug nach Leipzig'],
    pruefe: (e) => [...(byId(e.stand, 'zug') ? ['Zug steht noch drin'] : []), ...(fehlt(e).length === 1 ? [] : [`${fehlt(e).length} Termine gelöscht`]), ...deutsch(e)] },
  { id: 'korrektur-danach', saetze: ['Am Montag um 15 Uhr Friseur', 'Nein, um 16 Uhr'],
    pruefe: (e) => {
      const f = e.stand.events.filter((x) => /friseur/i.test(x.title));
      return [...(f.length === 1 ? [] : [`${f.length} Friseur-Termine`]), ...(f[0]?.start === '16:00' && f[0].date === '2026-11-02' ? [] : [`Friseur: ${f[0]?.date} ${f[0]?.start}`]), ...deutsch(e)];
    } },
];
