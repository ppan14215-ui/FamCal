/**
 * The onboarding showcase script (Onboarding v3, decisions 02.11.2026). Eight chapters, played one at a
 * time by the player in app/onboarding/index.tsx:
 *   1 Termin · 2 Was steht an · 3 Verschieben · 4 Partner sieht es · 5 Einkauf · 6 Rezept ·
 *   7 Montage "Und noch mehr" · 8 Claim, then "Jetzt ihr".
 *
 * A chapter is a caption label, a headline (at most 8 words) with one explaining line, a `start` that
 * sets the stage from where the last chapter ended, and a timeline of beats. Each beat waits, then may
 * change the demo store (`store`) and the picture (`scene`). Scene functions are pure, so the player
 * can jump any chapter to its end state by running the remaining beats at once (tap on the stage,
 * reduced motion), and can build the start of any chapter by playing the ones before it instantly.
 *
 * Nothing here touches the app: beats only get the demo store handed in. No actions.*, no feed
 * writers, no veil, no remember(), no setNames or setColor.
 *
 * Tempo (Julian 02.11.: "zu schnell, nichts erklärt"): the text above the stage comes first, then the
 * action. Typing 45 ms per character, Memo thinks 900 ms, then a readable hold. No auto advance.
 */
import type { State, Store } from '../../state/store';
import type { CalEvent, Item, List } from '../../state/types';
import type { FeedEntry } from '../../lib/feed';
import type { PersonId } from '../../theme';
import { addDays, weekday, hm, TODAY } from '../../lib/dates';
import { buildDemoState, demoEvents, demoFeed, madeEvents, madeItems, DEMO } from '../../data/demoFamily';
import { motion } from '../../theme/motion';
import { tx } from '../../i18n/lang';
import { INTRO_CLAIM } from '../onboarding/Intro';

// ─── Timing ────────────────────────────────────────────────────────────────

/** Per typed character. */
export const T_CHAR = 45;
/** Text above the stage first, then the action starts. */
export const T_READ = 700;
/** Last character typed until the arrow is pressed. */
export const T_BEFORE_SEND = 380;
/** Arrow pressed in until the bubble is there. */
export const T_PRESS = 140;
/** Memo thinking. */
export const T_THINK = 900;
/** Chapter 1 waits this long for the person to tap send, then sends by itself. */
export const T_GATE = 3000;
/** One montage beat on screen. */
export const T_MONTAGE = 2600;

// ─── Scene ─────────────────────────────────────────────────────────────────

export type Side = 'left' | 'right';

export type RecipeState = { dish: string; servings: string; picks: string[]; have: string[]; off: string[]; pressed: boolean };

/** One thing in the phone's chat, newest last. */
export type StageItem =
  | { id: string; type: 'entry'; f: FeedEntry; side: Side }
  | { id: string; type: 'think'; by: PersonId; said: string; at: string; side: Side }
  | { id: string; type: 'agenda'; by: PersonId; said: string; at: string; side: Side; say: string }
  | { id: string; type: 'recipe'; by: PersonId; said: string; at: string; side: Side; recipe: RecipeState }
  /** A quiet line in the middle of the chat ("Tom hat Milch abgehakt"), Memo cheering beside it. */
  | { id: string; type: 'status'; by: PersonId; text: string };

export type MontageCard = 'memory' | 'score' | 'watch';

export type Scene = {
  /** What the stage shows: a phone with the chat, the lock screen, the montage, or the emptied chat. */
  screen: 'chat' | 'lock' | 'montage' | 'empty';
  /** Whose phone it is. */
  owner: PersonId;
  items: StageItem[];
  /** Text in the composer. */
  draft: string;
  /** Counters: a new value swells (pulse) or presses (press) the send arrow once. */
  pulse: number;
  press: number;
  /** The week strip over the chat, and the day the dentist sits on (undefined: not placed yet). */
  strip: { tile?: string } | null;
  /** The lock screen notification, once it has come down. */
  notif: { title: string; body: string; when: string } | null;
  montage: { word: string; card: MontageCard } | null;
  /** Replaces the chapter's headline and line (chapter 8: "Jetzt ihr"). */
  head: { title: string; line: string } | null;
};

export const blankScene = (): Scene => ({ screen: 'chat', owner: 'J', items: [], draft: '', pulse: 0, press: 0, strip: null, notif: null, montage: null, head: null });

export type Haptic = 'select' | 'tap' | 'commit' | 'success';

export type Beat = {
  /** Wait before this beat, from the one before (ms). */
  after: number;
  /** Changes the demo store. Runs before `scene`. */
  store?: (demo: Store) => void;
  scene?: (s: Scene, demo: Store) => Scene;
  /** Felt when the beat lands (never when jumping to the end). */
  haptic?: Haptic;
  /** Waits for a tap on the stage, at most `after` ms (chapter 1: send). */
  gate?: boolean;
};

export type Chapter = {
  key: string;
  /** "Termine" in "1 von 8 · Termine". */
  label: string;
  title: string;
  line: string;
  start: (prev: Scene, demo: Store) => Scene;
  beats: Beat[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const WD_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** The weekday word a person would say for `day` ("Freitag" / "Friday"). */
const wd = (day: string) => tx(WD_DE[weekday(day)], WD_EN[weekday(day)]);

/** The first weekday from `day` on (Saturday and Sunday move to Monday). */
const workday = (day: string) => { const w = weekday(day); return w === 6 ? addDays(day, 2) : w === 0 ? addDays(day, 1) : day; };

/** The dentist's day in chapter 1 (three days out, a weekday) and the day chapter 3 moves it to (the next weekday). Both stay inside the 7-day strip. */
export function dentistDays(today = TODAY) {
  const first = workday(addDays(today, 3));
  return { first, moved: workday(addDays(first, 1)) };
}

/** The Termin chapter 1 makes; the partner step shows it on the partner's phone. */
export function dentistEvent(today = TODAY): CalEvent {
  return {
    id: 'ev_zahn', title: tx('Zahnarzt Ben', 'Dentist Ben'), icon: 'zahnarzt', date: dentistDays(today).first, start: '15:00', end: '15:45',
    who: 'J', people: [DEMO.ben], place: 'Zahnarztpraxis Kern, Lindenstr. 4, München',
  };
}

/** The same Termin after chapter 3 moved it: the day after, at 10:00. The partner step shows this one. */
export function movedDentist(today = TODAY): CalEvent {
  return { ...dentistEvent(today), date: dentistDays(today).moved, start: '10:00', end: '10:45' };
}

const now = () => new Date().toISOString();
/** Entries carried into the next chapter are no longer new: no blink, no icon play. */
const AGED_MS = 3 * 60000;
const aged = (items: StageItem[]) => items.map((it) => {
  const old = (iso: string) => new Date(Math.min(Date.parse(iso), Date.now() - AGED_MS)).toISOString();
  if (it.type === 'entry') return { ...it, f: { ...it.f, at: old(it.f.at) } };
  if (it.type === 'status') return it;
  return { ...it, at: old(it.at) };
});

/** Types `text` into the composer, one character per beat; the first one after `first` ms. */
function typing(text: string, first = T_READ): Beat[] {
  return [...text].map((_, k) => ({ after: k ? T_CHAR : first, scene: (s: Scene) => ({ ...s, draft: text.slice(0, k + 1) }) }));
}

/** The arrow is pressed, the sentence becomes a bubble, and Memo starts thinking under it. */
function send(id: string, by: PersonId, said: string, side: Side, wait = T_BEFORE_SEND, gate = false): Beat[] {
  return [
    { after: wait, gate, scene: (s) => ({ ...s, press: s.press + 1 }) },
    { after: T_PRESS, scene: (s) => ({ ...s, draft: '', items: [...s.items, { id, type: 'think', by, said, at: now(), side }] }) },
  ];
}

/** Puts `item` where the thinking card with the same id was (or at the end). */
const land = (s: Scene, item: StageItem): Scene => {
  const has = s.items.some((x) => x.id === item.id);
  return { ...s, items: has ? s.items.map((x) => (x.id === item.id ? item : x)) : [...s.items, item] };
};

const saidOf = (s: Scene, id: string) => {
  const it = s.items.find((x) => x.id === id);
  return it && it.type !== 'status' ? (it.type === 'entry' ? { said: it.f.said, at: it.f.at } : { said: it.said, at: it.at }) : null;
};

const listOf = (st: State, id: string) => st.lists.find((l) => l.id === id)!;
const eventOf = (st: State, id: string) => st.events.find((e) => e.id === id)!;

/** Adds items to a section of a demo list. */
function addItems(demo: Store, list: string, section: string, items: Item[]) {
  demo.set((st) => ({
    lists: st.lists.map((l) => (l.id !== list ? l : { ...l, sections: l.sections.map((sec) => (sec.id !== section ? sec : { ...sec, items: [...sec.items, ...items.filter((i) => !sec.items.some((x) => x.id === i.id))] })) })),
  }));
}
const patchItem = (demo: Store, list: string, id: string, p: Partial<Item>) => demo.set((st) => ({
  lists: st.lists.map((l) => (l.id !== list ? l : { ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.map((i) => (i.id === id ? { ...i, ...p } : i)) })) })),
}));
const patchEvent = (demo: Store, id: string, p: Partial<CalEvent>) => demo.set((st) => ({ events: st.events.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
const itemsIn = (l: List, ids: string[]) => l.sections.flatMap((x) => x.items).filter((i) => ids.includes(i.id));

const entry = (f: FeedEntry, side: Side): StageItem => ({ id: f.id, type: 'entry', f, side });

/** The haptic for a card that started rising in the beat before: felt when it has landed (MOTION.md 4). */
const landed = (haptic: Haptic, after: number = motion.base): Beat => ({ after, haptic });
/** A montage card rises one `rise(3)` after its word: 3 staggers plus the entrance. */
const MONTAGE_LAND = motion.base + 3 * 50;

// ─── The chapters ──────────────────────────────────────────────────────────

export function buildChapters(today = TODAY): Chapter[] {
  const d = (n: number) => addDays(today, n);
  const { first, moved } = dentistDays(today);
  const zahn = dentistEvent(today);
  // A school evening on a weekday (demoFamily); chapters 2 and 4 name its day.
  const eltern = demoEvents(today).find((e) => e.id === DEMO.elternabend)!.date;
  const u7 = demoEvents(today).find((e) => e.id === DEMO.uBen)!.date;

  // 1 · Termin: the sentence types into the field, the arrow swells once; a tap sends, or it sends after 3 s.
  const s1 = tx(`${wd(first)} 15 Uhr Zahnarzt mit Ben`, `Dentist with Ben on ${wd(first)} at ${hm('15:00')}`);
  const termin: Chapter = {
    key: 'termin',
    label: tx('Termine', 'Events'),
    title: tx('Einmal sagen, schon steht es drin', 'Say it once and it’s in'),
    line: tx('Julia schreibt einen Termin. Memo trägt ihn für beide ein.', 'Julia types an event. Memo adds it for both of them.'),
    start: () => ({ ...blankScene(), items: aged(demoFeed(today).map((f) => entry(f, f.by === 'J' ? 'right' : 'left'))), strip: {} }),
    beats: [
      // Motion from the first frame (decisions: no intro, the film starts in the action).
      ...typing(s1, 150),
      { after: 300, scene: (s) => ({ ...s, pulse: s.pulse + 1 }) },
      ...send('c1', 'J', s1, 'right', T_GATE, true),
      {
        after: T_THINK,
        store: (demo) => demo.set((st) => ({ events: [...st.events, zahn] })),
        scene: (s, demo) => land(s, entry(madeEvents({ id: 'c1', by: 'J', said: s1, say: tx(`Steht drin. ${wd(first)} 15 Uhr, Zahnarzt mit Ben.`, `Done. ${wd(first)} at ${hm('15:00')}, dentist with Ben.`), events: [eventOf(demo.get(), zahn.id)] }), 'right')),
      },
      landed('success'),
      // Then the card's Termin settles on its day in the week (pattern 7: the card travels to its day).
      { after: 650 - motion.base, scene: (s) => ({ ...s, strip: { tile: first } }) },
      landed('select'),
    ],
  };

  // 2 · Was steht an: one question, the next three days as a card.
  const s2 = tx('Was steht die nächsten Tage an?', 'What’s coming up the next few days?');
  // Built from the real days, so it never says "morgen" for a day that is not tomorrow. Only what the card shows (today and two days).
  const inCard = (day: string) => day <= d(2);
  const deDay = (day: string) => (day === d(1) ? 'morgen' : `am ${wd(day)}`);
  const enDay = (day: string) => (day === d(1) ? 'tomorrow' : `on ${wd(day)}`);
  const agendaSay = tx(
    [`Heute Schwimmkurs mit Mia`, inCard(u7) ? `${deDay(u7)} die U7 von Ben` : '', inCard(eltern) ? `${deDay(eltern)} Elternabend` : ''].filter(Boolean).join(', ') + '.',
    [`Swimming with Mia today`, inCard(u7) ? `Ben’s check-up ${enDay(u7)}` : '', inCard(eltern) ? `parents’ evening ${enDay(eltern)}` : ''].filter(Boolean).join(', ') + '.',
  );
  const agenda: Chapter = {
    key: 'agenda',
    label: tx('Überblick', 'Overview'),
    title: tx('Was ansteht, auf einen Blick', 'What’s coming, at a glance'),
    line: tx('Eine Frage, und Memo zeigt die nächsten drei Tage.', 'One question, and Memo shows the next three days.'),
    start: (prev) => ({ ...blankScene(), items: aged(prev.items.filter((x) => x.id === 'c1')) }),
    beats: [
      ...typing(s2),
      ...send('c2', 'J', s2, 'right'),
      { after: T_THINK, scene: (s) => land(s, { id: 'c2', type: 'agenda', by: 'J', said: s2, at: saidOf(s, 'c2')?.at ?? now(), side: 'right', say: agendaSay }) },
      landed('success'),
    ],
  };

  // 3 · Verschieben: the same card, a new day. The old card says Geändert, the Termin travels in the strip.
  const s3 = tx(`Verschieb den Zahnarzt auf ${wd(moved)} 10 Uhr`, `Move the dentist to ${wd(moved)} at ${hm('10:00')}`);
  const zahnMoved = movedDentist(today);
  const move: Chapter = {
    key: 'verschieben',
    label: tx('Verschieben', 'Reschedule'),
    title: tx('Verschieben geht genauso leicht', 'Moving it is just as easy'),
    line: tx('Ein Satz genügt. Der Termin wandert an seinen neuen Tag.', 'One sentence does it. The event moves to its new day.'),
    start: (prev) => ({ ...blankScene(), items: aged(prev.items.filter((x) => x.id === 'c1')), strip: { tile: first } }),
    beats: [
      ...typing(s3),
      ...send('c3', 'J', s3, 'right'),
      // Memo answers first: the Termin moves and the answer lands where Memo was thinking.
      {
        after: T_THINK,
        store: (demo) => patchEvent(demo, zahn.id, { date: zahnMoved.date, start: zahnMoved.start, end: zahnMoved.end }),
        scene: (s, demo) => land(s, entry(madeEvents({ id: 'c3', by: 'J', said: s3, say: tx(`Verschoben auf ${wd(moved)}, 10 Uhr.`, `Moved to ${wd(moved)} at ${hm('10:00')}.`), events: [eventOf(demo.get(), zahn.id)] }), 'right')),
      },
      landed('success'),
      // Then the old card says Geändert.
      { after: 600 - motion.base, scene: (s) => ({ ...s, items: s.items.map((x) => (x.id === 'c1' && x.type === 'entry' ? { ...x, f: { ...x.f, changed: true } } : x)) }) },
      // One moving subject at a time: now the Termin travels to its new day.
      { after: 700, scene: (s) => ({ ...s, strip: { tile: moved } }) },
      { after: 420, haptic: 'select' },
    ],
  };

  // 4 · Partner sieht es: Tom takes the Elternabend on his phone; Julia's phone lights up.
  const s4 = tx(`Elternabend am ${wd(eltern)} übernehme ich`, `I’ll take parents’ evening on ${wd(eltern)}`);
  const partner: Chapter = {
    key: 'partner',
    label: tx('Zu zweit', 'Together'),
    title: tx('Tom übernimmt, du weißt es sofort', 'Tom takes it, you know at once'),
    // Partner push is not built yet (notify.ts is local only): the copy says what the app does today, and the lock screen is marked as a preview.
    line: tx('Was Tom sagt, siehst du sofort im gemeinsamen Chat.', 'What Tom says shows up in your shared chat right away.'),
    start: () => ({ ...blankScene(), owner: 'T', items: aged(demoFeed(today).map((f) => entry(f, f.by === 'T' ? 'right' : 'left'))) }),
    beats: [
      ...typing(s4),
      ...send('c4', 'T', s4, 'right'),
      {
        after: T_THINK,
        store: (demo) => patchEvent(demo, DEMO.elternabend, { who: 'T' }),
        scene: (s, demo) => land(s, entry(madeEvents({ id: 'c4', by: 'T', said: s4, say: tx('Eingetragen, du gehst. Julia sieht es auch.', 'Done, you’re going. Julia sees it too.'), events: [eventOf(demo.get(), DEMO.elternabend)] }), 'right')),
      },
      landed('success'),
      // Over to Julia's phone, locked. Then the notification comes down from the top.
      // Later the real permission question will sit here (pattern 9); the showcase asks for nothing.
      { after: 2000 - motion.base, scene: (s) => ({ ...s, screen: 'lock', owner: 'J' }) },
      { after: 700, scene: (s) => ({ ...s, notif: { title: 'Tom', body: tx(`übernimmt den Elternabend am ${wd(eltern)}`, `is taking parents’ evening on ${wd(eltern)}`), when: tx('jetzt', 'now') } }) },
      { after: 380, haptic: 'success' },
    ],
  };

  // 5 · Einkauf: three things onto the list, sorted by shop; Tom ticks the milk off.
  const s5 = tx('Wir brauchen Milch, Windeln und Bananen', 'We need milk, nappies and bananas');
  const milch: Item = { id: 'i_milch', name: tx('Milch', 'Milk'), who: 'J', done: false };
  const banane: Item = { id: 'i_banane', name: tx('Bananen', 'Bananas'), who: 'J', done: false };
  const windeln: Item = { id: 'i_windeln', name: tx('Windeln', 'Nappies'), who: 'J', done: false };
  const einkauf: Chapter = {
    key: 'einkauf',
    label: tx('Einkauf', 'Shopping'),
    title: tx('Die Einkaufsliste schreibt sich mit', 'The shopping list writes itself'),
    line: tx('Sagen, was fehlt. Wer im Laden ist, hakt ab.', 'Say what’s missing. Whoever is at the shop ticks it off.'),
    start: () => ({ ...blankScene(), items: aged(demoFeed(today).filter((f) => f.by === 'J').map((f) => entry(f, 'right'))) }),
    beats: [
      ...typing(s5),
      ...send('c5', 'J', s5, 'right'),
      {
        after: T_THINK,
        store: (demo) => { addItems(demo, DEMO.einkauf, 'supermarkt', [milch, banane]); addItems(demo, DEMO.einkauf, 'drogerie', [windeln]); },
        scene: (s, demo) => {
          const l = listOf(demo.get(), DEMO.einkauf);
          const ids = [milch.id, windeln.id, banane.id];
          const items = ids.map((id) => itemsIn(l, [id])[0]).filter(Boolean);
          return land(s, entry(madeItems({ id: 'c5', by: 'J', said: s5, say: tx('Steht drauf. Windeln unter Drogerie.', 'On the list. Nappies under drugstore.'), list: l, items }), 'right'));
        },
      },
      landed('success'),
      // Tom, in the shop, ticks the milk: first the tick lands in Julia's card, then Memo cheers below.
      { after: 2000 - motion.base, haptic: 'select', store: (demo) => patchItem(demo, DEMO.einkauf, milch.id, { done: true }) },
      { after: 600, scene: (s) => ({ ...s, items: [...s.items, { id: 's5', type: 'status', by: 'T', text: tx('Tom hat Milch abgehakt', 'Tom ticked off milk') }] }) },
      landed('success'),
    ],
  };

  // 6 · Rezept: Bolognese, what is missing as chips; one is tapped away, then the rest lands on Einkauf.
  const s6 = tx('Heute Abend koche ich Bolognese', 'I’m cooking Bolognese tonight');
  const parm = tx('Parmesan', 'Parmesan');
  const picks = [tx('Hackfleisch', 'Minced beef'), tx('Passata', 'Passata'), tx('Spaghetti', 'Spaghetti'), tx('Zwiebeln', 'Onions'), parm];
  const recipe0: RecipeState = { dish: 'Bolognese', servings: tx('4 Portionen', '4 servings'), picks, have: [tx('Olivenöl', 'Olive oil'), tx('Salz', 'Salt')], off: [], pressed: false };
  const setRecipe = (s: Scene, p: Partial<RecipeState>): Scene => ({ ...s, items: s.items.map((x) => (x.id === 'c6' && x.type === 'recipe' ? { ...x, recipe: { ...x.recipe, ...p } } : x)) });
  const kept = picks.filter((p) => p !== parm);
  const keptItems: Item[] = kept.map((name, k) => ({ id: `i_bolo${k}`, name, who: 'J', done: false }));
  const rezept: Chapter = {
    key: 'rezept',
    label: tx('Kochen', 'Cooking'),
    title: tx('Vom Rezept direkt auf die Liste', 'From recipe straight to the list'),
    line: tx('Memo kennt die Zutaten. Ihr tippt weg, was schon da ist.', 'Memo knows the ingredients. You tap away what you have.'),
    start: () => ({ ...blankScene() }),
    beats: [
      ...typing(s6),
      ...send('c6', 'J', s6, 'right'),
      { after: T_THINK, scene: (s) => land(s, { id: 'c6', type: 'recipe', by: 'J', said: s6, at: saidOf(s, 'c6')?.at ?? now(), side: 'right', recipe: recipe0 }) },
      landed('success'),
      // The chip fades to off (RecipePick, motion.micro); felt when it has.
      { after: 2200 - motion.base, scene: (s) => setRecipe(s, { off: [parm] }) },
      landed('select', motion.micro),
      // The button presses in and springs back (RecipePick), then the list card rises in its place.
      { after: 1400 - motion.micro, scene: (s) => setRecipe(s, { pressed: true }) },
      {
        after: motion.press + motion.micro,
        store: (demo) => addItems(demo, DEMO.einkauf, 'supermarkt', keptItems),
        scene: (s, demo) => {
          const l = listOf(demo.get(), DEMO.einkauf);
          const at = saidOf(s, 'c6')?.at ?? now();
          return land(s, entry({ ...madeItems({ id: 'c6', by: 'J', said: s6, say: tx(`${kept.length} Zutaten stehen auf der Einkaufsliste.`, `${kept.length} ingredients are on the shopping list.`), list: l, items: itemsIn(l, keptItems.map((i) => i.id)) }), at }, 'right'));
        },
      },
      landed('success'),
    ],
  };

  // 7 · Montage: three quick beats, one big word and one real card each.
  const montage: Chapter = {
    key: 'montage',
    label: tx('Mehr', 'More'),
    title: tx('Und noch mehr', 'And there’s more'),
    line: tx('Adressen merken, Spielstände zählen, Filme sammeln.', 'Remember addresses, keep scores, collect films.'),
    start: () => ({ ...blankScene(), screen: 'montage' }),
    beats: [
      {
        after: T_READ,
        store: (demo) => addItems(demo, DEMO.wissen, 'main', [{ id: 'w1', name: tx('Kinderarzt Dr. Weber, Hauptstr. 12, München', 'Pediatrician Dr. Weber, Hauptstr. 12, München'), note: 'Ben', who: 'J', done: false }]),
        scene: (s) => ({ ...s, montage: { word: tx('Merken', 'Remember'), card: 'memory' } }),
      },
      landed('tap', MONTAGE_LAND),
      {
        after: T_MONTAGE - MONTAGE_LAND,
        store: (demo) => {
          const add: Record<string, number> = { i_p_julia: 12, i_p_tom: 35, i_p_mia: 0 };
          demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.romme ? l : { ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.map((i) => (i.id in add ? { ...i, data: { ...i.data, rounds: [...(i.data?.rounds ?? []), add[i.id]] } } : i)) })) })) }));
        },
        scene: (s) => ({ ...s, montage: { word: tx('Spielstand', 'Scores'), card: 'score' } }),
      },
      landed('tap', MONTAGE_LAND),
      {
        after: T_MONTAGE - MONTAGE_LAND,
        store: (demo) => addItems(demo, DEMO.filme, 'main', [
          { id: 'i_dune', name: 'Dune', who: 'T', done: false, data: { year: '2021', by: 'Denis Villeneuve', kind: 'film' } },
          { id: 'i_paddington', name: 'Paddington', who: 'J', done: false, data: { year: '2014', by: 'Paul King', kind: 'film' } },
        ]),
        scene: (s) => ({ ...s, montage: { word: tx('Filmabend', 'Film night'), card: 'watch' } }),
      },
      landed('tap', MONTAGE_LAND),
    ],
  };

  // 8 · Claim, then "Jetzt ihr": the sample family clears out of the chat in front of you.
  const claim: Chapter = {
    key: 'claim',
    label: tx('Für euch', 'For you'),
    // The claim (Julian 02.11.: the calendar first), shared with the film's last beat.
    title: INTRO_CLAIM(),
    line: tx('Julia und Tom sagen es einmal. Beide wissen es.', 'Julia and Tom say it once. Both of them know.'),
    start: (prev, demo) => {
      const st = demo.get();
      const l = listOf(st, DEMO.einkauf);
      const before = new Date(Date.now() - 20 * 60000).toISOString();
      const later = new Date(Date.now() - 6 * 60000).toISOString();
      return {
        ...blankScene(),
        items: [
          entry(madeEvents({ id: 'r1', by: 'T', said: s4, at: before, say: tx('Eingetragen, du gehst. Julia sieht es auch.', 'Done, you’re going. Julia sees it too.'), events: [eventOf(st, DEMO.elternabend)] }), 'left'),
          entry(madeItems({ id: 'r2', by: 'J', said: s5, at: later, say: tx('Steht drauf. Windeln unter Drogerie.', 'On the list. Nappies under drugstore.'), list: l, items: itemsIn(l, [milch.id, windeln.id, banane.id]) }), 'right'),
        ],
      };
    },
    beats: [
      { after: 5000, scene: (s) => ({ ...s, head: { title: tx('Jetzt ihr', 'Your turn'), line: tx('Die Beispielfamilie räumt auf. Dann tragt ihr euch ein.', 'The sample family clears out. Then you add yourselves.') } }) },
      { after: 1100, scene: (s) => ({ ...s, items: s.items.slice(0, -1) }) },
      { after: 320, scene: (s) => ({ ...s, items: s.items.slice(0, -1) }) },
      { after: 420, scene: (s) => ({ ...s, screen: 'empty' }) },
      landed('success'),
    ],
  };

  return [termin, agenda, move, partner, einkauf, rezept, montage, claim];
}

/** The demo store and the picture at the start of chapter `i`: every chapter before it played to its end. */
export function prepare(chapters: Chapter[], i: number, demo: Store, today = TODAY): Scene {
  demo.replace(buildDemoState(today));
  let s = blankScene();
  for (let k = 0; k < i; k++) {
    s = chapters[k].start(s, demo);
    for (const b of chapters[k].beats) { b.store?.(demo); if (b.scene) s = b.scene(s, demo); }
  }
  return chapters[i].start(s, demo);
}

