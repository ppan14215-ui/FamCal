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
import { router } from 'expo-router';
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
import { parseWhen } from '../../src/lib/when';
import { fillField } from '../../src/lib/simple';
import { navStyle } from '../../src/lib/navStyle';
import { useKeyboardInset } from '../../src/lib/keyboard';
import { TODAY, addDays, weekday, WD_LONG, hm } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';

type Step = 'hallo' | 'namen' | 'termin' | 'verschieben' | 'einkauf' | 'fertig';
const STEPS: Step[] = ['hallo', 'namen', 'termin', 'verschieben', 'einkauf', 'fertig'];
const TRY = new Set<Step>(['termin', 'verschieben', 'einkauf']);
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
  const [step, setStep] = useState<Step>('hallo');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [phase, setPhase] = useState<'wait' | 'think' | 'done'>('wait');
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
  const [items, setItems] = useState<StageItem[]>([]);
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
    if (s === 'termin' || s === 'einkauf') setItems([]);
    if (s === 'verschieben' && ev) { demo.set(() => ({ calDay: ev.date })); setCalKey((k) => k + 1); }
    if (s === 'fertig') play('fertig', 2.4); else { cancelAnimation(t); t.value = 0; setAct((a) => ({ kind: 'idle', n: a.n + 1 })); }
  };

  const land = (it: StageItem) => setItems((its) => (its.some((x) => x.id === it.id) ? its.map((x) => (x.id === it.id ? it : x)) : [...its, it]));
  const finish = (line: string) => {
    setReply(line);
    later(T_DONE, () => setPhase('done'));
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
    } else if (step === 'einkauf') {
      const names = itemsOf(said);
      setItems((its) => [...its, { id, type: 'think', by: 'J', said, at, side: 'right' }]);
      later(T_LAND, () => {
        const add: Item[] = (names.length ? names : [cap(said)]).map((name, k) => ({ id: `i_mine${k}`, name, who: 'J', done: false }));
        demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.einkauf ? l : { ...l, sections: l.sections.map((sec) => (sec.id !== 'supermarkt' ? sec : { ...sec, items: [...sec.items, ...add] })) })) }));
        const list = demo.get().lists.find((l) => l.id === DEMO.einkauf)!;
        land({ id, type: 'entry', side: 'right', f: madeItems({ id, by: 'J', said, at, say: add.length > 1 ? tx(`${add.length} Sachen stehen auf der Einkaufsliste.`, `${add.length} things are on the shopping list.`) : tx('Steht auf der Einkaufsliste.', 'It’s on the shopping list.'), list, items: add }) });
        later(240, () => haptics.success());
        setReply(tx('Steht auf der Einkaufsliste.', 'It’s on the shopping list.'));
        // The partner is at the shop: the tick lands in your card first, then the quiet line below.
        later(1800, () => {
          demo.set((st) => ({ lists: st.lists.map((l) => (l.id !== DEMO.einkauf ? l : { ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.map((i) => (i.id === add[0].id ? { ...i, done: true, who: 'T' as const } : i)) })) })) }));
          haptics.select();
        });
        later(2400, () => {
          haptics.success();
          finish(tx(`${Bn} ist im Laden und hakt ab.`, `${Bn} is at the shop, ticking things off.`));
        });
      });
    }
  };

  // ── Copy ───────────────────────────────────────────────────────────────
  const line: string | null = (() => {
    if (reply) return reply;
    if (phase === 'think') return null;
    switch (step) {
      case 'hallo': return tx('Hallo, ich bin Memo. Euer Kalender, mit dem ihr einfach sprecht.', 'Hi, I’m Memo. Your calendar you simply talk to.');
      case 'namen': return magA ? (magB ? tx(`Schön, ${A} und ${B}!`, `Nice to meet you, ${A} and ${B}!`) : tx(`Hallo ${A}! Und mit wem teilst du den Kalender?`, `Hi ${A}! Who do you share the calendar with?`)) : tx('Wer seid ihr?', 'Who are you?');
      case 'termin': return tx(`Sag mir einen Termin, ${A}. So wie du es ${Bn} sagen würdest.`, `Tell me an appointment, ${A}. Like you’d tell ${Bn}.`);
      case 'verschieben': return tx('Hier ist er im Kalender. Etwas ändert sich? Sag es einfach.', 'Here it is in the calendar. Plans changed? Just say so.');
      case 'einkauf': return tx('Ich schreibe auch eure Einkaufsliste. Was fehlt?', 'I keep your shopping list too. What’s missing?');
      case 'fertig': return tx('Das war’s schon. Jetzt seid ihr dran.', 'That’s it. Your turn.');
    }
  })();
  const nextDay = ev ? addDays(ev.date, weekday(ev.date) === 5 ? 3 : 1) : addDays(TODAY, 2);
  const examples: Record<string, string[]> = {
    termin: [tx('Freitag 15 Uhr Zahnarzt', 'Friday 3pm dentist'), tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming')],
    verschieben: [tx(`Verschieb das auf ${wdLong(nextDay)} 10 Uhr`, `Move it to ${wdLong(nextDay)} at 10`), tx('Lieber einen Tag später', 'Make it a day later')],
    einkauf: [tx('Milch, Eier und Bananen', 'Milk, eggs and bananas'), tx('Wir brauchen Kaffee', 'We need coffee')],
  };
  const nextLabel: Record<string, string> = {
    termin: tx('Im Kalender ansehen', 'See it in the calendar'),
    verschieben: tx('Weiter zur Einkaufsliste', 'On to the shopping list'),
    einkauf: tx('Fertig', 'Done'),
  };
  const next: Record<Step, Step> = { hallo: 'namen', namen: 'termin', termin: 'verschieben', verschieben: 'einkauf', einkauf: 'fertig', fertig: 'fertig' };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: corner ? stageTop : 0, paddingBottom: bottom }}>
      {/* The real app, played with your names (try steps) */}
      {corner ? (
        <Animated.View key="stage" entering={FadeIn.duration(260)} style={{ flex: 1, overflow: 'hidden', marginBottom: 6 }}>
          <StoreContext.Provider value={demo}>
            <PersonsContext.Provider value={people}>
              <StillContext.Provider value>
                <View style={{ flex: 1, pointerEvents: 'none' } as any}>
                  {step === 'verschieben'
                    ? <CalendarStage key={calKey} />
                    : <ChatStage items={items} />}
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
        {TRY.has(step) && phase === 'wait' ? (
          <View key={`ex-${step}`} style={{ height: 36 }}>
            <ScrollView horizontal style={{ flexGrow: 0, height: 36 }} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {examples[step].map((ex) => (
              <PressScale key={ex} onPress={() => { haptics.select(); fillField(ex); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, justifyContent: 'center' }}>
                <Txt size={14.5} weight={500}>{ex}</Txt>
              </PressScale>
            ))}
            </ScrollView>
          </View>
        ) : null}
        {TRY.has(step) && phase !== 'done' ? (
          <View style={{ opacity: phase === 'think' ? 0.5 : 1 }} pointerEvents={phase === 'think' ? 'none' : 'auto'}>
            <TalkBar key={step} split card={navStyle() === 'strip'} onSend={send} spoken={examples[step]} placeholder={tx('Sprich oder schreib einfach …', 'Just say or type it …')} />
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
function ChatStage({ items }: { items: StageItem[] }) {
  const started = useRef(new Set(items.map((x) => x.id))).current;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, gap: 12 }}>
          {items.map((it) => (
            <Animated.View key={it.id} entering={started.has(it.id) ? undefined : rise()} exiting={rowOut} layout={rowLayout}>
              <Landing it={it} owner="J" today={TODAY} />
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
