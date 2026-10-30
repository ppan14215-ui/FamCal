/**
 * Der Dock (Julian 27.10.: "Voice input an jeder Stelle"). One talk field for
 * the whole app, drawn once at the root. It knows where you are: in the
 * calendar a sentence becomes a Termin or an answer, on a Termin it changes
 * that Termin, on a list it fills that list. Each time the orb thinks out
 * loud, the change happens behind the veil, and a drop flies to the spot
 * that changed. Questions and new Termine leave a small card above the field.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Platform, Pressable, BackHandler, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, interpolateColor, Easing } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Chip } from './ui/kit';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { Avatar, Pair, Owner } from './ui/Person';
import PressScale from './ui/PressScale';
import TalkBar from './TalkBar';
import { setVeil } from './Veil';
import { tokens, persons, springs } from '../theme';
import { useStore, actions, get } from '../state/store';
import { plan, splitItems, claudeSays, replyPlan, listFromClaude, asksNewList, thinksOnline, revisePlan, reviseOffline, draftOf, cutOff, addPicks, settleWork, clashLine, dishy, linkPlan, Ctx, Plan, Result, Said, SPOKEN, PLACEHOLDER } from '../lib/act';
import { canUnderstand, type Convo, type Glimpse } from '../lib/verstehen';
import { linkIn, recipeFromLink, keepRecipe, loadRecipes, type Recipe } from '../lib/rezepte';
import { onShared } from '../lib/shared';
import { dayLabel, slotLine, type Suggest } from '../lib/talk';
import { locate, light, lightOneByOne } from '../lib/landing';
import { setDockTop, setDockSpace } from '../lib/dockSpace';
import { useKeyboardInset, useTyping } from '../lib/keyboard';
import { setTalkOpen, useTalkOpen, setChatTabs, useChatTabs, chatBacks } from '../lib/talkOpen';
import { addMade, addMessage, addAsk, recentMade, markChanged } from '../lib/feed';
import { hm, short } from '../lib/dates';
import { Tile } from './ui/Clay';
import { haptics } from '../lib/haptics';
import type { CalEvent, Who } from '../state/types';
import { tx, quote, inLang, spokenLang, type Lang } from '../i18n/lang';
import { onToday } from '../screens/kalender/TodayView';

const STEP_MS = 850;
/** How long the family waits for Claude before the rules answer instead. */
const FIRST_MS = 12000;
/** "Termin · Friseur · Fr 30. Okt · 15:00", built while Claude is still writing. */
const glimpseLine = (g: Glimpse) => {
  const what = g.kind === 'termin' ? tx('Termin', 'Event') : g.kind === 'liste' ? (g.dish ? tx('Rezept', 'Recipe') : tx('Liste', 'List')) : g.kind === 'frage' ? tx('Frage', 'Question') : undefined;
  const parts = [what, g.kind === 'liste' ? g.dish : g.title, g.kind === 'termin' && g.date && /^\d{4}-\d{2}-\d{2}$/.test(g.date) ? short(g.date) : undefined, g.kind === 'termin' && g.start ? hm(g.start) : undefined];
  return parts.filter(Boolean).join(' · ');
};
/** Appears calmly, no spring or overshoot (Julian 28.10.: the bounce was too playful). */
const CALM = FadeIn.duration(200);
const TIMES = ['09:00', '10:30', '14:00', '16:00'];
/** "Wieder bei Salon Schnitt wie am 12. Okt?" (Julian 28.10.: the app builds on what you entered before). */
const againAt = (s: Suggest) => tx(`Wieder bei ${s.place} wie am ${short(s.date)}?`, `At ${s.place} again, like on ${short(s.date)}?`);
const newThought = (said: string) => said.trim().split(/\s+/).length > 6 || (/^\s*(wir|ich|du|ihr|er|sie|es|man|we|i|you|they|he|she)\b/i.test(said) && !/\b(geh\w*|übernehm\w*|mach\w*|fahr\w*|go|goes|take|takes|drive)\b/i.test(said));
const YES = /^\s*(ja|jo|genau|richtig|gerne|passt|yes|yeah|yep|sure|right)\b/i;
const NO = /^\s*(nein|nee|ne|nö|woanders|no|nope|somewhere else)\b/i;
/** Answers to "Wann?" to tap; speaking works just as well. */
const DAYS = () => [tx('Heute', 'Today'), tx('Morgen', 'Tomorrow'), tx('Übermorgen', 'Day after tomorrow'), tx('Nächste Woche', 'Next week')];

/** "Anders …" on every card (Julian 29.10.: when no choice fits there must be a way to say it). */
const Other = React.createContext<() => void>(() => {});

function Picks({ options }: { options: [string, () => void][] }) {
  const other = React.useContext(Other);
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 36 }}>
      {options.map(([label, f]) => <Chip key={label} height={36} onPress={f}>{label}</Chip>)}
      <Chip height={36} bg="transparent" color={tokens.sub} onPress={other}>{tx('Anders …', 'Something else …')}</Chip>
    </View>
  );
}
const shadow = Platform.select({
  web: { boxShadow: `0 0 0 1px ${tokens.hair}, 0 12px 32px rgba(22,35,42,.12)` } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, borderWidth: 1, borderColor: tokens.hair },
});

const gridShadow = Platform.select({
  web: { boxShadow: '0 8px 20px rgba(22,35,42,.22)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});

/** Where am I, and where does the dock sit there. */
function useWhere(): { ctx: Ctx; tab: boolean; lift: number; chat?: boolean } | null {
  const path = usePathname();
  const active = useStore((s) => s.activeList);
  // The family chat (Julian 29.10.): the field is always there, a sentence becomes a card in the log.
  if (path === '/chat') return { ctx: { kind: 'kalender' }, tab: false, lift: 0, chat: true };
  if (path === '/kalender' || path === '/eingang') return { ctx: { kind: 'kalender' }, tab: true, lift: 0 };
  if (path === '/listen') return { ctx: { kind: 'liste', id: active }, tab: true, lift: 0 };
  const t = path.match(/^\/termin\/(.+)$/);
  if (t) return { ctx: { kind: 'termin', id: decodeURIComponent(t[1]) }, tab: false, lift: 0 };
  // Above the "Liste anlegen" button.
  if (path === '/liste-neu') return { ctx: { kind: 'liste-neu' }, tab: false, lift: 74 };
  return null;
}

/** The two answers to a receipt: take it back, or it is fine. */
function Decide({ onUndo, onOk }: { onUndo: () => void; onOk: () => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <PressScale onPress={onUndo} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={15} weight={600}>{tx('Rückgängig', 'Undo')}</Txt>
      </PressScale>
      <PressScale onPress={onOk} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={15} weight={600} color={tokens.onInk}>{tx('Passt', 'Done')}</Txt>
      </PressScale>
    </View>
  );
}

/** The tick that opens every receipt. */
function Tick() {
  return (
    <Animated.View entering={CALM} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
      <LineIcon name="check" size={18} color={tokens.onInk} stroke={2.8} />
    </Animated.View>
  );
}

/**
 * Receipt for lists and tasks (Julian 27.10.: "es darf kein Zweifel bleiben,
 * was von der Maschine ausgeführt wird"): one sentence with exactly what was
 * done, who else sees it, and undo.
 */
function DoneCard({ text, sub, said, onUndo, onOk }: { text: string; sub?: string; said: string; onUndo?: () => void; onOk: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Tick />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={17} line={22} weight={600}>{text}</Txt>
          <Txt size={13} line={18} color={tokens.sub} numberOfLines={2}>{[sub, quote(said)].filter(Boolean).join(' ')}</Txt>
        </View>
      </View>
      <Decide onUndo={onUndo ?? onOk} onOk={onOk} />
    </View>
  );
}

const nextWho = (w: Who): Who => (w === 'J' ? 'T' : w === 'T' ? 'both' : 'J');

/** Receipt for a new Termin: what landed, every part tappable to fix it right here. */
function EventCard({ e, needsTime, ask, suggest, onSuggest, onAllDay, onUndo, onOk }: { e: CalEvent; needsTime?: boolean; ask?: string; suggest?: Suggest; onSuggest: (yes: boolean) => void; onAllDay: () => void; onUndo: () => void; onOk: () => void }) {
  const live = useStore((s) => s.events.find((x) => x.id === e.id));
  if (!live) return null;
  const pick = (w: Who) => { haptics.select(); actions.setEventWho(e.id, w); };
  const at = (t: string) => {
    haptics.select();
    const [h, m] = t.split(':').map(Number);
    actions.updateEvent(e.id, { start: t, end: `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`, allDay: false });
  };
  const open = () => router.push(`/termin/${e.id}`);
  const time = live.allDay ? tx('ganztägig', 'all day') : live.end ? tx(`${hm(live.start)} bis ${hm(live.end)}`, `${hm(live.start)} to ${hm(live.end)}`) : hm(live.start);
  const who = live.who === 'both' ? tx('Beide', 'Both') : live.who ? persons[live.who].name : null;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Animated.View entering={CALM}><Tile name={live.icon} size={52} radius={16} /></Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LineIcon name="check" size={13} color={tokens.done} stroke={2.8} />
            <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{tx('IM KALENDER EINGETRAGEN', 'ADDED TO THE CALENDAR')}</Txt>
          </View>
          <Txt size={19} line={24} weight={600} numberOfLines={2}>{live.title}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Chip height={36} onPress={open}>{dayLabel(live.date)}</Chip>
        {needsTime ? null : <Chip height={36} onPress={open}>{time}</Chip>}
        {who ? (
          <Chip height={36} bg={live.who === 'both' ? tokens.doneSoft : persons[live.who as 'J' | 'T'].tint} color={live.who === 'both' ? tokens.done : persons[live.who as 'J' | 'T'].ink} onPress={() => pick(nextWho(live.who))}>{who}</Chip>
        ) : null}
        {live.place ? <Chip height={36} onPress={open}>{live.place}</Chip> : null}
      </View>
      {suggest && !live.place ? (
        <View style={{ gap: 8 }}>
          <AppLine text={againAt(suggest)} sub={tx(`Das war bei „${suggest.title}“.`, `That was for “${suggest.title}”.`)} />
          <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 36 }}>
            <Chip height={36} bg={tokens.doneSoft} color={tokens.done} onPress={() => onSuggest(true)}>{tx('Ja', 'Yes')}</Chip>
            <Chip height={36} onPress={() => onSuggest(false)}>{tx('Nein', 'No')}</Chip>
          </View>
        </View>
      ) : null}
      {needsTime && live.allDay ? (
        <View style={{ gap: 8 }}>
          {/* Asked, not assumed (Julian 28.10.: "um wie viel Uhr ist das Spiel, oder ganztägig?"). Saying the time works too. */}
          <AppLine text={ask || tx('Um wie viel Uhr? Oder ganztägig?', 'What time? Or all day?')} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 36 }}>
            {TIMES.map((t) => <Chip key={t} height={36} onPress={() => at(t)}>{hm(t)}</Chip>)}
            <Chip height={36} onPress={onAllDay}>{tx('Ganztägig', 'All day')}</Chip>
          </View>
        </View>
      ) : null}
      {!live.who ? (
        <View style={{ gap: 6 }}>
          <Txt size={15} weight={600}>{tx('Wer geht?', 'Who\'s going?')}</Txt>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Chip icon={<Avatar p="J" size={18} />} onPress={() => pick('J')}>{persons.J.name}</Chip>
            <Chip icon={<Avatar p="T" size={18} />} onPress={() => pick('T')}>{persons.T.name}</Chip>
            <Chip icon={<Pair size={16} ring={tokens.chipBg} />} onPress={() => pick('both')}>{tx('Beide', 'Both')}</Chip>
          </View>
        </View>
      ) : null}
      <Decide onUndo={onUndo} onOk={onOk} />
    </Animated.View>
  );
}

function AnswerCard({ r }: { r: Extract<Result, { kind: 'answer' }>['reply'] }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt size={16} line={22}>{r.text}</Txt>
      {r.kind === 'answer' && r.slots?.length ? (
        <View style={{ gap: 6 }}>
          {r.slots.map((s) => (
            <View key={s.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pair size={18} ring={tokens.row} />
              <Txt size={15} weight={600} style={{ width: 92 }}>{dayLabel(s.date)}</Txt>
              <Txt size={15} color={tokens.sub}>{slotLine(s)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {r.kind === 'answer' && r.events?.length ? (
        <View style={{ gap: 6 }}>
          {r.events.map((e) => (
            <PressScale key={e.id} onPress={() => router.push(`/termin/${e.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Owner who={e.who} size={20} />
              <Txt size={15} weight={600} style={{ width: 92 }}>{`${dayLabel(e.date)}${e.allDay ? '' : ' ' + hm(e.start)}`}</Txt>
              <Txt size={15} color={tokens.sub} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
            </PressScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** One exchange on the card: what was said, and what the app answered or asked. */
type Line = { said: string; app?: string };

/**
 * The card as a short conversation (Julian 28.10.: "die Konversation müsste
 * weitergehen"). Your sentences on the right, the app's question under them.
 */
function Thread({ lines, cut }: { lines: Line[]; cut?: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      {lines.map((l, i) => {
        const open = cut && i === lines.length - 1;
        return (
          <View key={i} style={{ gap: 10 }}>
            <View style={{ alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: open ? tokens.chipBg : tokens.ink, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 13, paddingVertical: 9 }}>
              <Txt size={15} line={20} color={open ? tokens.sub : tokens.onInk}>{open ? `${l.said.replace(/[.…\s]+$/, '')} …` : l.said}</Txt>
            </View>
            {l.app ? <AppLine text={l.app} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function AppLine({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: tokens.doneSoft, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: tokens.done }} />
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
        <Txt size={16} line={21} weight={600}>{text}</Txt>
        {sub ? <Txt size={13} line={18} color={tokens.sub}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

function Quiet({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ height: 42, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={15} weight={600}>{label}</Txt>
    </PressScale>
  );
}

/**
 * A dish on the card (Julian 28.10.: "Bolognese kochen"): which recipe first,
 * then every ingredient ticked, tap what you already have, add the rest.
 */
/** Asked before a dish the family has a recipe for (Julian 28.10.). */
const keptLine = (k: Recipe) => (k.host ? tx(`Wieder euer Rezept von ${k.host}?`, `Your recipe from ${k.host} again?`) : tx(`Wieder euer Rezept ${k.name}?`, `Your ${k.name} recipe again?`));

function RecipeCard({ r, onVariant, onAdd, onSkip, onKept }: { r: Extract<Result, { kind: 'recipe' }>; onVariant: (v: string) => void; onAdd: (items: string[]) => void; onSkip: () => void; onKept: (yes: boolean) => void }) {
  const [off, setOff] = useState<Set<string>>(new Set());
  const flip = (x: string) => { haptics.select(); setOff((o) => { const n = new Set(o); if (n.has(x)) n.delete(x); else n.add(x); return n; }); };
  const take = r.picks.filter((x) => !off.has(x));
  if (r.kept) {
    return (
      <View style={{ gap: 10 }}>
        <AppLine text={keptLine(r.kept.recipe)} sub={tx(`${r.kept.recipe.name}, ${r.kept.recipe.ingredients.length} Zutaten`, `${r.kept.recipe.name}, ${r.kept.recipe.ingredients.length} ingredients`)} />
        <Picks options={[[tx('Ja', 'Yes'), () => onKept(true)], [tx('Nein, was anderes', 'No, something else'), () => onKept(false)]]} />
      </View>
    );
  }
  if (r.variants?.length) {
    return (
      <View style={{ gap: 10 }}>
        <AppLine text={r.question ?? ''} sub={tx('Tipp eins an oder sag es, zum Beispiel „klassisch für vier“.', 'Tap one or say it, for example “classic for four”.')} />
        <Picks options={r.variants.map((v) => [v, () => onVariant(v)] as [string, () => void])} />
        <Quiet label={tx('Abbrechen', 'Cancel')} onPress={onSkip} />
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <AppLine text={r.picks.length ? (r.from ? tx(`${r.dish}${r.from.servings ? `, ${r.from.servings}` : ''}: Was fehlt euch?`, `${r.dish}${r.from.servings ? `, ${r.from.servings}` : ''}: what do you need?`) : tx(`Für ${r.dish} noch dazu?`, `Also for ${r.dish}?`)) : tx(`Für ${r.dish} steht schon alles auf der Liste.`, `Everything for ${r.dish} is already on the list.`)} sub={r.picks.length ? tx('Tipp weg, was ihr schon habt.', 'Tap away what you already have.') : undefined} />
      {r.picks.length ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 36 }}>
          {r.picks.map((x) => {
            const on = !off.has(x);
            return (
              <Chip key={x} height={36} bg={on ? tokens.doneSoft : tokens.chipBg} color={on ? tokens.done : tokens.mute} icon={on ? <LineIcon name="check" size={13} color={tokens.done} stroke={2.6} /> : undefined} onPress={() => flip(x)}>{x}</Chip>
            );
          })}
        </View>
      ) : null}
      {r.have?.length ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingLeft: 36 }}>
          <Txt size={13} color={tokens.sub}>{tx('Habt ihr schon:', 'Already at home:')}</Txt>
          {r.have.map((x) => (
            <View key={x} style={{ height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.chipBg, justifyContent: 'center' }}>
              <Txt size={13} color={tokens.mute} strike>{x}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PressScale onPress={onSkip} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={15} weight={600}>{r.picks.length ? tx('Weglassen', 'Skip') : tx('Passt', 'Done')}</Txt>
        </PressScale>
        {r.picks.length ? (
          <PressScale onPress={() => onAdd(take)} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: take.length ? tokens.ink : tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={15} weight={600} color={take.length ? tokens.onInk : tokens.mute}>{tx(`${take.length} hinzufügen`, `Add ${take.length}`)}</Txt>
          </PressScale>
        ) : null}
      </View>
    </View>
  );
}

type Turn = { id: number; said: string; result: Result; lines: Line[] };

export default function Dock() {
  const where = useWhere();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const typing = useTyping();
  const { width: W, height: H } = useWindowDimensions();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [h, setH] = useState(0);
  const scroller = useRef<ScrollView>(null);
  /** Bumped to open the mic again after the card asks something, only if the last sentence was spoken. */
  const [listenKey, setListenKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const other = React.useCallback(() => { haptics.select(); setFocusKey((k) => k + 1); }, []);
  const spoke = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Counts sentences, so a slow answer for an older one never lands. */
  const heard = useRef(0);
  // What the app says back follows the language of the sentence (Julian 29.10.).
  const talkLang = useRef<Lang | null>(null);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(() => inLang(talkLang.current, f), ms));
  const path = usePathname();
  const talking = useTalkOpen();
  // On the tabs the field only shows after the bubble was tapped, or while a card is open (Julian 28.10.).
  const chatTabs = useChatTabs();
  const shown = where?.chat ? !chatTabs || !!turn : !where?.tab || talking || !!turn;
  /** Chat only: Eintragen makes cards, Nachricht just writes to the family. */
  const [mode, setMode] = useState<'card' | 'msg'>('card');
  // Back from the tabs with the black mic: listen right away, as on the other tabs.
  const backs = useRef(chatBacks());
  useEffect(() => { if (!chatTabs && chatBacks() !== backs.current) { backs.current = chatBacks(); setListenKey((k) => k + 1); } }, [chatTabs]);
  // The bubble opened the field: the mic starts right away.
  useEffect(() => { if (talking) setListenKey((k) => k + 1); }, [talking]);
  useEffect(() => {
    if (!talking) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setTalkOpen(false); setTurn(null); light(null); return true; });
    return () => sub.remove();
  }, [talking]);
  // Julian 28.10.: the black bubble grows to the left into the field, and shrinks back into it.
  const grow = useSharedValue(shown ? 1 : 0);
  const [mounted, setMounted] = useState(shown);
  useEffect(() => {
    if (!where?.tab) { grow.value = 1; setMounted(true); return; }
    if (shown) { setMounted(true); grow.value = withSpring(1, springs.smooth); }
    else grow.value = withTiming(0, { duration: 280, easing: Easing.bezier(0.4, 0, 0.6, 1) }, (f) => { if (f) scheduleOnRN(setMounted, false); });
  }, [shown, where?.tab]);
  const full = W - 28;
  const morph = useAnimatedStyle(() => ({
    width: interpolate(grow.value, [0, 1], [58, full]),
    backgroundColor: interpolateColor(grow.value, [0, 0.35], [tokens.ink, tokens.row]),
  }));
  const settle = useAnimatedStyle(() => ({ opacity: interpolate(grow.value, [0, 0.4, 1], [0.6, 1, 1]) }));

  // A card belongs to the screen it was made on.
  useEffect(() => { setTurn(null); }, [path]);
  useEffect(() => { setDockSpace(where && shown ? h + (where.tab ? 0 : 8) : 0); }, [h, !!where, shown]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Shared to FamCal from the browser or another app (Julian 28.10.): as if typed into the field.
  const hearRef = useRef<(raw: string) => void>(() => {});
  // A shared screenshot becomes a list offer (Julian 29.10.), never a list by itself.
  useEffect(() => onShared((text) => hearRef.current(text), (uri) => router.push({ pathname: '/bild-liste', params: { uri } })), []);

  // Examples only while the calendar is still empty; after that they are clutter (Julian 27.10.).
  const navTop = Math.max(insets.bottom, 12) + 10 + 58 + 10;
  // Typing hides the tabs, so the field drops into their place right above the keyboard.
  const bottom = !where ? 0 : kb > 0 ? kb + 8 : where.chat ? Math.max(insets.bottom, 12) + 10 : kb > 0 ? kb + 8 : where.tab && !typing && !(shown || mounted) ? navTop : where.tab ? Math.max(insets.bottom, 12) + 10 : insets.bottom + 12 + where.lift;
  useEffect(() => { setDockTop(where ? bottom + (shown ? h : 0) : 0); }, [bottom, h, !!where, shown]);

  if (!where) return null;
  const origin = { x: W - 14 - 6 - 24, y: H - bottom - 6 - 24 };
  // On tabs the nav stays on top of the fade, it starts just above it.
  // Above a footer button (liste-neu) the fade starts at the field, so the button stays clear.
  const fadeFrom = kb || (where.tab && (typing || shown)) ? 0 : where.tab ? navTop - 6 : where.lift ? bottom - 8 : 0;
  const kind = where.ctx.kind;

  const ask = () => { if (spoke.current) setListenKey((k) => k + 1); };
  /** Shows a card that waits for the next sentence; nothing changes in the calendar. */
  const hold = (said: string, result: Result, lines: Line[]) => {
    setVeil({ phase: 'off', onCancel: undefined });
    haptics.select();
    setTurn({ id: Date.now(), said, result, lines });
    ask();
  };

  const hear = (raw: string, how?: { voice?: boolean }) => {
    // One message, then back to Eintragen, so the next sentence is never lost as a plain message (Julian 29.10.).
    if (where.chat && mode === 'msg') { haptics.success(); addMessage(raw.trim()); setMode('card'); return; }
    // "Frag Sophia, ob Samstag passt": a Ja/Nein card for the partner, no AI needed (Julian 29.10.).
    if (where.chat && !turn && addAsk(raw)) { haptics.success(); return; }
    talkLang.current = spokenLang(raw);
    return inLang(talkLang.current, () => hearNow(raw, how));
  };
  const hearNow = (raw: string, how?: { voice?: boolean }) => {
    const open = turn;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    light(null);
    setTurn(null);
    spoke.current = !!how?.voice;
    const ctx = where.ctx;
    const n = ++heard.current;
    // After a cut-off sentence the new words carry on the old one.
    const said = open?.result.kind === 'cut' ? `${open.said.replace(/[.…\s]+$/, '')} ${raw}` : raw;
    // A Termin deleted meanwhile has nothing left to change: the sentence starts fresh.
    const gone = open?.result.kind === 'event' && !get().events.some((e) => e.id === (open.result as { event: CalEvent }).event.id);
    const before = open && open.result.kind !== 'cut' && (ctx.kind === 'kalender' || open.result.kind === 'recipe') && !gone ? open.lines : [];
    let lines: Line[] = [...before, { said }];
    loadRecipes();
    const link = linkIn(raw);
    if (link) return readLink(raw, link, n);
    if (cutOff(said)) return hold(said, { kind: 'cut' }, [{ said }]);
    if (open?.result.kind === 'recipe' && open.result.kept && raw.split(/\s+/).length <= 3 && (YES.test(raw) || NO.test(raw))) {
      setTurn(open);
      return answerKept(YES.test(raw), raw);
    }
    // "Ja" or "Nein" to "Wieder bei …?" needs no Claude.
    if (open?.result.kind === 'event' && open.result.suggest && raw.split(/\s+/).length <= 3 && (YES.test(raw) || NO.test(raw))) {
      setTurn(open);
      return answerSuggest(YES.test(raw), raw);
    }

    // A card is still open: the sentence answers or changes it (Julian 28.10.).
    const r0 = open?.result;
    const single = r0?.kind === 'event' ? r0.event : null;
    const many = r0?.kind === 'done' && r0.events?.length ? r0 : null;
    const follow = before.length > 0;
    if (follow && canUnderstand()) {
      const convo = { history: before, draft: single ? draftOf([single.id]) : many ? draftOf(many.events!) : undefined };
      think(said, n, (r) => {
        if (r?.kind === 'cut') return hold(said, { kind: 'cut' }, [{ said }]);
        if (single && r?.kind === 'added' && !r.more?.length) {
          const made = get().events.find((e) => e.id === single.id) ?? single;
          const p = revisePlan(made, r);
          if (p) return play(p, said, false, undefined, lines);
          return hold(said, { kind: 'event', event: made }, [...before, { said, app: tx('Das steht schon so drin.', "That's already how it is.") }]);
        }
        if (single && (!r || r.kind === 'unclear')) return play(reviseOffline(single.id, said), said, false, undefined, lines);
        // The new reading replaces what the card had made, unless Claude says it is something new (Julian 30.10.).
        const fresh = r?.kind === 'added' && r.follows === false;
        if (!fresh && (r?.kind === 'added' || r?.kind === 'liste')) {
          if (single) actions.removeEvent(single.id);
          if (many) many.undo?.();
        }
        land(r, said, lines);
      }, convo);
      return;
    }
    // Without Claude only short changes count as follow-ups; a new thought ("Wir sind seit Sonntag") starts fresh.
    if (follow && single && !newThought(said)) return play(reviseOffline(single.id, said), said, true, undefined, lines);
    if (follow && single) lines = [{ said }];

    const pending = r0?.kind === 'answer' && r0.reply.kind === 'ask' ? { title: r0.reply.title, who: r0.reply.who } : null;
    // Julian 30.10.: a sentence right after the last one may belong to it ("Jeden Mittwoch davon bin ich im Büro"). Claude decides.
    const recent = where.chat && !follow && !pending && thinksOnline(ctx, said, pending) ? recentMade() : null;
    if (recent) {
      const offline = () => play(plan(ctx, said, pending), said, false, undefined, lines);
      think(said, n, (r) => {
        if (r?.kind !== 'added' || !r.follows) return land(r, said, lines, offline);
        const old = recent.ids.map((id) => get().events.find((e) => e.id === id)).filter(Boolean) as CalEvent[];
        const p = replyPlan(r, new Set(recent.ids));
        // The old entries go only when the new ones land; one Rückgängig brings them back.
        play({ ...p, run: () => {
          old.forEach((e) => actions.removeEvent(e.id));
          markChanged(recent.entry.id);
          const out = p.run();
          const back = () => { old.forEach((e) => actions.addEvent(e)); markChanged(recent.entry.id, false); };
          const res = out.result;
          if (res?.kind === 'done') return { ...out, result: { ...res, undo: () => { res.undo?.(); back(); } } };
          if (res?.kind === 'event') return { ...out, lit: [res.event.id], result: { kind: 'done', text: tx(`„${res.event.title}“ geändert.`, `“${res.event.title}” changed.`), events: [res.event.id], undo: () => { actions.removeEvent(res.event.id); back(); } } };
          return out;
        } }, said, false, undefined, lines);
      }, { history: [{ said: recent.entry.said, app: recent.entry.text }], draft: draftOf(recent.ids), recent: true });
      return;
    }
    if (thinksOnline(ctx, said, pending)) {
      // Claude first (Julian 28.10.: the rules' half guess must never land).
      // A dish without Claude would become a strange Termin ("Wann ist Bolognese kochen?"): say so instead.
      const slow = () => hold(said, { kind: 'done', note: true, text: tx('Das Rezept konnte ich gerade nicht nachsehen. Sag es bitte gleich noch einmal.', "I couldn't look up the recipe just now. Please say it again in a moment.") }, lines);
      think(said, n, (r) => land(r, said, lines, dishy(said) ? slow : () => play(plan(ctx, said, pending), said, false, undefined, lines)));
      return;
    }
    play(plan(ctx, said, pending), said, true, undefined, lines);
  };
  hearRef.current = hear;

  /**
   * "Ich verstehe …" while Claude reads, with Halt. Only offline or after
   * FIRST_MS does the fallback answer (null).
   */
  const think = (said: string, n: number, then: (r: Said | null) => void, convo?: Convo) => {
    const stop = () => { if (heard.current === n) heard.current++; setVeil({ phase: 'off', onCancel: undefined }); haptics.select(); };
    setVeil({ phase: 'think', inline: !!where.chat, origin, target: null, lines: [tx('Ich verstehe …', 'Understanding …')], shown: 1, said, head: undefined, onCancel: stop });
    // Julian 28.10.: waiting is fine when you see what is happening. Each piece Claude has read shows up at once.
    const glimpse = (g: Glimpse) => { if (heard.current !== n) return; const l = glimpseLine(g); if (l) setVeil({ lines: [tx('Ich verstehe …', 'Understanding …'), l], shown: 2 }); };
    const late = new Promise<null>((r) => setTimeout(() => r(null), FIRST_MS));
    Promise.race([claudeSays(said, convo, glimpse), late]).then((r) => { if (heard.current === n) inLang(talkLang.current, () => then(r)); });
  };

  /** Whatever Claude made of it lands; cut off and unclear only open the card. */
  const land = (r: Said | null, said: string, lines: Line[], fallback?: () => void) => {
    if (!r) return fallback ? fallback() : hold(said, { kind: 'unclear', text: tx('Das habe ich nicht verstanden.', "I didn't get that.") }, lines);
    if (r.kind === 'cut') return hold(said, { kind: 'cut' }, [{ said }]);
    if (r.kind === 'unclear') return hold(said, { kind: 'unclear', text: r.text }, lines);
    // A list that does not exist yet is offered first, unless the sentence asked for it (Julian 29.10.).
    if (r.kind === 'liste' && r.list === 'neu' && !asksNewList(said)) return hold(said, { kind: 'newList', name: r.name || tx('Neue Liste', 'New list'), said: r }, lines);
    if (r.kind === 'liste') return play(listFromClaude(r, said, where.ctx.kind === 'liste' ? where.ctx.id : undefined), said, false, undefined, lines);
    play(replyPlan(r), said, false, undefined, lines);
  };

  const play = (p: Plan, said: string, fresh: boolean, after?: (out: ReturnType<Plan['run']>) => void, lines: Line[] = [{ said }]) => {
    const n = heard.current;
    // "Halt, anders": nothing has happened yet, so stopping leaves everything as it was.
    const stop = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (heard.current === n) heard.current++;
      setVeil({ phase: 'off', onCancel: undefined });
      haptics.select();
    };
    setVeil(fresh ? { phase: 'think', inline: !!where.chat, origin, target: null, lines: p.steps, shown: 0, said, head: p.head, onCancel: p.head ? stop : undefined } : { lines: p.steps, shown: 0, head: p.head, onCancel: p.head ? stop : undefined });
    p.steps.forEach((_, i) => later(450 + STEP_MS * i, () => { setVeil({ shown: i + 1 }); haptics.select(); }));
    later(450 + STEP_MS * p.steps.length + 150, () => {
      setVeil({ onCancel: undefined });
      const out = p.run();
      // In the chat the card lands in the log and we stay (Julian 29.10.).
      const r0 = out.result;
      if (where.chat && r0?.kind === 'event') addMade(said, [r0.event.id], undefined, () => actions.removeEvent(r0.event.id), undefined, { head: p.head, steps: p.steps });
      else if (where.chat && r0?.kind === 'done' && !r0.note) addMade(said, out.lit ?? (out.land ? [out.land] : []), r0.text, r0.undo, r0.events, { head: p.head, steps: p.steps });
      // A new Termin lands in the calendar; switch there first if we are elsewhere.
      const go = where.chat ? undefined : out.go ?? (out.result?.kind === 'event' ? '/kalender' : undefined);
      // Heute shows one week; a Termin further out lands in the list of days.
      if (!where.chat && out.result?.kind === 'event' && !onToday(out.result.event.date) && get().calView === 'heute') actions.setCalView('tag');
      if (go && go !== path) router.navigate(go as any);
      const finish = () => {
        // Each new row arrives on its own with a tick, then the receipt says what happened.
        const rows = out.lit?.length ? out.lit : out.land ? [out.land] : [];
        if (rows.length > 1) lightOneByOne(rows, (i) => (i === rows.length - 1 ? haptics.success() : haptics.select()));
        else { light(rows.length ? rows : null); haptics.success(); }
        if (out.result) later(rows.length > 1 ? 260 * rows.length : 120, () => {
          const res = out.result!;
          // A question goes under the sentence it answers, and the mic listens again for the answer.
          const asks = res.kind === 'answer' && res.reply.kind === 'ask';
          const offer = res.kind === 'event' ? [res.needsTime && res.event.allDay ? res.ask || tx('Um wie viel Uhr? Oder ganztägig?', 'What time? Or all day?') : '', res.suggest && !res.event.place ? againAt(res.suggest) : ''].filter(Boolean).join(' ') : '';
          const q = asks ? (res as { reply: { text: string } }).reply.text : res.kind === 'recipe' ? (res.kept ? keptLine(res.kept.recipe) : res.question) : offer || undefined;
          // The chat already shows the card; only a question stays above the field, for whoever asked.
          if (where.chat && !q && (res.kind === 'event' || (res.kind === 'done' && !res.note))) return;
          const all = q ? [...lines.slice(0, -1), { ...lines[lines.length - 1], app: q }] : lines;
          setTurn({ id: Date.now(), said, result: res, lines: all });
          if (q) ask();
        });
        after?.(out);
      };
      // The receipt covers the lower half, so whatever landed must sit above it.
      const band = { top: insets.top + 70, floor: H * 0.45, height: H };
      later(go && go !== path ? 380 : 90, () => {
        if (!out.land || where.chat) return setVeil({ phase: 'land', target: { x: W / 2, y: H - bottom - 110 }, onLanded: finish });
        locate(out.land, band, (target) => setVeil({ phase: 'land', target, onLanded: finish }));
      });
    });
  };

  const undo = () => {
    if (turn?.result.kind === 'event') actions.removeEvent(turn.result.event.id);
    if (turn?.result.kind === 'done') turn.result.undo?.();
    haptics.select();
    setTurn(null);
    light(null);
  };
  const ok = () => { haptics.select(); setTurn(null); light(null); setTalkOpen(false); };
  /** Doubled work (Julian 29.10.): Ersetzen swaps the old blocks, Beide keeps them. */
  const settleClash = (replace: boolean) => {
    if (turn?.result.kind !== 'workClash') return;
    const { incoming, old } = turn.result;
    const done = settleWork(incoming, old, replace);
    if (where.chat) addMade(turn.said, done.lit, done.text, done.undo, done.events);
    lightOneByOne(done.lit.slice(0, 12), (i) => (i === Math.min(12, done.lit.length) - 1 ? haptics.success() : haptics.select()));
    setTurn(where.chat ? null : { id: Date.now(), said: turn.said, lines: [], result: done });
  };
  /** Ja takes the earlier place, Nein just drops the question; either way the card stays for more. */
  const answerSuggest = (yes: boolean, said?: string) => {
    if (turn?.result.kind !== 'event' || !turn.result.suggest) return;
    const { event, suggest } = turn.result;
    haptics.select();
    if (yes) { actions.updateEvent(event.id, { place: suggest.place }); light(event.id); }
    const lines = said ? [...turn.lines, { said, app: yes ? tx(`Ort: ${suggest.place}.`, `Place: ${suggest.place}.`) : tx('Gut, ohne Ort.', 'Okay, no place.') }] : turn.lines;
    setTurn({ ...turn, id: said ? Date.now() : turn.id, lines, result: { ...turn.result, suggest: undefined } });
  };

  /** The ticked ingredients land on the shopping list, one receipt with undo for all. */
  const addRecipe = (r: Extract<Result, { kind: 'recipe' }>, items: string[]) => {
    if (!items.length) return ok();
    const kept = r.from;
    if (kept) keepRecipe(kept);
    const done = addPicks(r.dish, items);
    if (where.chat) addMade(turn?.said ?? r.dish, done.lit, done.text, () => { done.undo?.(); r.undo?.(); });
    const before = r.undo;
    lightOneByOne(done.lit, (i) => (i === done.lit.length - 1 ? haptics.success() : haptics.select()));
    setTurn({ id: Date.now(), said: turn?.said ?? '', lines: [], result: { kind: 'done', text: done.text, sub: done.sub, undo: () => { done.undo?.(); before?.(); } } });
  };

  /** Ja takes the family's recipe, Nein goes on with what Claude suggested (or which recipe). */
  const answerKept = (yes: boolean, said?: string) => {
    if (turn?.result.kind !== 'recipe' || !turn.result.kept) return;
    haptics.select();
    const r = turn.result;
    const k = r.kept!;
    const next: Result = yes ? { ...r, kept: undefined, variants: undefined, question: undefined, picks: k.picks, from: k.recipe } : { ...r, kept: undefined };
    const app = yes ? tx(`Gut, ${k.recipe.name}.`, `Okay, ${k.recipe.name}.`) : next.kind === 'recipe' && next.variants?.length ? next.question : undefined;
    const lines = said ? [...turn.lines, { said, app }] : turn.lines;
    setTurn({ ...turn, id: Date.now(), lines, result: next });
    if (app && !yes) ask();
  };

  /** A pasted or shared link: the server reads the recipe, the card offers its ingredients. */
  const readLink = (said: string, link: string, n: number) => {
    let host = link;
    try { host = new URL(link).hostname.replace(/^www\./, ''); } catch { /* shown as is */ }
    const stop = () => { if (heard.current === n) heard.current++; setVeil({ phase: 'off', onCancel: undefined }); haptics.select(); };
    setVeil({ phase: 'think', inline: !!where.chat, origin, target: null, lines: [tx(`Ich lese das Rezept auf ${host} …`, `Reading the recipe on ${host} …`)], shown: 1, said: host, head: undefined, onCancel: stop });
    const late = new Promise<null>((r) => setTimeout(() => r(null), 20000));
    Promise.race([recipeFromLink(link), late]).then((res) => {
      if (heard.current !== n) return;
      if (res && 'recipe' in res) return play(linkPlan(res.recipe), said, false, undefined, [{ said: host }]);
      const err = res && 'error' in res ? res.error : undefined;
      const why = !res ? tx('Die Seite hat zu lange gebraucht.', 'The page took too long.')
        : err === 'offline' ? tx('Rezeptlinks lese ich nur in der App mit Konto.', 'I can only read recipe links in the app with an account.')
        : err === 'limit' ? tx('Für heute sind die Sätze aufgebraucht, morgen geht es wieder.', "Today's sentences are used up, tomorrow it works again.")
        : err === 'no_recipe' ? tx('Auf der Seite habe ich kein Rezept gefunden.', "I couldn't find a recipe on that page.")
        : tx('Die Seite konnte ich nicht öffnen.', "I couldn't open that page.");
      setVeil({ phase: 'off', onCancel: undefined });
      haptics.select();
      setTurn({ id: Date.now(), said: host, result: { kind: 'done', text: why, note: true }, lines: [] });
    });
  };

  /** "Ganztägig" answers the time question; the Termin already is all day. */
  const allDay = () => {
    if (turn?.result.kind !== 'event') return;
    haptics.select();
    setTurn({ ...turn, result: { ...turn.result, needsTime: false } });
  };

  /** "Kalender oder Liste?" answered by a tap: the same sentence, now where it belongs. */
  const pickKind = (said: string, k: 'termin' | 'einkauf' | 'aufgaben') => {
    haptics.select();
    setTurn(null);
    ++heard.current;
    if (k === 'termin') return play(plan({ kind: 'kalender' }, said, null), said, true);
    play(listFromClaude({ kind: 'liste', list: k, items: k === 'einkauf' ? splitItems(said) : [said] }), said, true);
  };

  if (!shown && !mounted) return null;
  if (where.chat && !shown) return null;
  return (
    <Other.Provider value={other}>
    {/* A tap beside the field brings the tabs back, as long as no card waits for an answer. */}
    {where.tab && !turn ? <Pressable accessibilityLabel={tx('Schließen', 'Close')} onPress={() => setTalkOpen(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
    {/* The screen fades out under the field, so prompts never sit on text. */}
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: fadeFrom, height: bottom - fadeFrom + h + 28 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="dockfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.bg} stopOpacity={0} />
            <Stop offset={String(Math.min(0.5, 40 / (bottom - fadeFrom + h + 28)))} stopColor={tokens.bg} stopOpacity={0.94} />
            <Stop offset="1" stopColor={tokens.bg} stopOpacity={0.98} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dockfade)" />
      </Svg>
    </View>
    <View pointerEvents="box-none" onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: where.chat ? 14 : 18, right: where.chat ? 14 : 18, bottom, gap: 10 }}>
      {turn ? (
        <Animated.View key={turn.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[{ maxHeight: 420, borderRadius: 26, backgroundColor: tokens.row }, shadow]}>
          <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ padding: 18, gap: 12 }} showsVerticalScrollIndicator={false}>
            {turn.result.kind === 'cut' ? (
              <>
                <Thread lines={turn.lines} cut />
                <AppLine text={tx('Ich höre weiter zu.', "I'm still listening.")} sub={tx('Was du jetzt sagst, hänge ich an.', "What you say next, I'll add on.")} />
                <Quiet label={tx('Abbrechen', 'Cancel')} onPress={ok} />
              </>
            ) : turn.result.kind === 'workClash' ? (
              <>
                <Thread lines={turn.lines} />
                <AppLine text={clashLine(turn.result.old)} sub={tx('Was soll ich machen?', 'What should I do?')} />
                <Picks options={[
                  [tx('Ersetzen', 'Replace'), () => settleClash(true)],
                  [tx('Beide behalten', 'Keep both'), () => settleClash(false)],
                ]} />
                <Quiet label={tx('Abbrechen', 'Cancel')} onPress={ok} />
              </>
            ) : turn.result.kind === 'newList' ? (
              <>
                <Thread lines={turn.lines} />
                <AppLine text={tx(`Eine Liste „${turn.result.name}“ gibt es noch nicht. Soll ich sie anlegen?`, `There is no “${turn.result.name}” list yet. Shall I create it?`)} sub={turn.result.said.items.length ? tx(`Mit ${turn.result.said.items.join(', ')}.`, `With ${turn.result.said.items.join(', ')}.`) : undefined} />
                <Picks options={[
                  [tx('Ja, anlegen', 'Yes, create it'), () => { const r = (turn.result as Extract<Result, { kind: 'newList' }>).said; const said = turn.said; haptics.select(); setTurn(null); ++heard.current; play(listFromClaude(r, said), said, true); }],
                  [tx('Nein', 'No'), ok],
                ]} />
              </>
            ) : turn.result.kind === 'unclear' ? (
              <>
                <Thread lines={turn.lines} />
                <AppLine text={turn.result.text} sub={tx('Tipp an, wohin es gehört, oder sag es nochmal anders.', 'Tap where it belongs, or say it another way.')} />
                <Picks options={[
                  [tx('Termin', 'Event'), () => pickKind(turn.said, 'termin')],
                  [tx('Einkaufsliste', 'Shopping list'), () => pickKind(turn.said, 'einkauf')],
                  [tx('Aufgabe', 'Task'), () => pickKind(turn.said, 'aufgaben')],
                ]} />
                <Quiet label={tx('Abbrechen', 'Cancel')} onPress={ok} />
              </>
            ) : turn.result.kind === 'recipe' ? (
              <>
                <Thread lines={turn.lines} />
                {turn.result.added ? <AppLine text={turn.result.added} /> : null}
                <RecipeCard r={turn.result} onVariant={(v) => hear(v)} onAdd={(items) => addRecipe(turn.result as Extract<Result, { kind: 'recipe' }>, items)} onSkip={ok} onKept={(yes) => answerKept(yes)} />
              </>
            ) : turn.result.kind === 'answer' && turn.result.reply.kind === 'ask' ? (
              <>
                <Thread lines={turn.lines} />
                <Picks options={DAYS().map((d) => [d, () => hear(d)] as [string, () => void])} />
                <Quiet label={tx('Abbrechen', 'Cancel')} onPress={ok} />
              </>
            ) : turn.result.kind === 'answer' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Txt size={14} line={20} color={tokens.sub} style={{ flex: 1 }}>{quote(turn.said)}</Txt>
                  <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={10} onPress={ok}>
                    <LineIcon name="x" size={18} color={tokens.mute} />
                  </PressScale>
                </View>
                <AnswerCard r={turn.result.reply} />
              </>
            ) : (
              <>
                {/* After a follow-up the card shows the conversation that led here. */}
                {turn.lines.length > 1 ? <Thread lines={turn.lines} /> : null}
                {turn.result.kind === 'event' ? (
                  <EventCard e={turn.result.event} needsTime={turn.result.needsTime} ask={turn.result.ask} suggest={turn.result.suggest} onSuggest={answerSuggest} onAllDay={allDay} onUndo={undo} onOk={ok} />
                ) : turn.result.kind === 'done' && turn.result.note ? (
                  <View style={{ gap: 10 }}>
                    <AppLine text={turn.result.text} sub={turn.said} />
                    <Quiet label={tx('Okay', 'Okay')} onPress={ok} />
                  </View>
                ) : turn.result.kind === 'done' ? (
                  <DoneCard text={turn.result.text} sub={turn.result.sub} said={turn.lines.length > 1 ? '' : turn.said} onUndo={turn.result.undo ? undo : undefined} onOk={ok} />
                ) : null}
              </>
            )}
          </ScrollView>
        </Animated.View>
      ) : null}
      {where.chat ? (
        <View accessibilityRole="radiogroup" style={{ alignSelf: 'flex-start', flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: tokens.segBg }}>
          {(['card', 'msg'] as const).map((m) => (
            <PressScale key={m} accessibilityRole="radio" accessibilityState={{ checked: mode === m }} onPress={() => { haptics.select(); setMode(m); }} style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: mode === m ? tokens.row : 'transparent' }}>
              <Txt size={13.5} weight={mode === m ? 600 : 400} color={mode === m ? tokens.ink : tokens.sub}>{m === 'card' ? tx('Eintragen', 'Add') : tx('Nachricht', 'Message')}</Txt>
            </PressScale>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Animated.View style={[{ alignSelf: 'flex-end', alignItems: 'flex-end', overflow: 'hidden', borderRadius: 30 }, where.tab ? morph : { width: where.chat ? W - 28 - 56 : full }]}>
      <Animated.View style={[{ width: where.chat ? W - 28 - 56 : full }, where.tab ? settle : null]}>
      <TalkBar
        key={where.chat ? 'chat' : kind}
        split={where.chat}
        onClose={where.tab ? () => { setTalkOpen(false); setTurn(null); light(null); } : undefined}
        onSend={hear}
        onPlus={() => router.push('/neu')}
        spoken={SPOKEN[kind]}
        listenKey={listenKey}
        focusKey={focusKey}
        placeholder={where.chat && mode === 'msg' ? tx('Nachricht an die Familie …', 'Message to the family …') : turn?.result.kind === 'cut' ? tx('Sprich einfach weiter …', 'Just keep talking …') : where.chat ? tx('Sprich oder schreib einfach …', 'Just say or type it …') : turn && kind === 'kalender' ? tx('Antworten oder ergänzen …', 'Reply or add …') : PLACEHOLDER[kind]}
      />
      </Animated.View>
      </Animated.View>
      {where.chat ? (
        <PressScale accessibilityLabel={tx('Kalender und Listen zeigen', 'Show calendar and lists')} onPress={() => { haptics.select(); setTurn(null); light(null); setChatTabs(true); }} style={[{ width: 48, height: 48, marginBottom: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }, gridShadow]}>
          <LineIcon name="grid" size={22} color={tokens.onInk} />
        </PressScale>
      ) : null}
      </View>
    </View>
    </Other.Provider>
  );
}
