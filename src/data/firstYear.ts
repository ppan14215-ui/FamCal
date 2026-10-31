/**
 * Euer erstes Jahr: what the app can put into the calendar from a birth date
 * (or due date) alone. Timings follow the German U-Heft (U2 to U6), the STIKO
 * schedule (2, 4, 11 months) and the retroactive limits for Elterngeld (three
 * months) and Kindergeld (six months). Nothing is marked done: the app cannot
 * know, so past items ask instead.
 */
import { TODAY, addDays, daysBetween, short, dayNum, MONTHS_SHORT, monthIdx } from '../lib/dates';
import type { Milestone, Task } from '../state/types';
import type { ClayName } from '../lib/clayIcons';
import type { City } from './cities';

export type Kid = { name: string; born?: string; due?: string; land?: string };

export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
const dm = (iso: string) => `${dayNum(iso)}. ${MONTHS_SHORT[monthIdx(iso)]}`;

type Plan = { key: string; icon: ClayName; title: string; when: string; sub: string; frist?: boolean; task?: string; text?: string; url?: string };

function afterBirth(b: string, name: string, city?: City): Plan[] {
  const kita = city
    ? `In ${city.name} über ${city.kita.name}. ${city.kita.how} Viele Kitas vergeben ein halbes Jahr im Voraus.`
    : 'Über das Kita-Portal der Stadt. Viele Kitas vergeben ein halbes Jahr im Voraus.';
  return [
    { key: 'standesamt', icon: 'urkunde', title: 'Geburt beim Standesamt anzeigen', when: addDays(b, 7), sub: 'innerhalb einer Woche', frist: true, task: 'Geburtsurkunde holen', text: 'Mit Ausweisen, Heiratsurkunde oder Vaterschaftsanerkennung. Gleich drei Kopien mitnehmen.' },
    { key: 'u2', icon: 'u-heft', title: 'U2', when: addDays(b, 5), sub: '3.–10. Lebenstag' },
    { key: 'kk', icon: 'krankenkasse', title: 'Bei der Krankenkasse anmelden', when: addDays(b, 14), sub: 'nach der Geburtsurkunde', task: `Krankenkasse für ${name}`, text: 'Familienversicherung beantragen, die Versichertenkarte kommt per Post.' },
    { key: 'u3', icon: 'u-heft', title: 'U3', when: addDays(b, 31), sub: '4.–5. Woche' },
    { key: 'impf1', icon: 'impfung', title: 'Erste Impfungen', when: addDays(b, 56), sub: 'ab 8. Woche', task: 'Erste Impfungen', text: 'Beim Kinderarzt. Impfpass und U-Heft mitnehmen.' },
    { key: 'eg', icon: 'umschlag-euro', title: 'Elterngeld beantragen', when: addMonths(b, 3), sub: 'rückwirkend nur drei Monate', frist: true, task: 'Elterngeld beantragen', text: 'Rückwirkend gibt es Elterngeld nur für drei Lebensmonate. Braucht Geburtsurkunde und Gehaltsnachweise.' },
    { key: 'u4', icon: 'stethoskop', title: 'U4', when: addMonths(b, 3), sub: '3.–4. Monat', task: 'U4 ausmachen', text: 'Beim Kinderarzt anrufen, am besten gleich mit den zweiten Impfungen.' },
    { key: 'impf2', icon: 'impfung', title: 'Zweite Impfungen', when: addMonths(b, 4), sub: 'mit 4 Monaten' },
    { key: 'kg', icon: 'kindergeld', title: 'Kindergeld beantragen', when: addMonths(b, 6), sub: 'rückwirkend sechs Monate', frist: true, task: 'Kindergeld beantragen', text: 'Bei der Familienkasse, mit Steuer-ID des Kindes. Die kommt einige Wochen nach der Geburt per Post.' },
    { key: 'u5', icon: 'u-heft', title: 'U5', when: addMonths(b, 6), sub: '6.–7. Monat' },
    { key: 'kita', icon: 'kita', title: 'Kita-Platz anfragen', when: addMonths(b, 6), sub: 'für den Start mit etwa einem Jahr', task: 'Kita-Platz anfragen', text: kita, url: city?.kita.url },
    { key: 'u6', icon: 'stethoskop', title: 'U6', when: addMonths(b, 10), sub: '10.–12. Monat' },
    { key: 'impf3', icon: 'impfung', title: 'Dritte Impfungen', when: addMonths(b, 11), sub: 'mit 11 Monaten' },
    { key: 'bday', icon: 'geburtstag', title: 'Erster Geburtstag', when: addMonths(b, 12), sub: short(addMonths(b, 12)) },
  ];
}

function beforeBirth(d: string): Plan[] {
  return [
    { key: 'hebamme', icon: 'hebamme', title: 'Hebamme finden', when: TODAY, sub: 'so früh wie möglich', task: 'Hebamme finden', text: 'Viele sind früh ausgebucht. Für Wochenbett und Nachsorge.' },
    { key: 'kurs', icon: 'yogamatte', title: 'Geburtsvorbereitungskurs', when: addDays(d, -7 * 12), sub: 'SSW 28 bis 30', task: 'Geburtsvorbereitungskurs buchen' },
    { key: 'kinderarzt', icon: 'stethoskop', title: 'Kinderarzt suchen', when: addDays(d, -7 * 8), sub: 'vor der Geburt', task: 'Kinderarzt suchen' },
    { key: 'elternzeit', icon: 'vertrag', title: 'Elternzeit anmelden', when: addDays(d, -7 * 7), sub: 'sieben Wochen vor Beginn', frist: true, task: 'Elternzeit beim Arbeitgeber anmelden' },
    { key: 'mutterschutz', icon: 'kalender', title: 'Mutterschutz beginnt', when: addDays(d, -42), sub: 'sechs Wochen vor dem Termin' },
    { key: 'klinik', icon: 'rucksack', title: 'Kliniktasche packen', when: addDays(d, -42), sub: 'ab SSW 34', task: 'Kliniktasche packen' },
    { key: 'geburt', icon: 'geburtstag', title: 'Errechneter Termin', when: d, sub: short(d) },
  ];
}

/** Milestones for the year ring and the cards for "Wer kümmert sich?". */
export function firstYear(kid: Kid, city?: City): { milestones: Milestone[]; cards: Task[] } {
  const name = kid.name || 'euer Kind';
  const plan = kid.born ? afterBirth(kid.born, name, city) : kid.due ? [...beforeBirth(kid.due), ...afterBirth(kid.due, name, city).filter((p) => p.key !== 'u2')] : [];
  const milestones: Milestone[] = plan.map((p) => {
    const past = p.when < TODAY;
    return {
      id: `m-${p.key}`, icon: p.icon, title: p.title, date: p.when, frist: p.frist, done: false, text: p.text,
      // The app cannot know what already happened, so it asks.
      sub: past ? `war um den ${dm(p.when)} · schon erledigt?` : p.frist ? `Frist ${dm(p.when)}` : p.sub,
    };
  });
  const cards: Task[] = plan
    .filter((p) => p.task && (p.when >= TODAY || p.frist))
    .map((p) => {
      const d = daysBetween(TODAY, p.when);
      const label = d < 0 ? `war am ${dm(p.when)}` : d === 0 ? 'heute' : d < 14 ? `${short(p.when)} · in ${d} Tagen` : `${p.frist ? 'Frist ' : ''}${dm(p.when)} · noch ${Math.floor(d / 7)} Wochen`;
      return { id: `o-${p.key}`, title: p.task!, icon: p.icon, due: p.when, dueLabel: label, frist: p.frist, who: null, done: false, text: p.text, url: p.url };
    });
  return { milestones, cards };
}
