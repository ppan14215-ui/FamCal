/**
 * The demo family for the onboarding showcase (Onboarding v3, 02.11.2026): Julia and Tom with Mia (7)
 * and Ben (almost 2) in München, a full next two weeks, a shopping list, a film watchlist and a running
 * Rommé game. Everything is built from `today`, so the week always looks current.
 *
 * Pure: no store, no feed, no storage. The showcase puts the result into its own store
 * (`createStore(buildDemoState())`) and never into the app's.
 */
import { blankState, type State } from '../state/store';
import type { CalEvent, Item, List, Person } from '../state/types';
import type { FeedEntry, EventSnap } from '../lib/feed';
import type { ClayName } from '../lib/clayIcons';
import type { PersonId } from '../theme';
import type { Persons } from '../components/ui/Person';
import { addDays, weekday, TODAY } from '../lib/dates';
import { addMonths } from './firstYear';
import { blueprintFor } from '../lib/blueprint';
import { WISSEN } from '../lib/wissen';
import { tx } from '../i18n/lang';

/** There is no film ClayName yet (brief); the watchlist and Filmabend use this stand-in. */
export const FILM_ICON: ClayName = 'buch';

/** Julia rose, Tom blue: the same values as the app's default palette, but never the app's own objects. */
export const demoPersons: Persons = {
  J: { name: 'Julia', tint: '#F6DDE2', ink: '#9D2B48', stripe: '#EFC6CF', colorName: 'Rosa' },
  T: { name: 'Tom', tint: '#DCE7F4', ink: '#1F4E89', stripe: '#C3D5EC', colorName: 'Blau' },
};

/** Ids the chapters refer to. */
export const DEMO = {
  mia: 'p_mia',
  ben: 'p_ben',
  einkauf: 'einkauf',
  filme: 'filme',
  romme: 'romme',
  wissen: WISSEN,
  aufgaben: 'aufgaben',
  elternabend: 'ev_elternabend',
  uBen: 'ev_u_ben',
  brot: 'i_brot',
  joghurt: 'i_joghurt',
} as const;

const DOCTOR = 'Kinderarztpraxis Dr. Weber, Hauptstr. 12, München';

/** The first school day from `day` on (Saturday and Sunday move to Monday). */
const schoolDay = (day: string) => { const w = weekday(day); return w === 6 ? addDays(day, 2) : w === 0 ? addDays(day, 1) : day; };

const WD_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** "Jeden Dienstag" for the weekday of `day`, as the repeat text a person would type. */
const every = (day: string) => tx(`Jeden ${WD_DE[weekday(day)]}`, `Every ${WD_EN[weekday(day)]}`);

const item = (id: string, name: string, who: PersonId | null = null, extra: Partial<Item> = {}): Item => ({ id, name, who, done: false, ...extra });

export function demoPeople(today = TODAY): Person[] {
  return [
    // About seven: no check-up of her own in the next weeks, school child.
    { id: DEMO.mia, name: 'Mia', kind: 'kind', color: 'Mint', birthday: addMonths(today, -(7 * 12 + 5)) },
    // 22 months: mitdenken's U7 window (21 to 24 months) is open, so the U-Untersuchung on day 1 is the real one.
    { id: DEMO.ben, name: 'Ben', kind: 'kind', color: 'Sand', birthday: addMonths(today, -22) },
  ];
}

export function demoEvents(today = TODAY): CalEvent[] {
  const d = (n: number) => addDays(today, n);
  const school = schoolDay(today);
  return [
    { id: 'ev_schule', title: tx('Schule', 'School'), icon: 'schule', date: school, start: '07:45', end: '13:00', who: 'both', people: [DEMO.mia], repeat: tx('Montag bis Freitag', 'Monday to Friday') },
    { id: 'ev_arbeit_t', title: tx('Arbeit', 'Work'), icon: 'kalender', date: school, start: '09:00', end: '17:00', who: 'T', work: true },
    { id: 'ev_schwimmen', title: tx('Schwimmkurs Mia', 'Swimming class Mia'), icon: 'schwimmen', date: d(0), start: '15:30', end: '16:15', who: 'J', people: [DEMO.mia], place: 'Hallenbad Nord, Ungererstr. 10, München' },
    // Kita, doctor, music school and lantern walk only happen on weekdays (schoolDay moves a weekend to Monday).
    { id: 'ev_kita', title: tx('Kita-Gespräch Ben', 'Nursery meeting Ben'), icon: 'kita', date: schoolDay(d(1)), start: '08:30', end: '09:00', who: 'J', people: [DEMO.ben], place: 'Kita Sonnenblume, Agnesstr. 8, München' },
    {
      id: DEMO.uBen, title: tx('U-Untersuchung Ben', 'Check-up Ben'), sub: 'U7', icon: 'stethoskop', date: schoolDay(d(1)), start: '16:00', end: '16:45', who: 'T', people: [DEMO.ben], place: DOCTOR,
      bring: [{ id: 'b_uheft', t: tx('U-Heft', 'Check-up booklet'), done: false }],
    },
    { id: 'ev_fussball', title: tx('Fußball', 'Football'), icon: 'fussball', date: d(1), start: '19:00', end: '20:30', who: 'T', place: 'Sportplatz Süd, Plinganserstr. 50, München', repeat: every(d(1)) },
    { id: 'ev_klavier', title: tx('Klavier Mia', 'Piano Mia'), icon: 'musik', date: schoolDay(d(2)), start: '14:00', end: '14:45', who: 'J', people: [DEMO.mia], place: 'Musikschule, Rosenheimer Str. 5, München' },
    // Nobody yet: chapter "Partner sieht es" is Tom taking it on himself (the app never suggests who).
    // A school evening, so never on a weekend (chapter 4 names its weekday).
    { id: DEMO.elternabend, title: tx('Elternabend', "Parents' evening"), icon: 'elternabend', date: schoolDay(d(2)), start: '20:00', end: '21:30', who: null, place: 'Grundschule am Hart, Hartstr. 1, München' },
    { id: 'ev_laterne', title: tx('Laternenumzug Kita', 'Lantern walk nursery'), icon: 'mond', date: schoolDay(d(3)), start: '17:00', end: '18:00', who: 'both', people: [DEMO.ben], place: 'Kita Sonnenblume, Agnesstr. 8, München' },
    {
      id: 'ev_lena', title: tx('Kindergeburtstag Lena', "Lena's birthday party"), icon: 'geschenk', date: d(4), start: '15:00', end: '18:00', who: 'J', people: [DEMO.mia], place: 'Familie Berger, Lindenweg 3, München',
      bring: [{ id: 'b_geschenk', t: tx('Geschenk', 'Present'), done: false }],
    },
    { id: 'ev_markt', title: tx('Wochenmarkt', 'Farmers market'), icon: 'einkauf', date: d(5), start: '10:00', end: '11:00', who: 'both', place: 'Elisabethmarkt, München' },
    { id: 'ev_film', title: tx('Filmabend', 'Movie night'), icon: FILM_ICON, date: d(5), start: '19:30', end: '21:30', who: 'both', people: [DEMO.mia, DEMO.ben], place: tx('Zuhause', 'At home') },
    { id: 'ev_oma', title: tx('Oma Inge wird 70', 'Grandma Inge turns 70'), icon: 'geschenk', date: d(6), start: '12:00', end: '16:00', who: 'both', people: [DEMO.mia, DEMO.ben], place: 'Gasthaus Zur Post, Dorfstr. 2, Starnberg' },
    { id: 'ev_ferien', title: tx('Herbstferien Ostsee', 'Autumn break at the sea'), icon: 'reise', date: d(9), endDate: d(13), start: '00:00', allDay: true, who: 'both', people: [DEMO.mia, DEMO.ben], place: 'Ferienhaus Düne, Strandweg 7, Timmendorfer Strand' },
  ];
}

export function demoLists(): List[] {
  const watch = blueprintFor('Watchlist');
  return [
    {
      id: DEMO.einkauf, name: tx('Einkauf', 'Shopping'), icon: 'einkauf', kind: 'shopping',
      sections: [
        { id: 'supermarkt', title: tx('Supermarkt', 'Supermarket'), items: [item(DEMO.brot, tx('Brot', 'Bread'), 'J'), item(DEMO.joghurt, tx('Joghurt', 'Yoghurt'), 'J')] },
        { id: 'drogerie', title: tx('Drogerie', 'Drugstore'), items: [] },
      ],
    },
    {
      id: DEMO.filme, name: tx('Filme', 'Films'), icon: FILM_ICON, kind: 'collection', ...(watch ? { blueprint: watch } : {}),
      sections: [{ id: 'main', title: '', items: [item('i_wall_e', 'WALL·E', 'J', { data: { year: '2008', by: 'Andrew Stanton', kind: 'film', seen: true } })] }],
    },
    {
      id: DEMO.romme, name: 'Rommé', icon: 'gesellschaftsspiel', kind: 'collection',
      blueprint: { blocks: ['points'], source: null, points: { lowWins: true, doubleWord: true } },
      sections: [{
        id: 'main', title: '', items: [
          item('i_p_julia', 'Julia', 'J', { data: { rounds: [20, 5] } }),
          item('i_p_tom', 'Tom', 'T', { data: { rounds: [10, 40] } }),
          item('i_p_mia', 'Mia', null, { data: { rounds: [15, 0] } }),
        ],
      }],
    },
    // Same shape as remember() makes it (src/lib/wissen.ts); empty until the memory chapter.
    { id: DEMO.wissen, name: 'Familiengedächtnis', icon: 'notizblock', kind: 'collection', sections: [{ id: 'main', title: '', items: [] }] },
    { id: DEMO.aufgaben, name: tx('Aufgaben', 'Tasks'), icon: 'checkliste', kind: 'packing', sections: [{ id: 'main', title: '', items: [] }] },
  ];
}

/** The whole demo store. Fields not set here are the first-launch defaults. */
export function buildDemoState(today = TODAY): State {
  return {
    ...blankState(),
    names: { J: demoPersons.J.name, T: demoPersons.T.name },
    kid: null,
    people: demoPeople(today),
    comments: {},
    city: 'München',
    land: 'Bayern',
    country: 'DE',
    vacation: { J: 30, T: 28 },
    calendars: [],
    demo: true,
    colors: { J: 0, T: 1 },
    events: demoEvents(today),
    tasks: [],
    lists: demoLists(),
    inbox: [],
    docs: [],
    milestones: [],
    onboardingCards: [],
    toast: null,
    calView: 'heute',
    calDay: today,
    calWho: null,
    activeList: DEMO.einkauf,
  };
}

// ─── Feed entries for the chapters ─────────────────────────────────────────

/** ISO time for `hh:mm` on `day` in local time (the chat shows local hours). */
export function feedAt(day: string, hhmm: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).toISOString();
}

/** What a Termine card showed when it was made (the card itself reads live by id from the demo store). */
export const snapOf = (e: CalEvent): EventSnap => ({ id: e.id, title: e.title, date: e.date, start: e.start, end: e.end, allDay: e.allDay, icon: e.icon, place: e.place });

type Base = { id: string; by: PersonId; said: string; at?: string };

/** A sentence that made Termine. Pass the events so the snapshot is filled; ids must exist in the demo store. */
export function madeEvents({ id, by, said, at, say, events, changed }: Base & { say?: string; events: CalEvent[]; changed?: boolean }): FeedEntry {
  return { id, by, said, kind: 'made', at: at ?? new Date().toISOString(), say, events: events.map((e) => e.id), snap: { events: events.map(snapOf) }, changed };
}

/** A sentence that put items on a list. */
export function madeItems({ id, by, said, at, say, list, items }: Base & { say?: string; list: List; items: Item[] }): FeedEntry {
  return { id, by, said, kind: 'made', at: at ?? new Date().toISOString(), say, items: { list: list.id, ids: items.map((i) => i.id) }, snap: { list: list.name, items: items.map((i) => i.name) } };
}

/** A sentence the assistant only answered (no card below the reply). */
export function answered({ id, by, said, at, say }: Base & { say: string }): FeedEntry {
  return { id, by, said, kind: 'made', at: at ?? new Date().toISOString(), say };
}

/** A plain message to the family. */
export function message({ id, by, said, at }: Base): FeedEntry {
  return { id, by, said, kind: 'msg', at: at ?? new Date().toISOString() };
}

/** An ISO time `min` minutes ago. The seed messages sit relative to now, so they never collapse onto the same time early in the morning. */
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

/** Two older entries from earlier today, so the chat does not start empty. A function, so tx() reads the current language. */
export function demoFeed(today = TODAY): FeedEntry[] {
  const s = buildDemoState(today);
  const einkauf = s.lists.find((l) => l.id === DEMO.einkauf)!;
  const items = einkauf.sections.flatMap((x) => x.items).filter((i) => i.id === DEMO.brot || i.id === DEMO.joghurt);
  return [
    message({ id: 'seed_t', by: 'T', said: tx('Bin heute um sechs zuhause.', "I'll be home at six today."), at: ago(90) }),
    madeItems({ id: 'seed_j', by: 'J', said: tx('Brot und Joghurt auf die Einkaufsliste', 'Bread and yoghurt on the shopping list'), at: ago(60), say: tx('Steht drauf.', 'On the list.'), list: einkauf, items }),
  ];
}
