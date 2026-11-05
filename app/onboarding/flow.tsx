/**
 * Onboarding as one flow, played in the real app (Julian 04.11.2026 23:53 UTC: "real components from
 * the app like the input, the real chat window and the calendar"; 23:54: keep the simplicity, make it
 * more interesting, study winning onboardings).
 *
 * Rules from Julian's vault (famcal-onboarding-inspo-design-2026-11-02, App onboarding topic):
 * - One grid: progress on top, Memo always in the same place with ONE line beside it that is
 *   overwritten (never stacked), the real screen in the middle, the real input at the bottom.
 * - Show value before effort, one action per step, the answers change what you see: your names are
 *   in the chat, the partner writes to you, your appointment is the one that moves.
 * - Try it staging (Bilbo, Gotcha, Finch): input plus examples, on send the examples leave, the
 *   sentence stays, Memo thinks, the real card lands, Memo reacts, then the button that names the
 *   next thing. Content first, then the line, then the button.
 * - The keyboard lifts the input and the examples; nothing sits under the keys.
 *
 * Steps: hallo (Memo lands) · namen (magnets) · termin (real chat, real TalkBar) · verschieben (real
 * calendar, then the partner's phone lights up) · einkauf (real chat, the partner ticks one off) ·
 * fertig. Memo moves from the middle to its corner when the real app comes in, and back at the end.
 *
 * Nothing here reaches the app: the screens read an isolated store (StoreContext) and the persons
 * context carries the names typed here. No actions.*, no feed writers, no network. The offline rules
 * (talk.understand, when.parseWhen) read what you type; no assistant call without an account.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, Easing, useReducedMotion, cancelAnimation, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Btn, H1 } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import PressScale from '../../src/components/ui/PressScale';
import { MemoFace, type EyeKey, type Eyes } from '../../src/components/onboarding/Memo';
import { Sticker, StickerRing } from '../../src/components/onboarding/Sticker';
import { clayIcons, type ClayName } from '../../src/lib/clayIcons';
import TalkBar from '../../src/components/TalkBar';
import DayView from '../../src/screens/kalender/DayView';
import { monthTitle } from '../../src/screens/kalender/MonthView';
import { Landing, TopFade } from '../../src/components/showcase/Phone';
import LockNotif from '../../src/components/showcase/cards/LockNotif';
import type { StageItem } from '../../src/components/showcase/chapters';
import { StoreContext, createStore, type Store } from '../../src/state/store';
import { PersonsContext, type Persons } from '../../src/components/ui/Person';
import { StillContext } from '../../src/components/ChatCards';
import { buildDemoState, demoEvents, madeEvents, madeItems, message, DEMO } from '../../src/data/demoFamily';
import type { CalEvent, Item } from '../../src/state/types';
import { tokens, persons as appPersons } from '../../src/theme';
import { build, rise, rowOut, rowLayout } from '../../src/theme/motion';
import { seg, mix, kf, crit, recoil } from '../../src/theme/film';
import { understand } from '../../src/lib/talk';
import { placeKind, placeName } from '../../src/lib/orte';
import { parseRound, matchPlayer } from '../../src/lib/points';
import { GAME_RULES } from '../../src/lib/games';
import RecipePick from '../../src/components/showcase/cards/RecipePick';
import Scoreboard from '../../src/components/showcase/cards/Scoreboard';
import { cardFrame } from '../../src/components/ChatCards';
import { CoverArt } from '../../src/components/Blocks';
import { useStore } from '../../src/state/store';
import { PlanCard, TaskCard } from '../../src/components/onboarding/BabyCards';
import { firstYear } from '../../src/data/firstYear';
import { parseWhen } from '../../src/lib/when';
import { fillField } from '../../src/lib/simple';
import { navStyle } from '../../src/lib/navStyle';
import { useKeyboardInset } from '../../src/lib/keyboard';
import { TODAY, addDays, weekday, WD_LONG, hm } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';

type Step = 'hallo' | 'namen' | 'termin' | 'verschieben' | 'kochen' | 'spielen' | 'filme' | 'baby' | 'fertig';
const STEPS: Step[] = ['hallo', 'namen', 'termin', 'verschieben', 'kochen', 'spielen', 'filme', 'baby', 'fertig'];
const TRY = new Set<Step>(['termin', 'verschieben', 'kochen', 'spielen', 'filme', 'baby']);
/**
 * What the chat shows: the app's own items, plus two live cards of the flow (Julian 05.11. 22:04 CET):
 * the recipe you tick through for real, and the game score read from the demo list.
 */
type Bit = StageItem
  | { id: string; type: 'pick' }
  | { id: string; type: 'score'; list: string }
  | { id: string; type: 'plan' }
  | { id: string; type: 'films'; say: string }
  | { id: string; type: 'tasks'; split: boolean };

/** "Den Film Dune müssen wir sehen" → "Dune" (Julian 05.11.: the watchlist in the onboarding). */
function filmOf(said: string) {
  const q = said.match(/[„“"»«']([^„“"»«']+)[„“"»«']/);
  if (q) return cap(q[1].trim());
  const t = said
    .replace(/\b(den|die|das|the|a)\s+(film|serie|movie|show)\b/gi, ' ')
    .replace(/\b(film|serie|movie|show|filmliste|watchlist)\b/gi, ' ')
    .replace(/\b(wir|we|ich|i|lass|let'?s|uns|us)\b/gi, ' ')
    .replace(/\b(wollen|müssen|muss|sollten|möchten|want|need|should|have)\b/gi, ' ')
    .replace(/\b(unbedingt|mal|endlich|noch|auch|bitte|to|really|auf die liste|on the list)\b/gi, ' ')
    .replace(/\b(sehen|schauen|gucken|anschauen|ansehen|watch|see)\b/gi, ' ')
    .replace(/[.!?,]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cap(t || said.trim());
}

/** The baby is due in ten weeks (Julian 05.11.: "remember baby is due soon"). */
const DUE = addDays(TODAY, 70);
const NO = /\b(nein|nö|no|nope|nicht|später|later|lieber nicht)\b/i;
/** Who does what: paperwork to you, doctors and midwife to your partner. A suggestion, said as one. */
const AMT = /elternzeit|elterngeld|kindergeld|standesamt|geburtsurkunde|krankenkasse|kita/i;

/**
 * Dishes Memo knows offline (no assistant without an account). Anything else you name goes straight
 * on the shopping list. Julian 05.11.: "we are cooking lasagna tonight", tick off what is at home.
 */
const DISHES: { re: RegExp; dish: [string, string]; picks: [string, string][]; have: [string, string][] }[] = [
  { re: /lasagne|lasagna/i, dish: ['Lasagne', 'Lasagna'], picks: [['Hackfleisch', 'Minced beef'], ['Lasagneplatten', 'Lasagna sheets'], ['Passata', 'Passata'], ['Mozzarella', 'Mozzarella'], ['Milch', 'Milk'], ['Butter', 'Butter'], ['Zwiebeln', 'Onions']], have: [['Mehl', 'Flour'], ['Olivenöl', 'Olive oil'], ['Salz', 'Salt']] },
  { re: /bolognese|spaghetti/i, dish: ['Bolognese', 'Bolognese'], picks: [['Hackfleisch', 'Minced beef'], ['Passata', 'Passata'], ['Spaghetti', 'Spaghetti'], ['Zwiebeln', 'Onions'], ['Parmesan', 'Parmesan']], have: [['Olivenöl', 'Olive oil'], ['Salz', 'Salt']] },
  { re: /pfannkuchen|pancake|cr[eê]pe/i, dish: ['Pfannkuchen', 'Pancakes'], picks: [['Eier', 'Eggs'], ['Milch', 'Milk'], ['Mehl', 'Flour'], ['Apfelmus', 'Apple sauce']], have: [['Zucker', 'Sugar'], ['Salz', 'Salt']] },
  { re: /curry/i, dish: ['Curry', 'Curry'], picks: [['Hähnchen', 'Chicken'], ['Kokosmilch', 'Coconut milk'], ['Currypaste', 'Curry paste'], ['Reis', 'Rice'], ['Paprika', 'Peppers']], have: [['Öl', 'Oil'], ['Salz', 'Salt']] },
  { re: /pizza/i, dish: ['Pizza', 'Pizza'], picks: [['Pizzateig', 'Pizza dough'], ['Passata', 'Passata'], ['Mozzarella', 'Mozzarella'], ['Basilikum', 'Basil']], have: [['Olivenöl', 'Olive oil'], ['Salz', 'Salt']] },
];
const GAME_ID = 'g_mine';
type Act = 'land' | 'name' | 'answer' | 'idle' | 'fertig';
const MEMO = 104;
/** Memo in its corner while the real app is on screen. */
const SMALL = 54;
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const ME = { bg: appPersons.J.tint, fg: appPersons.J.ink };
const YOU = { bg: appPersons.T.tint, fg: appPersons.T.ink };

/** Memo thinks this long before the card lands (showcase tempo, Julian 02.11.: not too fast). */
const T_LAND = 1300;
/** Then a readable hold before the button that names the next thing. */
const T_DONE = 1100;

/**
 * Stickers around Memo (Airbnb reference, Julian 05.11.). Only icons whose own motion Julian passed
 * in the review (icon-motion/codex-redo.md: freigegeben), offsets from Memo's centre.
 * Hallo: what a family calendar holds. Fertig: the week that is now yours, kept clear of the magnets.
 */
type Stk = { name: ClayName; dx: number; dy: number; size: number; rot?: number };
const HALLO: Stk[] = [
  { name: 'geburtstag', dx: -101, dy: -60, size: 76, rot: -8 },
  { name: 'tennis', dx: 98, dy: -72, size: 68, rot: 10 },
  { name: 'kochtopf', dx: 108, dy: 41, size: 66, rot: 6 },
  { name: 'zahn', dx: -108, dy: 46, size: 60, rot: -6 },
  { name: 'glocke', dx: -5, dy: -110, size: 60, rot: 5 },
];
const FERTIG: Stk[] = [
  { name: 'sonne', dx: -103, dy: -64, size: 70, rot: -6 },
  { name: 'erledigt', dx: -36, dy: -110, size: 58, rot: 4 },
  { name: 'chat', dx: 46, dy: -108, size: 64, rot: -5 },
  { name: 'geburtstag', dx: 108, dy: -52, size: 70, rot: 8 },
  { name: 'papier-stift', dx: -115, dy: 38, size: 56, rot: -4 },
  { name: 'kochtopf', dx: 115, dy: 41, size: 58, rot: 6 },
];
/** Memo as the hero of hallo and fertig: this much bigger, in the upper middle of the screen. */
const HERO = 1.45;
/** Stickers start once Memo has landed; the line and the button wait for the last one. */
const T_RING = 900;
const ringEnd = (n: number) => T_RING + (n - 1) * 190 + 450;
const clay = (n?: string): ClayName => (n && n in clayIcons ? (n as ClayName) : 'kalender');

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const wdLong = (d: string) => WD_LONG[weekday(d)];
/** "10 Uhr", "10:30", "3pm": the time in a sentence, when the date reader left it out. */
function timeOf(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(uhr|h)\b/i) || text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || text.match(/\b(?:um|at)\s+(\d{1,2})(?:[:.](\d{2}))?\b/i);
  if (!m) return undefined;
  let h = +m[1];
  if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /am/i.test(m[3]) && h === 12) h = 0;
  if (h > 23) return undefined;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}
function itemsOf(text: string) {
  const t = text
    .replace(/^(wir brauchen|brauchen|bitte|kauf(e)?|noch|we need|need|buy|add)\s+/i, '')
    .replace(/\s+(auf die liste|noch|bitte|to the list)\s*$/i, '')
    .replace(/[.!]+$/, '');
  return t.split(/,|\s+und\s+|\s+and\s+|\s*&\s*/i).map((s) => cap(s.trim())).filter(Boolean).slice(0, 5);
}

/** The isolated world of the flow: a few calm entries of a family week, the shopping list, no kids. */
function startState() {
  const keep = new Set<string>([]);
  const s = buildDemoState(TODAY);
  return { ...s, people: [], events: demoEvents(TODAY).filter((e) => keep.has(e.id)).map((e) => ({ ...e, people: undefined })), calView: 'tag' as const };
}

const now = () => new Date().toISOString();
const agoIso = (min: number) => new Date(Date.now() - min * 60000).toISOString();

export default function Flow() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const kb = useKeyboardInset();
  // Screens for the landing page: /onboarding/flow?step=baby&a=Julia&b=Tom opens a step directly.
  const q = useLocalSearchParams<{ step?: string; a?: string; b?: string }>();
  const [step, setStep] = useState<Step>('hallo');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [phase, setPhase] = useState<'wait' | 'think' | 'pick' | 'done'>('wait');
  /** A follow-up Memo asked: which dentist (ort), the next round of the game (runde). */
  const [ask, setAsk] = useState<'ort' | 'runde' | 'liste' | 'split' | null>(null);
  const [pick, setPick] = useState<{ dish: string; picks: string[]; have: string[]; off: string[]; said: string } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [act, setAct] = useState<{ kind: Act; n: number }>({ kind: 'land', n: 0 });
  const t = useSharedValue(0);
  const si = STEPS.indexOf(step);
  const A = nameA.trim() || tx('du', 'you');
  const B = nameB.trim();
  const Bn = B || tx('Dein Partner', 'Your partner');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, reduced ? 0 : ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // ── The isolated world ────────────────────────────────────────────────
  const demo: Store = useMemo(() => createStore(startState()), []);
  const people: Persons = useMemo(() => ({ J: { ...appPersons.J, name: nameA.trim() || tx('Du', 'You') }, T: { ...appPersons.T, name: B || tx('Partner', 'Partner') } }), [nameA, B]);
  useEffect(() => { demo.set(() => ({ names: { J: people.J.name, T: people.T.name } })); }, [people]);
  const [items, setItems] = useState<Bit[]>([]);
  const [ev, setEv] = useState<CalEvent | null>(null);
  const [calKey, setCalKey] = useState(0);
  const [notif, setNotif] = useState<{ title: string; body: string } | null>(null);
  /** Stickers that pop out over the real app when something lands. */
  const [pops, setPops] = useState<{ name: ClayName; x: number; y: number; size: number; rot: number; fromY: number }[]>([]);

  // ── Memo ───────────────────────────────────────────────────────────────
  const play = (kind: Act, dur: number) => {
    cancelAnimation(t);
    t.value = 0;
    setAct((a) => ({ kind, n: a.n + 1 }));
    if (reduced) { t.value = dur; return; }
    t.value = withTiming(dur, { duration: dur * 1000, easing: Easing.linear });
  };
  useEffect(() => { play('land', 3.2); }, []);
  useEffect(() => {
    const s = q.step as Step | undefined;
    if (!s || !STEPS.includes(s) || s === 'hallo') return;
    if (q.a) setNameA(String(q.a));
    if (q.b) setNameB(String(q.b));
    go(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const corner = TRY.has(step);
  const isHero = step === 'hallo' || step === 'fertig';
  const pos = useSharedValue(0);
  useEffect(() => { pos.value = reduced ? (corner ? 1 : 0) : withSpring(corner ? 1 : 0, { stiffness: 170, damping: 26 }); }, [corner]);
  const hero = useSharedValue(1);
  useEffect(() => { hero.value = reduced ? (isHero ? 1 : 0) : withSpring(isHero ? 1 : 0, { stiffness: 170, damping: 26 }); }, [isHero]);

  const [magA, setMagA] = useState(false);
  const [magB, setMagB] = useState(false);
  useEffect(() => { const on = !!nameA.trim(); if (on !== magA) { setMagA(on); if (on) { haptics.tap(); play('name', 1.2); } } }, [nameA]);
  useEffect(() => { const on = !!nameB.trim(); if (on !== magB) { setMagB(on); if (on) { haptics.tap(); play('name', 1.2); } } }, [nameB]);

  // ── Geometry ───────────────────────────────────────────────────────────
  const barY = insets.top + 12;
  const memoY = insets.top + 96;
  const bubbleY = memoY + MEMO + 18;
  const headY = insets.top + 50;
  const stageTop = headY + SMALL + 12;
  const bottom = kb > 0 ? kb + 8 : insets.bottom + 12;
  /** The hero's centre and radius (hallo, fertig). */
  const heroCY = Math.max(memoY + MEMO / 2 + 60, Math.round(H * 0.36));
  const heroR = (MEMO * HERO) / 2;
  const cy = isHero ? heroCY : memoY + MEMO / 2;
  const R = isHero ? heroR : MEMO / 2;

  const outer = useAnimatedStyle((): any => {
    const p = pos.value;
    const h = hero.value;
    const k = mix(1, SMALL / MEMO, p) * (1 + (HERO - 1) * h);
    const big = { x: W / 2 - MEMO / 2, y: memoY + (heroCY - memoY - MEMO / 2) * h };
    const small = { x: 18 - (MEMO - SMALL) / 2, y: headY - (MEMO - SMALL) / 2 };
    return { transform: [{ translateX: mix(big.x, small.x, p) }, { translateY: mix(big.y, small.y, p) }, { scale: k }] };
  }, [W, memoY, headY, heroCY]);
  const keys: Record<Act, EyeKey[]> = {
    land: [{ t: 0.75, e: 'happy' }, { t: 1.6, e: 'open' }, { t: 2.2, e: 'wink', direct: true }, { t: 2.75, e: 'open', direct: true }],
    name: [{ t: 0.05, e: 'happy' }, { t: 0.9, e: 'open' }],
    answer: [{ t: 0.15, e: 'closed' }, { t: 0.45, e: 'think' }, { t: 1.3, e: 'happy' }, { t: 2.6, e: 'open' }],
    idle: [],
    fertig: [{ t: 0.1, e: 'happy' }, { t: 1.2, e: 'wink', direct: true }, { t: 1.75, e: 'happy', direct: true }],
  };
  const answering = act.kind === 'answer';
  const memoSt = useAnimatedStyle((): any => {
    const v = t.value;
    const k = act.kind;
    if (k === 'land') {
      // Pulled in like a magnet: travels down, the last 30 % accelerates, contact squash and one rebound.
      const p = seg(v, 0.1, 0.7);
      const y = p < 0.7 ? mix(-220, -40, 1 - (1 - p / 0.7) ** 3) : mix(-40, 0, ((p - 0.7) / 0.3) ** 2);
      const sq = Math.max(0, recoil(v - 0.7, 0.09));
      return { opacity: seg(v, 0.1, 0.3), transform: [{ translateY: y + sq * MEMO * 0.5 }, { scaleY: 1 - sq }, { scaleX: 1 + sq * 0.9 }] };
    }
    if (k === 'name' || k === 'fertig') {
      const hop = -9 * Math.sin(Math.PI * seg(v, 0.02, 0.27));
      const sq = Math.max(0, recoil(v - 0.27, 0.07));
      return { opacity: 1, transform: [{ translateY: hop + sq * MEMO * 0.5 }, { scaleY: 1 - sq }, { scaleX: 1 + sq * 0.9 }] };
    }
    if (k === 'answer') {
      // Thinks (anticipation squash, tilt), then the answer lands: a glad hop with a ceramic recoil.
      const ant = kf(v, [0.15, 0.25, 0.4], [0, 1, 0]);
      const tilt = 7 * crit(v - 0.4, 13) * (1 - crit(v - 1.25, 15));
      const hop = -14 * Math.sin(Math.PI * seg(v, 1.3, 1.58));
      const land1 = recoil(v - 1.58, 0.08);
      const sq = ant * 0.07 + Math.max(0, land1);
      return { opacity: 1, transform: [{ translateY: hop + sq * MEMO * 0.5 }, { rotate: `${tilt}deg` }, { scaleY: 1 - sq }, { scaleX: 1 + sq * 0.9 }] };
    }
    return { opacity: 1, transform: [] };
  }, [act]);

  // ── Moving on ──────────────────────────────────────────────────────────
  const go = (s: Step) => {
    haptics.select();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('wait'); setReply(null); setNotif(null); setPops([]);
    setStep(s);
    // Julian 05.11. 21:58 CET: too much going on in the real screens. Each step starts empty and shows only what you just did.
    setAsk(null); setPick(null);
    if (s === 'termin' || s === 'kochen' || s === 'spielen' || s === 'filme' || s === 'baby') setItems([]);
    // Memo writes first here: it remembers the baby and sends the first year on its own.
    if (s === 'baby') {
      setPhase('think');
      later(700, () => {
        setItems([{ id: 'plan', type: 'plan' }]);
        haptics.success();
        later(900, () => { setReply(tx('Soll ich daraus eine Aufgabenliste machen? Sag einfach „Ja“.', 'Shall I turn it into a task list? Just say “Yes”.')); setAsk('liste'); setPhase('wait'); });
      });
    }
    if (s === 'verschieben' && ev) { demo.set(() => ({ calDay: ev.date })); setCalKey((k) => k + 1); }
    if (s === 'fertig') play('fertig', 2.4); else { cancelAnimation(t); t.value = 0; setAct((a) => ({ kind: 'idle', n: a.n + 1 })); }
  };

  const land = (it: Bit) => setItems((its) => (its.some((x) => x.id === it.id) ? its.map((x) => (x.id === it.id ? it : x)) : [...its, it]));
  const finish = (line: string) => {
    setReply(line);
    later(T_DONE, () => setPhase('done'));
  };

  /** Things onto the shopping list; the partner, at the shop, ticks the first one off. */
  const toList = (id: string, said: string, at: string, names: string[]) => {
    const add: Item[] = names.map((name, k) => ({ id: `i_mine${k}`, name, who: 'J', done: false }));
    demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.einkauf ? l : { ...l, sections: l.sections.map((sec) => (sec.id !== 'supermarkt' ? sec : { ...sec, items: [...sec.items, ...add] })) })) }));
    const list = demo.get().lists.find((l) => l.id === DEMO.einkauf)!;
    land({ id, type: 'entry', side: 'right', f: madeItems({ id, by: 'J', said, at, say: add.length > 1 ? tx(`${add.length} Sachen stehen auf der Einkaufsliste.`, `${add.length} things are on the shopping list.`) : tx('Steht auf der Einkaufsliste.', 'It’s on the shopping list.'), list, items: add }) });
    later(240, () => haptics.success());
    setReply(tx('Steht auf der Einkaufsliste.', 'It’s on the shopping list.'));
    later(1800, () => {
      demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.einkauf ? l : { ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.map((i) => (i.id === add[0].id ? { ...i, done: true, who: 'T' as const } : i)) })) })) }));
      haptics.select();
    });
    later(2400, () => {
      haptics.success();
      finish(tx(`${Bn} ist im Laden und hakt ab.`, `${Bn} is at the shop, ticking things off.`));
    });
  };
  const addPick = () => {
    if (!pick) return;
    const take = pick.picks.filter((x) => !pick.off.includes(x));
    haptics.commit();
    setPhase('think');
    setItems((its) => its.filter((x) => x.id !== 'k1' && !x.id.startsWith('m')));
    later(380, () => toList('k1', pick.said, now(), take));
  };
  const skipPick = () => {
    haptics.select();
    setItems((its) => its.filter((x) => x.id !== 'k1'));
    finish(tx('Alles da, dann kommt nichts auf die Liste.', 'All there, nothing goes on the list.'));
  };
  /** One round of the game: each spoken name gets its points, whoever wasn't named gets 0. */
  const addRound = (round: { who: string; points: number }[]) => {
    demo.set((st) => ({ lists: st.lists.map((l) => {
      if (l.id !== GAME_ID) return l;
      const ps = l.sections[0].items;
      const got = new Map<string, number>();
      round.forEach((r) => { const p = matchPlayer(ps, r.who); if (p) got.set(p.id, (got.get(p.id) ?? 0) + r.points); });
      return { ...l, sections: [{ ...l.sections[0], items: ps.map((p) => ({ ...p, data: { ...p.data, rounds: [...(p.data?.rounds ?? []), got.get(p.id) ?? 0] } })) }] };
    }) }));
  };

  const send = (raw: string) => {
    const said = raw.trim();
    if (!said || phase !== 'wait') return;
    haptics.commit();
    setPhase('think');
    setReply(null);
    play('answer', 2.8);
    const id = `u${Date.now()}`;
    const at = now();

    const mine = (bit?: Bit) => setItems((its) => [...its, { id: `m${id}`, type: 'entry', side: 'right', f: message({ id: `m${id}`, by: 'J', said, at }) } as Bit, ...(bit ? [bit] : [])]);

    if (step === 'termin' && ask === 'ort' && ev) {
      setItems((its) => [...its, { id, type: 'think', by: 'J', said, at, side: 'right' }]);
      later(T_LAND, () => {
        const place = said.replace(/^(bei|beim|zu|zum|at|the)\s+/i, '').replace(/[.!]+$/, '');
        const name = placeName(place);
        const e: CalEvent = { ...ev, place };
        demo.set((st) => ({ events: st.events.map((x) => (x.id === e.id ? e : x)) }));
        setEv(e);
        land({ id, type: 'entry', side: 'right', f: madeEvents({ id, by: 'J', said, at, say: tx(`Gemerkt. Nächstes Mal trage ich ${name} direkt ein.`, `Saved. Next time I’ll add ${name} right away.`), events: [e] }) });
        later(240, () => haptics.success());
        setAsk(null);
        finish(tx(`Gemerkt. Sagt ihr nächstes Mal nur „${e.title}“, trage ich ${name} direkt ein.`, `Saved. Next time you just say “${e.title}” and I add ${name}.`));
      });
      return;
    }

    if (step === 'baby') {
      const no = NO.test(said);
      mine();
      later(T_LAND, () => {
        if (ask === 'liste') {
          if (no) { setAsk(null); finish(tx('Okay. Die Liste bleibt hier, wenn ihr sie braucht.', 'Okay. The list stays here when you need it.')); return; }
          land({ id: 'tasks', type: 'tasks', split: false });
          later(240, () => haptics.success());
          setReply(tx('Steht in euren Aufgaben. Wollt ihr aufteilen, wer was macht? Sag „Ja“.', 'It’s in your tasks. Want to split who does what? Say “Yes”.'));
          setAsk('split');
          setPhase('wait');
          return;
        }
        setAsk(null);
        if (no) { finish(tx('Okay, das könnt ihr später aufteilen.', 'Okay, you can split it later.')); return; }
        setItems((its) => [...its.filter((x) => x.id !== 'tasks'), { id: 'tasks', type: 'tasks', split: true }]);
        later(240, () => haptics.success());
        finish(tx(`Vorschlag: Ämter macht ${A}, Ärzte und Hebamme ${Bn}. Sagt einfach, wenn ihr tauschen wollt.`, `Suggestion: ${A} does the paperwork, ${Bn} the doctors and midwife. Just say if you want to swap.`));
      });
      return;
    }

    if (step === 'filme') {
      mine();
      later(T_LAND, () => {
        const name = filmOf(said);
        demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.filme ? l : { ...l, sections: l.sections.map((sec, k) => (k ? sec : { ...sec, items: [...sec.items, { id: 'i_film_mine', name, who: 'J', done: false, data: { kind: 'film' } } as Item] })) })) }));
        land({ id: 'films', type: 'films', say: tx(`„${name}“ steht auf eurer Filmliste.`, `“${name}” is on your watchlist.`) });
        later(240, () => haptics.success());
        finish(tx(`Steht drauf. ${Bn} sieht die Liste auch, und abends wisst ihr, was ihr schauen wollt.`, `It’s on. ${Bn} sees the list too, so tonight you know what to watch.`));
      });
      return;
    }

    if (step === 'kochen') {
      const d = DISHES.find((x) => x.re.test(said));
      if (d) {
        mine();
        later(T_LAND, () => {
          const tr = ([de, en]: [string, string]) => tx(de, en);
          setPick({ dish: tr(d.dish), picks: d.picks.map(tr), have: d.have.map(tr), off: [], said });
          land({ id: 'k1', type: 'pick' });
          later(240, () => haptics.success());
          setReply(tx('Das braucht ihr. Tipp weg, was ihr schon zu Hause habt.', 'Here’s what you need. Tap away what’s already at home.'));
          setPhase('pick');
        });
        return;
      }
      // No dish Memo knows: the words themselves go on the list.
      const names = itemsOf(said);
      setItems((its) => [...its, { id, type: 'think', by: 'J', said, at, side: 'right' }]);
      later(T_LAND, () => toList(id, said, at, names.length ? names : [cap(said)]));
      return;
    }

    if (step === 'spielen') {
      const rule = GAME_RULES.find((g) => g.re.test(said));
      const round = parseRound(rule?.spoken ? rule.spoken(said) : said);
      const has = !!demo.get().lists.find((l) => l.id === GAME_ID);
      if (!has && !rule) {
        setPhase('wait');
        setReply(tx('Welches Spiel? Sag zum Beispiel „Wir spielen Rommé“.', 'Which game? Say for example “We’re playing Rummy”.'));
        return;
      }
      mine();
      later(T_LAND, () => {
        if (!has) {
          const r = rule!;
          demo.set((st) => ({ lists: [...st.lists, {
            id: GAME_ID, name: r.name, icon: 'gesellschaftsspiel', kind: 'collection',
            blueprint: { blocks: ['points'], source: null, points: { lowWins: !!r.lowWins, doubleWord: /romm|rummy/i.test(r.name) } },
            sections: [{ id: 'main', title: '', items: [
              { id: 'p_a', name: people.J.name, who: 'J', done: false, data: { rounds: [] } },
              { id: 'p_b', name: people.T.name, who: 'T', done: false, data: { rounds: [] } },
            ] }],
          } as any] }));
          land({ id: 'score', type: 'score', list: GAME_ID });
        }
        if (round) {
          addRound(round.round);
          setItems((its) => [...its.filter((x) => x.id !== 'score'), { id: 'score', type: 'score', list: GAME_ID }]);
        }
        later(240, () => haptics.success());
        if (!round) {
          setReply(tx(`Ich zähle mit. Sag nach der Runde die Punkte, zum Beispiel „${people.J.name} 20, ${people.T.name} 35“.`, `I’ll keep score. After a round say the points, for example “${people.J.name} 20, ${people.T.name} 35”.`));
          setAsk('runde');
          setPhase('wait');
          return;
        }
        // The partner says the next round on their phone; it lands in the same board.
        later(1900, () => {
          const r2 = [{ who: people.J.name, points: 5 }, { who: people.T.name, points: 10 }];
          setItems((its) => [...its.filter((x) => x.id !== 'score'), { id: 'p2', type: 'entry', side: 'left', f: message({ id: 'p2', by: 'T', said: `${people.T.name} 10, ${people.J.name} 5`, at: now() }) } as Bit, { id: 'score', type: 'score', list: GAME_ID }]);
          addRound(r2);
          haptics.select();
          const l = demo.get().lists.find((x) => x.id === GAME_ID)!;
          const ps = l.sections[0].items;
          const tot = (i: Item) => (i.data?.rounds ?? []).reduce((a: number, b: number) => a + b, 0);
          const low = !!l.blueprint?.points?.lowWins;
          const lead = [...ps].sort((a, b) => (low ? tot(a) - tot(b) : tot(b) - tot(a)))[0];
          finish(tx(`${lead.name} führt. Ihr spielt, ich zähle.`, `${lead.name} leads. You play, I count.`));
        });
      });
      return;
    }

    if (step === 'termin') {
      setItems((its) => [...its, { id, type: 'think', by: 'J', said, at, side: 'right' }]);
      later(T_LAND, () => {
        const r = understand(said, demo.get().events, null, () => 'ev_mine');
        if (r.kind === 'answer') {
          // No appointment in it: Memo says so in its line and the field waits again (no dead end).
          setItems((its) => its.filter((x) => x.id !== id));
          setReply(tx('Das war kein Termin. Sag zum Beispiel „Freitag 15 Uhr Zahnarzt“.', 'That wasn’t an appointment. Try “Friday 3pm dentist”.'));
          setPhase('wait');
          return;
        }
        const title = r.kind === 'added' ? r.event.title : r.title;
        const e: CalEvent = r.kind === 'added'
          ? { ...r.event, who: r.event.who ?? 'J' }
          : { id: 'ev_mine', title, icon: 'kalender', date: addDays(TODAY, 1), start: '00:00', allDay: true, who: 'J' };
        demo.set((st) => ({ events: [...st.events.filter((x) => x.id !== e.id), e] }));
        setEv(e);
        const when = `${wdLong(e.date)}${e.allDay ? '' : `, ${hm(e.start)}`}`;
        land({ id, type: 'entry', side: 'right', f: madeEvents({ id, by: 'J', said, at, say: tx(`Steht drin. ${when}.`, `Done. ${when}.`), events: [e] }) });
        later(240, () => haptics.success());
        // Julian 05.11. 22:04 CET: the dentist asks which one and where, so it remembers next time.
        const kind = placeKind(e.title);
        if (kind) {
          setReply(tx(`Steht drin. ${kind.q} Sag zum Beispiel „Dr. Weber, Lindenstraße 4“.`, `It’s in. ${kind.q} Say for example “Dr. Weber, 4 Linden Street”.`));
          setAsk('ort');
          setPhase('wait');
          return;
        }
        finish(e.allDay
          ? tx(`Steht drin, ${wdLong(e.date)}. ${Bn} sieht es auch. Die Uhrzeit sagst du einfach dazu.`, `It’s in, ${wdLong(e.date)}. ${Bn} sees it too. Just add the time when you know it.`)
          : tx(`Steht drin. ${Bn} sieht es auch.`, `It’s in. ${Bn} sees it too.`));
      });
    } else if (step === 'verschieben' && ev) {
      later(T_LAND, () => {
        const w = parseWhen(said, { base: ev.date });
        const date = w?.date && w.date !== ev.date ? w.date : (w?.date ?? addDays(ev.date, 1));
        const said_t = w?.start ?? timeOf(said);
        const start = said_t ?? ev.start;
        const allDay = said_t ? false : ev.allDay;
        const len = ev.end && !ev.allDay ? Math.max(30, (Number(ev.end.slice(0, 2)) * 60 + Number(ev.end.slice(3))) - (Number(ev.start.slice(0, 2)) * 60 + Number(ev.start.slice(3)))) : 60;
        const endM = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + len;
        const end = allDay ? undefined : `${String(Math.min(23, Math.floor(endM / 60))).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
        const moved: CalEvent = { ...ev, date, start, end, allDay };
        demo.set((st) => ({ events: st.events.map((x) => (x.id === ev.id ? moved : x)), calDay: date }));
        setEv(moved);
        setCalKey((k) => k + 1);
        // The card in the chat says Geändert, like the real one does.
        setItems((its) => its.map((x) => (x.type === 'entry' && x.f.events?.includes(ev.id) ? { ...x, f: { ...x.f, changed: true } } : x)));
        later(240, () => haptics.success());
        const when = `${wdLong(date)}${allDay ? '' : `, ${hm(start)}`}`;
        setReply(tx(`Verschoben auf ${when}.`, `Moved to ${when}.`));
        // Then the partner's phone lights up: the shared part, the one thing a solo calendar can't do.
        later(1500, () => {
          setNotif({ title: people.J.name, body: tx(`hat „${moved.title}“ auf ${when} verschoben`, `moved “${moved.title}” to ${when}`) });
          haptics.select();
          finish(tx(`${Bn} weiß es sofort.`, `${Bn} knows right away.`));
        });
      });
    }
  };

  const baby = useMemo(() => babyOf(), []);
  const nextDay = ev ? addDays(ev.date, weekday(ev.date) === 5 ? 3 : 1) : addDays(TODAY, 2);
  // ── Copy ───────────────────────────────────────────────────────────────
  const line: string | null = (() => {
    if (reply) return reply;
    if (phase === 'think') return null;
    switch (step) {
      case 'hallo': return tx('Hallo, ich bin Memo. Euer Kalender, mit dem ihr einfach sprecht.', 'Hi, I’m Memo. Your calendar you simply talk to.');
      case 'namen': return magA ? (magB ? tx(`Schön, ${A} und ${B}!`, `Nice to meet you, ${A} and ${B}!`) : tx(`Hallo ${A}! Und mit wem teilst du den Kalender?`, `Hi ${A}! Who do you share the calendar with?`)) : tx('Wer seid ihr?', 'Who are you?');
      // Julian 05.11. 22:05 CET: no tiles to tap; Memo says what you could say, anything else works too.
      case 'termin': return tx(`Sag mir einen Termin, ${A}. Zum Beispiel „Freitag 15 Uhr Zahnarzt“.`, `Tell me an appointment, ${A}. For example “Friday 3pm dentist”.`);
      case 'verschieben': return tx(`Etwas ändert sich? Sag zum Beispiel „Verschieb das auf ${wdLong(nextDay)} 10 Uhr“.`, `Plans changed? Say for example “Move it to ${wdLong(nextDay)} at 10”.`);
      case 'kochen': return tx('Was kocht ihr? Sag zum Beispiel „Wir kochen heute Lasagne“.', 'What are you cooking? Say for example “We’re cooking lasagna tonight”.');
      case 'baby': return null;
      case 'filme': return tx('Und eure Filmliste? Sag zum Beispiel „Den Film Dune müssen wir sehen“.', 'And your watchlist? Say for example “We have to watch Dune”.');
      case 'spielen': return tx('Spielt ihr was? Sag zum Beispiel „Wir spielen Rommé“.', 'Playing a game? Say for example “We’re playing Rummy”.');
      case 'fertig': return tx('Das war’s schon. Jetzt seid ihr dran.', 'That’s it. Your turn.');
    }
  })();
  const examples: Record<string, string[]> = {
    termin: [ask === 'ort' ? tx('Dr. Weber, Lindenstraße 4', 'Dr. Weber, 4 Linden Street') : tx('Freitag 15 Uhr Zahnarzt', 'Friday 3pm dentist')],
    verschieben: [tx(`Verschieb das auf ${wdLong(nextDay)} 10 Uhr`, `Move it to ${wdLong(nextDay)} at 10`), tx('Lieber einen Tag später', 'Make it a day later')],
    kochen: [tx('Wir kochen heute Lasagne', 'We’re cooking lasagna tonight')],
    baby: [tx('Ja', 'Yes')],
    filme: [tx('Den Film Dune müssen wir sehen', 'We have to watch Dune')],
    spielen: [ask === 'runde' ? `${people.J.name} 20, ${people.T.name} 35` : tx('Wir spielen Rommé', 'We’re playing Rummy')],
  };
  const nextLabel: Record<string, string> = {
    termin: tx('Im Kalender ansehen', 'See it in the calendar'),
    verschieben: tx('Weiter', 'Continue'),
    kochen: tx('Weiter', 'Continue'),
    spielen: tx('Weiter', 'Continue'),
    filme: tx('Weiter', 'Continue'),
    baby: tx('Fertig', 'Done'),
  };
  const next: Record<Step, Step> = { hallo: 'namen', namen: 'termin', termin: 'verschieben', verschieben: 'kochen', kochen: 'spielen', spielen: 'filme', filme: 'baby', baby: 'fertig', fertig: 'fertig' };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: corner ? stageTop : 0, paddingBottom: bottom }}>
      {/* The real app, played with your names (try steps) */}
      {corner ? (
        <Animated.View key="stage" entering={FadeIn.duration(260)} style={{ flex: 1, overflow: 'hidden', marginBottom: 6 }}>
          <StoreContext.Provider value={demo}>
            <PersonsContext.Provider value={people}>
              <StillContext.Provider value>
                <View pointerEvents={phase === 'pick' ? 'box-none' : 'none'} style={{ flex: 1 }}>
                  {step === 'verschieben'
                    ? <CalendarStage key={calKey} />
                    : <ChatStage items={items} baby={baby} pick={pick} onToggle={(x) => { haptics.select(); setPick((p) => (p ? { ...p, off: p.off.includes(x) ? p.off.filter((y) => y !== x) : [...p.off, x] } : p)); }} onAdd={addPick} onSkip={skipPick} />}
                </View>
              </StillContext.Provider>
            </PersonsContext.Provider>
          </StoreContext.Provider>
          {notif ? <PartnerPhone owner={Bn} title={notif.title} body={notif.body} /> : null}
          {pops.map((p) => <Sticker key={`${step}-${p.name}`} name={p.name} size={p.size} x={p.x} y={p.y} rot={p.rot} from={{ x: p.x, y: p.fromY }} tap />)}
        </Animated.View>
      ) : <View style={{ flex: 1 }} />}

      {/* Progress: the promised length (Me+, Duolingo) */}
      <View style={{ position: 'absolute', left: 16, right: 16, top: barY, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 5 }}>
        <Pressable onPress={() => (si > 0 ? go(STEPS[si - 1]) : router.back())} hitSlop={12} accessibilityLabel={tx('Zurück', 'Back')}><LineIcon name="back" size={22} /></Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= si ? tokens.done : tokens.hair }} />)}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt size={14} weight={600} color={tokens.sub}>{tx('Später', 'Later')}</Txt></Pressable>
      </View>

      {/* Name magnets around Memo */}
      {step === 'namen' || step === 'fertig' ? (
        <>
          {/* Beside Memo while you type; on its lower edge, like stickers, at the end */}
          {magA ? <Magnet key={`a-${isHero}`} x={isHero ? W / 2 - 66 - 20 : W / 2 - MEMO / 2 - 46} y={isHero ? cy + 52 - 20 : memoY + MEMO * 0.42} letter={A[0]} c={ME} /> : null}
          {magB ? <Magnet key={`b-${isHero}`} x={isHero ? W / 2 + 66 - 20 : W / 2 + MEMO / 2 + 6} y={isHero ? cy + 52 - 20 : memoY + MEMO * 0.42} letter={B[0]} c={YOU} /> : null}
        </>
      ) : null}

      {/* Memo: big in the middle when it talks to you, small in its corner while the app plays */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: MEMO, height: MEMO, transformOrigin: 'center' } as any, outer]}>
        <Animated.View style={[{ width: MEMO, height: MEMO }, memoSt]}>
          <MemoFace key={`${act.kind}-${act.n}`} size={MEMO} clock={t} keys={keys[act.kind]} initial="open" />
        </Animated.View>
      </Animated.View>

      {/* Stickers pop out of Memo: hallo and fertig (Airbnb reference) */}
      {step === 'hallo' ? <StickerRing key="r-hallo" cx={W / 2} cy={heroCY} items={HALLO} start={T_RING} /> : null}
      {step === 'fertig' ? <StickerRing key="r-fertig" cx={W / 2} cy={heroCY} items={FERTIG} start={500} /> : null}

      {/* Memo's one line. In the middle as a bubble; in the corner beside Memo, overwritten in place, never stacked. */}
      {corner ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 18 + SMALL + 12, right: 18, top: headY, height: SMALL, justifyContent: 'center' }}>
          {line ? (
            <Animated.View key={line} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
              <Txt size={16.5} weight={600} line={22} numberOfLines={3}>{line}</Txt>
            </Animated.View>
          ) : (
            <Animated.View key="dots" entering={FadeIn.duration(160)}><Txt size={16.5} weight={600} color={tokens.mute}>…</Txt></Animated.View>
          )}
        </View>
      ) : line ? (
        <Late key={`${step}-${line}`} ms={step === 'hallo' ? ringEnd(HALLO.length) - 250 : step === 'fertig' ? 500 + (FERTIG.length - 1) * 190 + 200 : 0} style={{ position: 'absolute', left: 24, right: 24, top: isHero ? heroCY + heroR + 64 : bubbleY, alignItems: 'center' }}>
          <View style={{ width: 14, height: 14, backgroundColor: tokens.row, transform: [{ rotate: '45deg' }], marginBottom: -7, borderLeftWidth: 1, borderTopWidth: 1, borderColor: tokens.hair }} />
          <View style={{ backgroundColor: tokens.row, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: tokens.hair, maxWidth: 340 }}>
            <Txt size={19} weight={600} line={25} center>{line}</Txt>
          </View>
        </Late>
      ) : null}

      {/* Bottom: rides on the keyboard, so the field and the examples are never under the keys */}
      <View style={{ marginHorizontal: 12, gap: 10 }}>
        {step === 'namen' ? (
          <View style={{ gap: 10, paddingHorizontal: 4 }}>
            <NameField value={nameA} onChange={setNameA} placeholder={tx('Dein Name', 'Your name')} c={ME} />
            <NameField value={nameB} onChange={setNameB} placeholder={tx('Mit wem teilst du ihn? (Partner)', 'Shared with? (partner)')} c={YOU} />
            <Txt size={13.5} color={tokens.mute} center>{tx('Kinder und Großeltern kommen später dazu.', 'Kids and grandparents can join later.')}</Txt>
          </View>
        ) : null}
        {TRY.has(step) && phase !== 'done' && phase !== 'pick' ? (
          <View style={{ opacity: phase === 'think' ? 0.5 : 1 }} pointerEvents={phase === 'think' ? 'none' : 'auto'}>
            <TalkBar key={`${step}-${ask}`} split card={navStyle() === 'strip'} onSend={send} spoken={examples[step]} placeholder={ask === 'ort' ? tx('Name und Straße …', 'Name and street …') : tx('Sprich oder schreib einfach …', 'Just say or type it …')} />
          </View>
        ) : null}
        {TRY.has(step) && phase === 'done' ? <View style={{ paddingHorizontal: 4 }}><Btn label={nextLabel[step]} onPress={() => go(next[step])} /></View> : null}
        {step === 'hallo' ? <Late key="b-hallo" ms={ringEnd(HALLO.length) + 250} style={{ paddingHorizontal: 4 }}><Btn label={tx('Hallo Memo!', 'Hi Memo!')} onPress={() => go('namen')} /></Late> : null}
        {step === 'namen' ? <View style={{ paddingHorizontal: 4 }}><Btn label={tx('Weiter', 'Continue')} disabled={!magA} onPress={() => go('termin')} /></View> : null}
        {step === 'fertig' ? <Late key="b-fertig" ms={500 + (FERTIG.length - 1) * 190 + 700} style={{ paddingHorizontal: 4 }}><Btn label={tx('Los geht’s', 'Let’s go')} onPress={() => { haptics.success(); router.back(); }} /></Late> : null}
      </View>
    </View>
  );
}

/** The real chat page: its title, the day pill, the app's own cards and thinking card, newest at the bottom. */
function ChatStage({ items, pick, onToggle, onAdd, onSkip, baby }: { baby: ReturnType<typeof babyOf>; items: Bit[]; pick: { dish: string; picks: string[]; have: string[]; off: string[] } | null; onToggle: (x: string) => void; onAdd: () => void; onSkip: () => void }) {
  const started = useRef(new Set(items.map((x) => x.id))).current;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, gap: 12 }}>
          {items.map((it) => (
            <Animated.View key={it.id} entering={started.has(it.id) ? undefined : rise()} exiting={rowOut} layout={rowLayout}>
              {it.type === 'pick'
                ? (pick ? <RecipePick dish={pick.dish} picks={pick.picks} have={pick.have} off={pick.off} onToggle={onToggle} onAdd={onAdd} onSkip={onSkip} /> : null)
                : it.type === 'score' ? <ScoreCard id={it.list} />
                : it.type === 'films' ? <FilmCard say={it.say} />
                : it.type === 'plan' ? <PlanCard say={baby.say} rows={baby.plan} more={baby.more} />
                : it.type === 'tasks' ? <TaskCard title={tx('Erstes Jahr', 'First year')} rows={baby.tasks} split={it.split} />
                : <Landing it={it} owner="J" today={TODAY} />}
            </Animated.View>
          ))}
        </View>
        <TopFade />
      </View>
    </View>
  );
}

/** The real calendar, Tage view, opened on the day of your appointment. Remounted when it moves, so it builds in on its new day. */
function CalendarStage() {
  return (
    <DayView header={() => <CalTitle />} />
  );
}
function CalTitle() {
  const day = React.useContext(StoreContext)!.get().calDay;
  const { month } = monthTitle(day);
  return (
    <View style={{ gap: 2 }}>
      <Txt size={15} color={tokens.sub}>{tx(`${WD_LONG[weekday(day)]}, ${Number(day.slice(8))}.`, `${WD_LONG[weekday(day)]} ${Number(day.slice(8))}`)}</Txt>
      <Txt size={30} line={36} weight={700} tracking={-1}>{month}</Txt>
    </View>
  );
}

/** The partner's phone, locked, comes down from the top with your change on it. */
function PartnerPhone({ owner, title, body }: { owner: string; title: string; body: string }) {
  const y = useSharedValue(-140);
  useEffect(() => { y.value = withSpring(0, { stiffness: 170, damping: 26 }); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 14, right: 14, top: 8, borderRadius: 26, backgroundColor: '#2E4650', padding: 10, paddingTop: 8, gap: 6, boxShadow: '0 14px 30px rgba(22,35,42,0.25)' } as any, st]}>
      <Txt size={12} weight={600} color="#FFFFFF" style={{ opacity: 0.8, paddingHorizontal: 6 }}>{tx(`${owner}s Handy`, `${owner}’s phone`)}</Txt>
      <LockNotif app="FamCal" title={title} body={body} when={tx('jetzt', 'now')} tag={tx('Vorschau', 'Preview')} />
    </Animated.View>
  );
}

function NameField({ value, onChange, placeholder, c }: { value: string; onChange: (v: string) => void; placeholder: string; c: { bg: string; fg: string } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: 18, backgroundColor: tokens.row, paddingHorizontal: 14, borderWidth: 1, borderColor: tokens.hair }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: value.trim() ? c.bg : tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={13} weight={700} color={value.trim() ? c.fg : tokens.mute}>{value.trim() ? value.trim()[0].toUpperCase() : '?'}</Txt>
      </View>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={tokens.mute} autoCapitalize="words" style={[{ flex: 1, fontSize: 17, color: tokens.ink }, noOutline]} />
    </View>
  );
}

/** A name magnet next to Memo: pops in once (critically damped), then stays still. */
function Magnet({ x, y, letter, c }: { x: number; y: number; letter?: string; c: { bg: string; fg: string } }) {
  const a = useSharedValue(0);
  useEffect(() => { a.value = withTiming(1, { duration: 420, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, []);
  const st = useAnimatedStyle((): any => ({ opacity: a.value, transform: [{ translateY: (1 - a.value) * 10 }, { scale: 0.85 + 0.15 * a.value }, { rotate: `${(1 - a.value) * 10}deg` }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: tokens.row }, st]}>
      <Txt size={17} weight={700} color={c.fg}>{(letter ?? '?').toUpperCase()}</Txt>
    </Animated.View>
  );
}


/**
 * Comes in after the stickers (content first, then the line, then the button). A plain animated
 * style, no entering animation: on web an entering View inside the flow column turns absolute.
 */
function Late({ ms, style, children }: { ms: number; style?: any; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const a = useSharedValue(reduced ? 1 : 0);
  const [on, setOn] = useState(reduced || ms <= 0);
  useEffect(() => {
    if (reduced) return;
    a.value = withDelay(ms, withTiming(1, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    const tm = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(tm);
  }, []);
  const st = useAnimatedStyle((): any => ({ opacity: a.value, transform: [{ translateY: (1 - a.value) * 10 }] }));
  return <Animated.View pointerEvents={on ? 'box-none' : 'none'} style={[style, st]}>{children}</Animated.View>;
}

/** The game, live from the demo list: the app's own scoreboard. */
function ScoreCard({ id }: { id: string }) {
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  if (!list) return null;
  return (
    <View style={[cardFrame, { gap: 0 }]}>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 16, paddingTop: 12 }}>{list.name}</Txt>
      <Scoreboard list={list} hint={false} />
    </View>
  );
}

/** The first year for a baby due in ten weeks, from the app's own plan (firstYear.ts). */
function babyOf() {
  const { milestones, cards } = firstYear({ name: '', due: DUE });
  const next = milestones.filter((m) => m.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
  const plan = next.slice(0, 5).map((m) => ({ id: m.id, icon: m.icon, title: m.title, sub: m.sub ?? '', frist: m.frist }));
  const tasks = cards.slice(0, 7).map((c) => ({ id: c.id, icon: c.icon, title: c.title, due: c.dueLabel ?? '', who: (AMT.test(c.title) ? 'J' : 'T') as 'J' | 'T' }));
  const weeks = Math.round(70 / 7);
  return {
    plan, tasks, more: Math.max(0, next.length - plan.length),
    say: tx(`Euer Baby kommt in ${weeks} Wochen. Ich habe euch das erste Jahr zusammengestellt, mit allen Fristen:`, `Your baby is due in ${weeks} weeks. I put together the first year for you, with every deadline:`),
  };
}

/** The watchlist, live from the demo list, newest first, with the app's own designed covers. */
function FilmCard({ say }: { say: string }) {
  const list = useStore((s) => s.lists.find((l) => l.id === DEMO.filme));
  if (!list) return null;
  const its = [...list.sections.flatMap((x) => x.items)].reverse();
  return (
    <View style={cardFrame}>
      <Txt size={15.5} line={21} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{say}</Txt>
      {its.map((i, k) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
          <CoverArt title={i.name} data={i.data} w={40} h={58} radius={8} fallback="designed" />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Txt size={16} weight={600} numberOfLines={1} color={i.data?.seen ? tokens.sub : tokens.ink}>{i.name}</Txt>
            <Txt size={13.5} color={tokens.sub} numberOfLines={1}>{k === 0 ? tx('Neu, von dir', 'New, from you') : [i.data?.year, i.data?.by].filter(Boolean).join(' · ')}</Txt>
          </View>
          {i.data?.seen ? <Txt size={12.5} weight={600} color={tokens.done}>{tx('Gesehen', 'Seen')}</Txt> : null}
        </View>
      ))}
      <View style={{ height: 8 }} />
    </View>
  );
}
