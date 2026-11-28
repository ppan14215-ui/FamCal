/**
 * Eine große Familie nach viel Nutzung (Julian 05.11. 22:30: "wichtig ist, dass
 * die Aufgaben trotzdem sauber bearbeitet werden können, auch nach viel Nutzung
 * und viel Kontext"). Fünf Personen, rund 1000 Termine über zwei Jahre, 20
 * Listen, 200 gemerkte Fakten. Erzeugt, nicht echt, immer gleich (fester
 * Zufall), damit jeder Lauf dasselbe prüft. Der Testtag bleibt Do 29.10.2026.
 *
 * Ein paar Dinge liegen bewusst weit weg vom Testtag, damit der Assistent sie
 * nur über die Suche findet: Karlos letzter Zahnarzt, Mias Schuhgröße zwischen
 * 200 Fakten, Schrauben auf einer langen Baumarkt-Liste, Omas Geburtstag.
 */
import type { CalEvent, List, Person } from '../../src/state/types';
import { termine as basis, listen as basisListen, weekday } from './familie';

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const add = (d: string, n: number) => iso(Date.parse(`${d}T12:00:00Z`) + n * DAY);
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const hh = (h: number, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export const LEUTE: Person[] = [
  { id: 'p_karlo', name: 'Karlo', kind: 'kind', color: 'Mint', birthday: '2023-04-02' },
  { id: 'p_mia', name: 'Mia', kind: 'kind', color: 'Rosa', birthday: '2019-09-15' },
  { id: 'p_oma', name: 'Oma Inge', kind: 'grosseltern', color: 'Sand', birthday: '1956-03-08' },
];

const ev = (id: string, title: string, date: string, more: Partial<CalEvent> = {}): CalEvent =>
  ({ id, title, date, start: '00:00', allDay: true, icon: 'kalender', who: 'J', ...more } as CalEvent);

export function grossTermine(): CalEvent[] {
  seed = 7;
  const out: CalEvent[] = [...basis()];
  const from = '2025-11-01';
  const KIND = ['Kinderturnen', 'Musikschule', 'Spielplatz', 'Schwimmen', 'Kindergeburtstag', 'Logopädie', 'Basteln', 'Reiten'];
  const ALLTAG = ['Friseur', 'Baumarkt', 'Elternabend', 'Kino', 'Essen mit Freunden', 'Yoga', 'Laufen', 'Steuerberater', 'Autowerkstatt', 'Physiotherapie', 'Konzert', 'Grillen', 'Babysitter', 'Paket abholen', 'Bank', 'Tierarzt'];
  const ORTE = ['Stadtbad', 'Musikschule Fürth', 'Kita Sonnenschein', 'Grundschule Süd', 'Hauptstr. 3', '', '', ''];
  let n = 0;
  for (let i = 0; i < 730; i++) {
    const d = add(from, i);
    const wd = weekday(d);
    // About one a day plus kids' afternoons: ~1000 over two years.
    if (rnd() < 0.62) {
      const kid = rnd() < 0.5;
      const h = kid ? 15 + Math.floor(rnd() * 3) : 8 + Math.floor(rnd() * 12);
      out.push(ev(`g${++n}`, kid ? pick(KIND) : pick(ALLTAG), d, {
        allDay: false, start: hh(h, pick([0, 15, 30])), end: hh(h + 1, pick([0, 30])),
        who: pick(['J', 'T', 'both'] as const), place: pick(ORTE) || undefined,
        people: kid ? [pick(['p_karlo', 'p_mia'])] : undefined, sub: kid ? undefined : rnd() < 0.2 ? 'mit Mia' : undefined,
      }));
    }
    if (wd === 6 && rnd() < 0.25) out.push(ev(`g${++n}`, pick(['Besuch bei Oma Inge', 'Ausflug', 'Flohmarkt', 'Wandern']), d, { who: 'both' }));
  }
  // Ärzte, verstreut; der letzte Zahnarzt von Karlo ist im März 2026.
  for (const [i, d] of ['2025-12-03', '2026-06-18', '2027-02-09'].entries()) out.push(ev(`kinderarzt-${i}`, 'Kinderarzt', d, { allDay: false, start: '09:00', end: '09:45', icon: 'stethoskop', who: 'T', place: 'Dr. Weber, Hauptstr. 12', people: ['p_mia'] }));
  for (const [i, d] of ['2025-11-20', '2026-03-12'].entries()) out.push(ev(`zahnarzt-karlo-${i}`, 'Zahnarzt', d, { allDay: false, start: '10:00', end: '10:45', icon: 'zahnarzt', who: 'T', place: 'Dr. Sommer', people: ['p_karlo'] }));
  out.push(ev('zahnarzt-mia', 'Zahnarzt', '2026-08-25', { allDay: false, start: '14:00', end: '14:30', icon: 'zahnarzt', who: 'J', place: 'Dr. Sommer', people: ['p_mia'] }));
  out.push(ev('geb-oma', 'Geburtstag Oma Inge', '2026-03-08', { icon: 'geburtstag', who: 'both', repeat: 'Jedes Jahr' }));
  out.push(ev('geb-mia', 'Geburtstag Mia', '2026-09-15', { icon: 'geburtstag', who: 'both', repeat: 'Jedes Jahr' }));
  // Sophias Arbeit kommt aus ihrem Firmenkalender: nur "Arbeit", nie Titel oder Ort.
  for (let i = 0; i < 60; i++) {
    const d = add('2026-10-26', i);
    if (weekday(d) >= 1 && weekday(d) <= 4) out.push(ev(`firma-${d}`, 'Quartalsplanung Projekt Falke', d, { allDay: false, start: '08:30', end: '16:30', who: 'T', work: true, cal: 'google', place: 'Siemens Campus Erlangen' }));
  }
  out.push(ev('privat-arzt', 'Psychotherapie Dr. Lang', '2026-11-03', { allDay: false, start: '18:00', end: '18:50', who: 'T', cal: 'icloud', place: 'Praxis Lang' }));
  return out;
}

let k = 0;
const item = (name: string, done = false) => ({ id: `gi${++k}`, name, who: null, done });

export function grossListen(): List[] {
  k = 0;
  const NAMEN = ['Baumarkt', 'Packliste Ostsee', 'Geschenkideen', 'Watchlist', 'Bücher', 'Zu erledigen', 'Drogerie', 'Garten', 'Weihnachten', 'Kita Sachen', 'Schule Mia', 'Rezepte', 'Restaurants', 'Ausflüge', 'Kleidung Kinder', 'Reparaturen', 'Apotheke', 'Party Mia', 'Umzug Keller'];
  const DINGE = ['Klebeband', 'Batterien AA', 'Kabelbinder', 'Glühbirne E27', 'Gartenschere', 'Sonnencreme', 'Badehose', 'Ladekabel', 'Regenjacke', 'Pflaster', 'Malbuch', 'Buntstifte', 'Wasserflasche', 'Brotdose', 'Turnbeutel', 'Gummistiefel', 'Lego Feuerwehr', 'Puzzle', 'Kerzen', 'Servietten', 'Luftballons', 'Fieberthermometer', 'Nasenspray', 'Holzleim', 'Dübel 6 mm', 'Silikon', 'Farbe weiß'];
  const lists = basisListen();
  const own: List[] = NAMEN.map((name, i) => ({
    id: `gl${i}`, name, icon: 'kalender', kind: 'collection',
    sections: [{ id: 's', title: '', items: [
      ...Array.from({ length: name === 'Baumarkt' ? 24 : 6 + (i % 9) }, (_, j) => item(`${DINGE[(i * 7 + j) % DINGE.length]}${name === 'Baumarkt' ? ` ${j + 1}` : ''}`, j % 5 === 4)),
      ...(name === 'Baumarkt' ? [item('Schrauben 4x40')] : []),
    ] }],
  } as List));
  // 200 Fakten, Mias Schuhgröße mittendrin.
  const THEMEN = ['mag keine Pilze', 'hat Hausarzt Dr. Weber', 'Lieblingsfarbe ist Blau', 'spielt gern Uno', 'ist allergisch gegen Katzen', 'hat Kleidergröße 116', 'mag Erdbeeren', 'Lehrerin heißt Frau Kurz', 'geht gern ins Hallenbad', 'trinkt keinen Kaffee'];
  const WER = ['Julian', 'Sophia', 'Karlo', 'Mia', 'Oma Inge', 'Opa Hans', 'Tante Lea', 'Marco', 'Fry', 'Nachbar Bauer'];
  const facts = Array.from({ length: 200 }, (_, i) => {
    const wer = WER[i % WER.length];
    const name = i === 117 ? 'Mia hat Schuhgröße 31' : `${wer} ${THEMEN[(i * 3) % THEMEN.length]} (${i})`;
    return { id: `gf${i}`, name, note: i === 117 ? 'Mia' : wer, who: i % 2 ? 'T' : 'J', done: false, data: { date: add('2025-11-01', i * 3) } };
  });
  return [...lists, ...own, { id: 'wissen', name: 'Familiengedächtnis', icon: 'notizblock', kind: 'collection', sections: [{ id: 'main', title: '', items: facts }] } as List];
}
