/**
 * The story onboarding (Julian 11.11.2026, x.com/jacobrodri_/status/2120150681256628702: "adopt this
 * onboarding concept with our apps content and mascot"; 22:51: "mit unserem neuen Maskottchen"; 23:13:
 * check it against the X collection, the vault and what Namore taught us, "muss sofort überzeugen").
 *
 * What the check changed (v2):
 * - Namore, decision 08.11.2026: the longer personal onboarding finished as often as the short one but sold
 *   half as well (purchase starts 3.9 % vs 7.3 %). Judge by what people do after, never by completion.
 *   So: three questions, each one changes what you see next (names, examples, the words). No question
 *   whose answer changes nothing, no invented curve, no staged loading bar, no streak promise.
 * - Vault (famcal-onboarding-inspo-design-2026-11-02): do the core action for real before anything is asked
 *   of you; examples to tap; the sentence becomes the card; the partner's notification is the permission
 *   ask; account and invite after the aha; end on a concrete result, not "You're all set".
 * - @ereniroh (X collection): questions only build excitement when they are what the user came for. A family
 *   came to say an appointment and have it in. That is the middle of this flow now.
 * - Julian 23:18: Pin walking into the input bar is how people learn that tapping him starts speaking. He
 *   flies there in the try step, in plain sight, and a small label names it.
 *
 * Steps: peek · welcome · intro (lines type themselves) · name · partner · familie · nervt · confirm ·
 * probe (say your next appointment in the real input, the card lands, the partner sees it, reminders) ·
 * fertig (your family and your first appointment) · sign-in sheet · Plus.
 * No network here: the offline rules read the sentence (talk.understand); no assistant call without an account.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Keyboard, useWindowDimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, useReducedMotion, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Btn, TextLink } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import PressScale from '../../src/components/ui/PressScale';
import { ClayIcon } from '../../src/components/ui/Clay';
import type { ClayName } from '../../src/lib/clayIcons';
import type { Pose } from '../../src/components/onboarding/Mascot';
import LiveMemo, { BIG } from '../../src/components/onboarding/LiveMemo';
import SignInSheet from '../../src/components/onboarding/SignInSheet';
import KlarTalk from '../../src/components/onboarding/KlarTalk';
import AgendaView from '../../src/screens/kalender/AgendaView';
import { navH, klarFoot } from '../../src/components/NavBar';
import { light, locate } from '../../src/lib/landing';
import { StoreContext, createStore, type Store } from '../../src/state/store';
import { PersonsContext, type Persons } from '../../src/components/ui/Person';
import { StillContext } from '../../src/components/ChatCards';
import { buildDemoState, demoEvents } from '../../src/data/demoFamily';
import { buddyJoy, buddyPoke, setBuddy, useBuddy } from '../../src/lib/buddy';
import { understand } from '../../src/lib/talk';
import type { CalEvent } from '../../src/state/types';
import { TODAY, addDays, weekday, WD_LONG, hm, dmShort, daysBetween } from '../../src/lib/dates';
import { tokens, persons as appPersons } from '../../src/theme';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';
import { LIVE } from '../../src/lib/live';
import { getAuth } from '../../src/lib/auth';
import { setPref } from '../../src/lib/prefs';
import { isPreview } from '../../src/lib/vorschau';
import { startNotifications } from '../../src/lib/notify';
import { stepViewed, onboardingDone } from '../../src/lib/funnel';
import { useKeyboardInset, useTyping } from '../../src/lib/keyboard';
import { useSpeak, speakOpen } from '../../src/lib/speak';
import { useBarMode } from '../../src/lib/navStyle';
import { forceMascot } from '../../src/lib/mascot';

/** The mascot's name on screen; one place to change it. */
const NAME = 'Memo';

type Step = 'peek' | 'welcome' | 'intro' | 'name' | 'partner' | 'familie' | 'nervt' | 'confirm' | 'probe' | 'fertig';
const STEPS: Step[] = ['peek', 'welcome', 'intro', 'name', 'partner', 'familie', 'nervt', 'confirm', 'probe', 'fertig'];
/** The steps that show the progress bar. */
const BAR_LIST: Step[] = ['name', 'partner', 'familie', 'nervt', 'confirm', 'probe'];

type Opt = { key: string; icon: ClayName; de: string; en: string };
const FAMILIE: Opt[] = [
  { key: 'zwei', icon: 'herz', de: 'Wir zwei', en: 'The two of us' },
  { key: 'kinder', icon: 'kinderwagen', de: 'Wir mit Kind oder Kindern', en: 'Us with a kid or kids' },
  { key: 'baby', icon: 'ultraschall', de: 'Wir erwarten ein Baby', en: 'We are expecting a baby' },
  { key: 'patchwork', icon: 'gruppe', de: 'Patchwork, mehrere Haushalte', en: 'Patchwork, several homes' },
];
const NERVT: Opt[] = [
  { key: 'vergessen', icon: 'frist', de: 'Termine gehen unter', en: 'Appointments slip through' },
  { key: 'abholen', icon: 'auto', de: 'Wer holt wen wann ab?', en: 'Who picks up whom, when?' },
  { key: 'einkauf', icon: 'einkauf', de: 'Doppelt oder gar nicht eingekauft', en: 'Bought twice or not at all' },
  { key: 'kochen', icon: 'kochtopf', de: 'Was kochen wir heute?', en: 'What do we cook today?' },
  { key: 'kopf', icon: 'gluehbirne', de: 'Einer hat alles im Kopf', en: 'One of us keeps it all in mind' },
  { key: 'kita', icon: 'kita', de: 'Kita, Schule, Elternabende', en: 'Daycare, school, parent evenings' },
];
/** What you can say in the try step: it fits the family you told me about. */
const SAG: Record<string, [string, string][]> = {
  kinder: [['Freitag 16 Uhr Kinderarzt', 'Friday 4pm pediatrician'], ['Dienstag 19 Uhr Elternabend', 'Tuesday 7pm parents’ evening'], ['Samstag 10 Uhr Schwimmkurs', 'Saturday 10am swim class']],
  baby: [['Donnerstag 9 Uhr Hebamme', 'Thursday 9am midwife'], ['Mittwoch 14 Uhr Ultraschall', 'Wednesday 2pm ultrasound'], ['Samstag 11 Uhr Kinderwagen abholen', 'Saturday 11am pick up the stroller']],
  zwei: [['Freitag 19 Uhr Essen mit Freunden', 'Friday 7pm dinner with friends'], ['Montag 8 Uhr Zahnarzt', 'Monday 8am dentist'], ['Samstag 10 Uhr Wocheneinkauf', 'Saturday 10am weekly shop']],
};
const label = (o: Opt) => tx(o.de, o.en);
// Within a week the weekday says it; further out the date belongs to it ("Donnerstag, 24. Dez, 16:00").
const whenOf = (e: CalEvent) => `${WD_LONG[weekday(e.date)]}${daysBetween(TODAY, e.date) > 6 ? `, ${dmShort(e.date)}` : ''}${e.allDay ? '' : `, ${hm(e.start)}`}`;

const out = Easing.bezier(0.23, 1, 0.32, 1);
/** Text first, then what it is about: rises 12 pt, the second thing 120 ms later (film motion rule 2). */
function Rise({ delay = 0, style, children }: { delay?: number; style?: any; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { k.value = withDelay(delay, withTiming(1, { duration: 260, easing: out })); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * 12 }] }));
  // A plain transform, not a layout animation: those leave the flow on web and can overlap what follows.
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Where Memo sits in each step. One Memo for the whole onboarding: he travels from seat to seat, he is never cut. */
type Seat = 'boot' | 'peek' | 'welcome' | 'intro' | 'names' | 'ask' | 'confirm';
const SEAT_OF: Record<Step, Seat> = { peek: 'peek', welcome: 'welcome', intro: 'intro', name: 'names', partner: 'names', familie: 'ask', nervt: 'ask', confirm: 'confirm', probe: 'ask', fertig: 'ask' };
/** The room the footer always keeps: the button and one line for a link, so the button never moves between steps. */
const FOOT_H = 10 + 50 + 12 + 22;

export default function Story() {
  const q = useLocalSearchParams<{ step?: string; signin?: string }>();
  const start = (STEPS as string[]).includes(q.step ?? '') ? (q.step as Step) : 'peek';
  const [step, setStep] = useState<Step>(start);
  const [name, setName] = useState('');
  const [partner, setPartner] = useState('');
  const [familie, setFamilie] = useState<string | null>(null);
  const [nervt, setNervt] = useState<string[]>([]);
  const [ev, setEv] = useState<CalEvent | null>(null);
  /** Where Memo is in the try step: in the avatar slot, in the bar, or back in the slot once the card landed. */
  const [docked, setDocked] = useState(false);
  const [signIn, setSignIn] = useState(!!q.signin);
  /** He comes up from below the edge once, at the very start. */
  const [risen, setRisen] = useState(start !== 'peek');
  const [typed, setTyped] = useState(false);
  const [look, setLook] = useState<{ x: number; y: number; n: number } | undefined>();
  const [pose, setPose] = useState<Pose>('rest');
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const kb = useKeyboardInset();
  const me = name.trim();
  const du = partner.trim();

  // The onboarding always has Memo, also on a phone that saved the plain mic.
  useEffect(() => { forceMascot('pin'); return () => forceMascot(null); }, []);
  useEffect(() => { stepViewed(step, 'story', STEPS.indexOf(step)); }, [step]);
  // What he does when he arrives in a step.
  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    setPose(step === 'peek' ? 'peek' : 'rest');
    if (step === 'peek') {
      t.push(setTimeout(() => setRisen(true), 60));
      t.push(setTimeout(() => setLook({ x: 0, y: -0.5, n: Date.now() }), 900));
      t.push(setTimeout(() => { haptics.tap(); buddyPoke(); }, 1300));
      t.push(setTimeout(() => setStep((s) => (s === 'peek' ? 'welcome' : s)), 1900));
    }
    // Hello once he has arrived in the middle, and again when he says you are not alone.
    if (step === 'welcome' || step === 'confirm') t.push(setTimeout(() => setPose('wave'), 620));
    if (step === 'intro') setTyped(false);
    return () => t.forEach(clearTimeout);
  }, [step]);

  const go = (s?: Step) => {
    haptics.tap();
    const next = s ?? STEPS[STEPS.indexOf(step) + 1];
    if (!next) return;
    // The keyboard stays up from your name to your partner's, and goes when the choices come.
    if (next !== 'name' && next !== 'partner') Keyboard.dismiss();
    setStep(next);
  };
  const back = () => {
    const p = STEPS[STEPS.indexOf(step) - 1];
    if (!p) return;
    haptics.select(); setDocked(false);
    if (p !== 'name' && p !== 'partner') Keyboard.dismiss();
    setStep(p);
  };
  const finish = () => {
    haptics.success();
    setPref('obName', me);
    if (du) setPref('obPartner', du);
    if (ev && !isPreview()) setPref('obEvent', JSON.stringify(ev));
    onboardingDone('story');
    if (LIVE && !getAuth().session && !isPreview()) setSignIn(true);
    else if (!LIVE && !isPreview()) router.replace('/onboarding/eltern');
    else router.replace('/plus?trigger=onboarding');
  };
  const toggle = (k: string) => {
    haptics.select();
    setNervt(nervt.includes(k) ? nervt.filter((x) => x !== k) : [...nervt, k]);
    buddyPoke();
  };

  const barI = BAR_LIST.indexOf(step);
  const basePad = Math.max(insets.bottom, 16);
  // The footer rides up with the keyboard, gliding (the keyboard reports late on Android; a jump there reads as a hitch).
  const lift = useSharedValue(0);
  useEffect(() => { lift.value = withTiming(kb ? Math.max(0, kb - Math.max(insets.bottom, 0)) : 0, { duration: 200, easing: out }); }, [kb]);
  const footSt = useAnimatedStyle(() => ({ paddingBottom: basePad + lift.value }));

  // Memo's seats, as the middle of his box in window coordinates and his size there.
  const top0 = insets.top;
  const sPeek = Math.min(W * 1.05, 460), sWel = Math.min(W * 0.5, 210), sIntro = Math.min(W * 0.6, 280), sConf = Math.min(W * 0.56, 240);
  const yBig = Math.round(H * 0.33);
  const seats: Record<Seat, { x: number; y: number; s: number }> = {
    boot: { x: W / 2, y: H + sPeek / 2 + 40, s: sPeek },
    peek: { x: W / 2, y: H - sPeek * 0.08, s: sPeek },
    welcome: { x: W / 2, y: yBig, s: sWel },
    intro: { x: W / 2, y: H - basePad - FOOT_H - 6 - sIntro / 2, s: sIntro },
    names: { x: W / 2, y: top0 + 52 + 26 + 48, s: 96 },
    ask: { x: 20 + 30, y: top0 + 52 + 6 + 6 + 30, s: 60 },
    confirm: { x: W / 2, y: yBig, s: sConf },
  };
  const seat: Seat = step === 'peek' && !risen ? 'boot' : SEAT_OF[step];
  const at = seats[seat];
  const hero = { x: W / 2, y: insets.top + Math.max(196, Math.round(H * 0.26)) };
  const val = step === 'name' ? name : partner;
  const gaze = step === 'intro' ? { x: -0.4, y: -0.75 }
    : seat === 'names' ? { x: Math.min(0.7, -0.3 + val.length * 0.08), y: 0.75 }
      : step === 'familie' || step === 'nervt' ? { x: 0.6, y: 0.1 } : null;
  const mood = step === 'fertig' || step === 'confirm' ? 'happy' as const : (step === 'intro' && !typed) || (seat === 'names' && !!val) ? 'type' as const : undefined;

  let body: React.ReactNode = null;
  let foot: { label: string; onPress: () => void; disabled?: boolean; link?: { label: string; onPress: () => void } } | null = null;
  switch (step) {
    case 'peek':
      body = <Pressable style={{ flex: 1 }} onPress={() => go('welcome')} accessibilityLabel={tx('Weiter', 'Next')} />;
      break;
    case 'welcome':
      body = <Welcome top={at.y + at.s / 2 - top0 - 8 + 18} />;
      foot = { label: tx('Los geht’s', 'Let’s go'), onPress: () => go(), link: { label: tx('Ich wurde eingeladen', 'I was invited'), onPress: () => (LIVE && !isPreview() ? setSignIn(true) : go()) } };
      break;
    case 'intro':
      body = <Intro onTyped={() => setTyped(true)} lines={[tx(`Hey, ich bin ${NAME}!`, `Hey, I’m ${NAME}!`), tx('Sag mir, was ansteht. Ich trage es ein und denke für euch mit.', 'Tell me what’s coming up. I add it and think along for you.')]} />;
      foot = { label: tx('Weiter', 'Next'), onPress: () => go() };
      break;
    case 'name':
    case 'partner': {
      const p = step === 'partner';
      body = (
        <Names
          which={step}
          value={val}
          onChange={p ? setPartner : setName}
          onSubmit={() => (p ? du : me) && go()}
          title={p ? (me ? tx(`Schön, ${me}! Wer plant mit dir?`, `Nice to meet you, ${me}! Who plans with you?`) : tx('Wer plant mit dir?', 'Who plans with you?')) : tx('Wie soll ich dich nennen?', 'What should I call you?')}
          placeholder={p ? tx('z. B. Sophia', 'e.g. Sophia') : tx('Dein Name', 'Your name')}
        />
      );
      foot = { label: tx('Weiter', 'Next'), disabled: p ? !du : !me, onPress: () => go(), link: p ? { label: tx('Überspringen', 'Skip'), onPress: () => { setPartner(''); go(); } } : undefined };
      break;
    }
    case 'familie':
      body = <Ask say={du ? tx(`Und wer gehört zu dir und ${du}?`, `And who belongs to you and ${du}?`) : tx('Wer gehört zu eurer Familie?', 'Who’s in your family?')}>{FAMILIE.map((o) => <Choice key={o.key} o={o} on={familie === o.key} onPress={() => { haptics.select(); setFamilie(o.key); buddyPoke(); }} />)}</Ask>;
      foot = { label: tx('Weiter', 'Next'), disabled: !familie, onPress: () => go() };
      break;
    case 'nervt':
      body = <Ask say={tx('Was nervt euch beim Planen am meisten?', 'What bugs you most about planning?')} hint={tx('Mehrere möglich', 'Pick any')}>{NERVT.map((o) => <Choice key={o.key} o={o} multi on={nervt.includes(o.key)} onPress={() => toggle(o.key)} />)}</Ask>;
      foot = { label: tx('Weiter', 'Next'), disabled: !nervt.length, onPress: () => go() };
      break;
    case 'confirm': {
      const n = NERVT.find((o) => o.key === nervt[0]);
      body = (
        <Big
          top={at.y + at.s / 2 - top0 - 52 + 18}
          title={tx('Damit seid ihr nicht allein.', 'You’re not alone with that.')}
          sub={n ? tx(`„${n.de}“ muss nicht mehr sein. Genau dafür bin ich da.`, `“${n.en}” doesn’t have to happen anymore. That’s what I’m here for.`) : tx('Genau dafür bin ich da.', 'That’s what I’m here for.')}
        />
      );
      foot = { label: tx('Zeig’s mir', 'Show me'), onPress: () => go() };
      break;
    }
    case 'probe':
      body = <Probe me={me} du={du} familie={familie} ev={ev} setEv={setEv} docked={docked} setDocked={setDocked} pad={basePad} onDone={() => go('fertig')} />;
      break;
    case 'fertig':
      body = <Fertig me={me} du={du} ev={ev} nervt={nervt} top={hero.y + BIG / 2} cx={hero.x} cy={hero.y - insets.top - 8} />;
      foot = { label: tx('Sichern und loslegen', 'Save and get started'), onPress: finish };
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {barI >= 0 ? <Bar i={barI} n={BAR_LIST.length} onBack={back} /> : <View style={{ height: 8 }} />}
      {/* The old page is gone before the new one comes (no two pages through each other); Memo travels across the gap.
          Your name and your partner's are one page: the field and the keyboard stay. */}
      <Animated.View key={step === 'partner' ? 'name' : step} entering={FadeIn.delay(90).duration(240)} exiting={FadeOut.duration(90)} style={{ flex: 1 }}>
        {body}
      </Animated.View>
      {foot ? (
        <Rise delay={step === 'welcome' ? 760 : 0}>
          <Animated.View style={[{ paddingHorizontal: 20, paddingTop: 10, gap: 12 }, footSt]}>
            <Btn label={foot.label} disabled={foot.disabled} onPress={foot.onPress} />
            <View style={{ height: 22, justifyContent: 'center' }}>
              {foot.link ? <TextLink label={foot.link.label} weight={400} onPress={foot.link.onPress} /> : null}
            </View>
          </Animated.View>
        </Rise>
      ) : null}
      {/* One Memo from the first second to the last: up from the edge, to the middle, down beside the words, into the
          bar, back out, then up to celebrate. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: signIn ? 0 : 1 }}>
        <LiveMemo
          calm
          place={step === 'fertig' ? 'hero' : step === 'probe' && docked ? 'dock' : 'mid'}
          hero={hero}
          mid={at}
          midScale={at.s / BIG}
          moveKey={seat}
          moveMs={seat === 'peek' ? 760 : 580}
          look={look}
          gaze={gaze}
          mood={mood}
          pose={pose === 'rest' ? undefined : pose}
        />
      </View>
      {signIn ? <SignInSheet from="story" partner={du || undefined} onClose={() => setSignIn(false)} /> : null}
    </View>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────

function Bar({ i, n, onBack }: { i: number; n: number; onBack: () => void }) {
  const w = useSharedValue((i + 1) / n);
  useEffect(() => { w.value = withTiming((i + 1) / n, { duration: 420, easing: out }); }, [i]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
      <PressScale onPress={onBack} hitSlop={10} accessibilityLabel={tx('Zurück', 'Back')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <LineIcon name="back" size={22} color={tokens.ink} />
      </PressScale>
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: tokens.segBg, overflow: 'hidden', marginRight: 24 }}>
        <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: tokens.done }, st]} />
      </View>
    </View>
  );
}

/** Text that types itself. */
function Typer({ text, size, line, weight = 700, delay = 0, onDone, center }: { text: string; size: number; line: number; weight?: 400 | 600 | 700; delay?: number; onDone?: () => void; center?: boolean }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) { onDone?.(); return; }
    setN(0);
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setN(i);
      if (i < text.length) t = setTimeout(tick, /[.,!?]/.test(text[i - 1]) ? 160 : 26);
      else onDone?.();
    };
    t = setTimeout(tick, delay);
    return () => clearTimeout(t);
  }, [text]);
  // The rest is laid out but invisible, so lines never jump while typing.
  return (
    <Txt size={size} line={line} weight={weight} center={center}>
      {text.slice(0, n)}
      <Txt size={size} line={line} weight={weight} color="transparent">{text.slice(n)}</Txt>
    </Txt>
  );
}

function Welcome({ top }: { top: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: top, gap: 12 }}>
      <Rise delay={520}><Txt size={30} line={36} weight={700} center>{tx('Der klügste Familienkalender, mit dem du je gesprochen hast', 'The smartest family calendar you ever spoke to')}</Txt></Rise>
      <Rise delay={640}><Txt size={16} line={22} color={tokens.sub} center>{tx('Sag einfach, was ansteht. Ich kümmere mich um den Rest.', 'Just say what’s coming up. I’ll handle the rest.')}</Txt></Rise>
    </View>
  );
}

function Intro({ lines, onTyped }: { lines: string[]; onTyped: () => void }) {
  const [k, setK] = useState(0);
  useEffect(() => { if (k >= lines.length) onTyped(); }, [k]);
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28, gap: 14 }}>
      {lines.map((l, i) => (i <= k ? <Typer key={i} text={l} size={30} line={37} delay={i ? 250 : 450} onDone={() => setK((v) => Math.max(v, i + 1))} /> : null))}
    </View>
  );
}

/** Your name, then your partner's: one page and one field, so the keyboard stays where it is. Only the question changes. */
function Names({ which, value, onChange, onSubmit, title, placeholder }: { which: string; value: string; onChange: (v: string) => void; onSubmit: () => void; title: string; placeholder: string }) {
  // Focus after the page faded in (autoFocus during the entering animation is lost on some devices).
  const ref = useRef<TextInput>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 380); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 26 + 96 + 20, gap: 14 }}>
      <Rise key={which} style={{ alignSelf: 'stretch', minHeight: 68, justifyContent: 'flex-end' }}><Txt size={28} line={34} weight={700} center>{title}</Txt></Rise>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => { onChange(t); if (t.length === 1 && !value) buddyPoke(); }}
        onSubmitEditing={onSubmit}
        blurOnSubmit={false}
        placeholder={placeholder}
        placeholderTextColor={tokens.mute}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={30}
        style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: 30, fontWeight: '600', color: tokens.ink, paddingVertical: 10, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : null) }}
      />
    </View>
  );
}

/** A question: Memo top left (the live one sits in the free slot) with its line in a bubble, the answers below. */
function Ask({ say, hint, children }: { say: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Say text={say} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {hint ? <Txt size={13} color={tokens.mute} style={{ marginLeft: 4 }}>{hint}</Txt> : null}
        {React.Children.map(children, (c, i) => <Rise delay={120 + i * 45}>{c}</Rise>)}
      </ScrollView>
    </View>
  );
}

function Choice({ o, on, multi, tag, onPress }: { o: Opt; on: boolean; multi?: boolean; tag?: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} style={{
      minHeight: 66, borderRadius: 18, backgroundColor: on ? tokens.doneSoft : tokens.row, borderWidth: 2, borderColor: on ? tokens.done : tokens.hair,
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12,
    }}>
      <ClayIcon name={o.icon} size={40} celebrate={on} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={16.5} weight={600}>{label(o)}</Txt>
        {tag ? <Txt size={12.5} weight={600} color={tokens.done}>{tag}</Txt> : null}
      </View>
      <View style={{ width: 24, height: 24, borderRadius: multi ? 7 : 12, borderWidth: on ? 0 : 2, borderColor: tokens.circleLine, backgroundColor: on ? tokens.done : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <LineIcon name="check" size={15} color={tokens.onInk} /> : null}
      </View>
    </PressScale>
  );
}

function Big({ title, sub, top }: { title: string; sub?: string; top: number }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: top, gap: 10 }}>
      <Rise delay={260}><Txt size={28} line={34} weight={700} center>{title}</Txt></Rise>
      {sub ? <Rise delay={380}><Txt size={16.5} line={23} color={tokens.sub} center>{sub}</Txt></Rise> : null}
    </View>
  );
}

/** The bubble of the question screens, with the avatar slot left free: the live Memo sits there. Always the height of
 *  the longest line, so what lies below never moves when the line changes. */
function Say({ text }: { text: string }) {
  // On a narrow phone the longest line needs three lines.
  const { width } = useWindowDimensions();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingTop: 6, minHeight: 6 + (width < 380 ? 100 : 76) }}>
      <View style={{ width: 60, height: 72 }} />
      <View style={{ flex: 1, backgroundColor: tokens.row, borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: tokens.hair }}>
        <Typer text={text} size={18} line={24} weight={600} />
      </View>
    </View>
  );
}

/**
 * The try step, as a sequence of states (vault pattern 7 and 9). Since the klar look (Julian 14.11.2026) it is the
 * app as it is: the Kalender list of the Heute tab and the glass pill with Memo, the dark Sprechkarte with the live
 * words, the loading bubble (KlarTalk).
 *   intro   Memo sits in his slot and says what comes
 *   wait    he has flown into the pill and is the talk button; a label names it; three examples to tap
 *   think   the examples are gone, he is the loading bubble
 *   landed  the new line lights up in the list; he glides back to his seat in the pill, glad
 *   notif   the pill leaves, he comes back out; your partner's phone: the notification is the question about reminders
 */
function Probe({ me, du, familie, ev, setEv, docked, setDocked, pad, onDone }: {
  me: string; du: string; familie: string | null; ev: CalEvent | null; setEv: (e: CalEvent) => void;
  docked: boolean; setDocked: (v: boolean) => void; pad: number; onDone: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'wait' | 'think' | 'landed' | 'notif'>(ev ? 'notif' : 'intro');
  const [miss, setMiss] = useState(false);
  const [hint, setHint] = useState(false);
  const b = useBuddy();
  // The label and the examples step aside while the Sprechkarte or the typing card is open.
  const speak = useSpeak(), barMode = useBarMode(), keys = useTyping();
  const talking = speakOpen(speak) || barMode === 'input' || keys;
  // The real calendar in a world of its own (Julian 12.11.: "too empty, doesn't show the app interface"): a calm
  // example week with your two names on it, and what you say lands in it. Nothing here touches the real store.
  const world: Store = useMemo(() => {
    const base = buildDemoState(TODAY);
    const keep = new Set(['ev_fussball', 'ev_markt', 'ev_film']);
    // One of each: in the endless list a weekly series would fill every week.
    const seed = demoEvents(TODAY).filter((e) => keep.has(e.id)).map((e) => ({ ...e, people: undefined, place: undefined, repeat: undefined }));
    // Only appointments: no open things, deadlines or hints of the demo family in the list.
    return createStore({ ...base, people: [], tasks: [], docs: [], lists: [], events: ev ? [...seed, ev] : seed, calView: 'tag' as const, calDay: ev ? ev.date : TODAY, names: { J: me || tx('Du', 'You'), T: du || tx('Partner', 'Partner') } });
  }, []);
  const people: Persons = useMemo(() => ({ J: { ...appPersons.J, name: me || tx('Du', 'You') }, T: { ...appPersons.T, name: du || tx('Partner', 'Partner') } }), [me, du]);
  const insets = useSafeAreaInsets();
  // Where the calendar box sits on the screen, so the new line can be brought into view inside it.
  const frame = useRef<View>(null);
  const showLine = (id: string) => {
    light(id);
    const f = frame.current as any;
    if (!f?.measureInWindow) return;
    f.measureInWindow((_x: number, y: number, _w: number, h: number) => locate(id, { top: y + 96, floor: y + h - 24, height: h }, () => {}));
  };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); setBuddy({ thinking: false }); light(null); }, []);
  useEffect(() => {
    if (phase !== 'intro') return;
    // Only one Pin: the bar's own stays hidden until this one has flown into its place.
    setBuddy({ dockHidden: true });
    // He reads his line to you first, then goes where you will find him from now on.
    later(1700, () => setDocked(true));
    later(1700 + 800, () => { setPhase('wait'); });
    later(1700 + 1300, () => setHint(true));
  }, []);

  const ex = (SAG[familie === 'patchwork' ? 'kinder' : familie ?? 'zwei'] ?? SAG.zwei).map(([d, e]) => tx(d, e));
  const send = (text: string) => {
    const t = text.trim();
    if (!t || phase === 'think') return;
    setHint(false); setMiss(false); setPhase('think'); setBuddy({ thinking: true });
    later(750, () => {
      setBuddy({ thinking: false });
      const r = understand(t, [], null, () => 'ev_mine');
      if (r.kind === 'answer') { setMiss(true); setPhase('wait'); return; }
      const e: CalEvent = r.kind === 'added'
        ? { ...r.event, who: r.event.who ?? 'J' }
        : { id: 'ev_mine', title: (r as any).title ?? t, icon: 'kalender', date: addDays(TODAY, 1), start: '00:00', allDay: true, who: 'J' } as CalEvent;
      setEv(e);
      // It moves into the calendar: the new line lights up in the list and comes into view. Memo glides from the
      // loading bubble back to his seat in the pill and is glad there; he leaves the bar when the next question comes.
      world.set((st) => ({ events: [...st.events.filter((x) => x.id !== e.id), e], calDay: e.date }));
      setPhase('landed');
      haptics.success();
      later(120, () => showLine(e.id));
      later(760, () => buddyJoy());
      later(2100, () => { setBuddy({ dockHidden: true }); setDocked(false); setPhase('notif'); haptics.tap(); });
    });
  };

  const line = phase === 'intro' ? (me ? tx(`Jetzt du, ${me}. Ich setze mich in die Leiste.`, `Your turn, ${me}. I’ll sit down in the bar.`) : tx('Jetzt du. Ich setze mich in die Leiste.', 'Your turn. I’ll sit down in the bar.'))
    : phase === 'wait' ? (miss ? tx('Das war kein Termin. Versuch „Freitag 15 Uhr Zahnarzt“.', 'That wasn’t an appointment. Try “Friday 3pm dentist”.') : tx('Tipp mich unten an und sag euren nächsten Termin.', 'Tap me down there and say your next appointment.'))
      : phase === 'think' ? tx('Moment …', 'One moment …')
        : phase === 'landed' ? tx(`Steht drin. ${ev ? whenOf(ev) : ''}.`, `It’s in. ${ev ? whenOf(ev) : ''}.`)
          : tx(du ? `${du} sieht es auch sofort.` : 'Dein Partner sieht es auch sofort.', du ? `${du} sees it right away too.` : 'Your partner sees it right away too.');
  // The pill with Memo stays through 'landed', so he can come home to it; it leaves when the buttons come.
  const bar = phase !== 'notif';
  const foot = klarFoot(insets.bottom) + navH() + 12;
  // The room under the calendar is the same in every phase (examples over the pill, or the question with its two
  // buttons), so the calendar never changes its size while you watch it.
  const zone = Math.max(22 + 8 + 40 + 46 + foot, 8 + 42 + 12 + 50 + 12 + 22 + pad);
  const exOn = phase === 'wait' && !talking;
  const exA = useSharedValue(0);
  useEffect(() => { exA.value = withTiming(exOn ? 1 : 0, { duration: exOn ? 260 : 140, easing: out }); }, [exOn]);
  const exSt = useAnimatedStyle(() => ({ opacity: exA.value, transform: [{ translateY: (1 - exA.value) * 10 }] }));
  const reach = ev ? daysBetween(TODAY, ev.date) + 8 : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Say text={line} />
      <View ref={frame} collapsable={false} style={{ flex: 1, marginHorizontal: 14, marginTop: 14, marginBottom: 10, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: tokens.hair, backgroundColor: tokens.bg }}>
        <View pointerEvents="none" style={{ flex: 1 }}>
          <StoreContext.Provider value={world}>
            <PersonsContext.Provider value={people}>
              <StillContext.Provider value>
                <CalHead />
                <AgendaView reach={reach} />
              </StillContext.Provider>
            </PersonsContext.Provider>
          </StoreContext.Provider>
        </View>
        {!ev ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 12, backgroundColor: tokens.chipBg, borderRadius: 999, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}>
            <Txt size={12} weight={600} color={tokens.sub}>{tx('Beispielwoche', 'Example week')}</Txt>
          </View>
        ) : null}
        {ev && phase === 'notif' ? (
          <Rise delay={120} style={{ position: 'absolute', left: 10, right: 10, bottom: 10, borderRadius: 24, backgroundColor: '#2E4650', padding: 10, paddingTop: 8, gap: 6, boxShadow: '0 14px 30px rgba(22,35,42,0.25)' } as any}>
            <Txt size={12} weight={600} color="#FFFFFF" style={{ opacity: 0.8, paddingHorizontal: 6 }}>{du ? tx(`${du}s Handy`, `${du}’s phone`) : tx('Das Handy deines Partners', 'Your partner’s phone')}</Txt>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 12, flexDirection: 'row', gap: 12 }}>
              <ClayIcon name={ev.icon as ClayName} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt size={13} weight={600} color={tokens.sub}>FamCal</Txt>
                  <Txt size={13} color={tokens.mute}>{tx('jetzt', 'now')}</Txt>
                </View>
                <Txt size={15.5} line={21} weight={600}>{tx(`${me || 'Neu'}: ${ev.title}`, `${me || 'New'}: ${ev.title}`)}</Txt>
                <Txt size={14.5} line={20} color={tokens.sub}>{whenOf(ev)}</Txt>
              </View>
            </View>
          </Rise>
        ) : null}
      </View>

      <View style={{ height: zone }}>
        <Animated.View pointerEvents={exOn ? 'auto' : 'none'} style={[{ gap: 8 }, exSt]}>
          <View style={{ height: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
            <Txt size={13} color={tokens.mute}>{tx('Oder tipp ein Beispiel an', 'Or tap an example')}</Txt>
            <PressScale onPress={onDone} hitSlop={10}><Txt size={13} color={tokens.mute}>{tx('Überspringen', 'Skip')}</Txt></PressScale>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {ex.map((e) => (
              <PressScale key={e} onPress={() => { haptics.select(); send(e); }} style={{ backgroundColor: tokens.row, borderRadius: 999, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 14, height: 40, justifyContent: 'center' }}>
                <Txt size={15} weight={600}>{e}</Txt>
              </PressScale>
            ))}
          </ScrollView>
        </Animated.View>
        {phase === 'notif' ? (
          <Rise delay={260} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: pad, gap: 12 }}>
            <Txt size={15} line={21} color={tokens.sub} center>{tx('Soll ich euch Bescheid sagen, wenn sich was ändert?', 'Should I tell you both when something changes?')}</Txt>
            <Btn label={tx('Ja, sag Bescheid', 'Yes, tell us')} onPress={() => { if (!isPreview()) void startNotifications(); buddyJoy(); onDone(); }} />
            <View style={{ height: 22, justifyContent: 'center' }}><TextLink label={tx('Später', 'Later')} weight={400} onPress={onDone} /></View>
          </Rise>
        ) : null}
      </View>
      {/* The app's own input (Julian 02.11.: show the app in its final form): the pill with Memo, the dark Sprechkarte
          with the live words, the loading bubble. What is said stays here, nothing goes to the assistant. */}
      {bar ? (
        <Animated.View exiting={FadeOut.duration(160)} pointerEvents={phase === 'think' || phase === 'landed' ? 'none' : 'box-none'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <KlarTalk onSend={send} spoken={ex} placeholder={tx('Sprich oder schreib einfach …', 'Just say or type it …')} />
        </Animated.View>
      ) : null}
      {/* The label over Memo in the pill: this is the talk button. */}
      {hint && phase === 'wait' && b.dockAt && !talking ? <TapHint x={b.dockAt.x} y={b.dockAt.y} /> : null}
    </View>
  );
}

/** The head of the Kalender tab as it is in the app (klar draft, Julian 14.11.): the weekday semibold without a period,
 *  the short grey info behind it on the same line ("Donnerstag 29. Okt"). */
function CalHead() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 }}>
      <Txt size={29} line={34} weight={600} tracking={-0.72} numberOfLines={1} style={{ flexShrink: 1 }}>{WD_LONG[weekday(TODAY)]}</Txt>
      <Txt size={16} line={21} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 2 }}>{dmShort(TODAY)}</Txt>
    </View>
  );
}


/** "Tap me to speak", sitting right over Pin in the bar; it nods toward him once. */
function TapHint({ x, y }: { x: number; y: number }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => { k.value = withTiming(1, { duration: 320, easing: out }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: reduced ? 0 : (1 - k.value) * -8 }] }));
  const w = 178;
  const left = Math.max(12, Math.min(width - w - 12, x - w + 34));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left, top: y - insets.top - 52 - 34 - 46, width: w, alignItems: 'flex-end' }, st]}>
      <View style={{ backgroundColor: tokens.ink, borderRadius: 14, paddingHorizontal: 12, height: 34, justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' }}>
        <Txt size={13.5} weight={600} color={tokens.onInk}>{tx('Antippen und sprechen', 'Tap and speak')}</Txt>
      </View>
      <View style={{ width: 12, height: 12, backgroundColor: tokens.ink, transform: [{ rotate: '45deg' }], marginTop: -7, marginRight: Math.max(10, Math.min(w - 22, w - (x - left) - 6)), borderRadius: 2 }} />
    </Animated.View>
  );
}

/** The end: Pin is up, your things pop out around him, and below is what you have now. */
function Fertig({ me, du, ev, nervt, top, cx, cy }: { me: string; du: string; ev: CalEvent | null; nervt: string[]; top: number; cx: number; cy: number }) {
  const insets = useSafeAreaInsets();
  const icons = [ev?.icon as ClayName | undefined, ...NERVT.filter((o) => nervt.includes(o.key)).map((o) => o.icon), 'kalender', 'einkauf', 'glocke', 'herz', 'checkliste'].filter((k, i, a): k is ClayName => !!k && a.indexOf(k) === i).slice(0, 5);
  useEffect(() => { const t = setTimeout(() => { haptics.success(); buddyJoy(); }, 640); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1 }}>
      <Burst icons={icons} cx={cx} cy={cy} />
      <View style={{ paddingTop: top - insets.top + 26, paddingHorizontal: 24, gap: 10 }}>
        <Rise delay={420}><Txt size={30} line={36} weight={700} center>{me ? tx(`Fertig, ${me}!`, `All set, ${me}!`) : tx('Fertig!', 'All set!')}</Txt></Rise>
        <Rise delay={540}><Txt size={16.5} line={23} color={tokens.sub} center>{tx(`Sichere es jetzt, damit ${du || 'dein Partner'} alles auch sieht.`, `Save it now so ${du || 'your partner'} sees it all too.`)}</Txt></Rise>
      </View>
      <Rise delay={700} style={{ marginTop: 22, marginHorizontal: 20, backgroundColor: tokens.row, borderRadius: 24, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
          <ClayIcon name="gruppe" size={40} />
          <View style={{ flex: 1 }}>
            <Txt size={13} color={tokens.mute}>{tx('Eure Familie', 'Your family')}</Txt>
            <Txt size={16.5} weight={600}>{du ? tx(`${me || 'Du'} und ${du}`, `${me || 'You'} and ${du}`) : tx(`${me || 'Du'} und dein Partner`, `${me || 'You'} and your partner`)}</Txt>
          </View>
        </View>
        {ev ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: tokens.hair }}>
            <ClayIcon name={ev.icon as ClayName} size={40} />
            <View style={{ flex: 1 }}>
              <Txt size={13} color={tokens.mute}>{tx('Euer erster Termin', 'Your first appointment')}</Txt>
              <Txt size={16.5} weight={600}>{`${ev.title}, ${whenOf(ev)}`}</Txt>
            </View>
          </View>
        ) : null}
      </Rise>
    </View>
  );
}

/** Your icons pop out around Pin on small arcs, one after the other, and stay (no particles, no loop). */
const SPOTS = [[-158, 118], [-124, 146], [-90, 122], [-56, 146], [-22, 118]];
function Burst({ icons, cx, cy }: { icons: ClayName[]; cx: number; cy: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {icons.map((n, i) => <Pop key={n} name={n} cx={cx} cy={cy} a={SPOTS[i][0]} r={SPOTS[i][1]} delay={700 + i * 100} />)}
    </View>
  );
}
function Pop({ name, cx, cy, a, r, delay }: { name: ClayName; cx: number; cy: number; a: number; r: number; delay: number }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { k.value = withDelay(delay, withTiming(1, { duration: 520, easing: out })); }, []);
  const dx = Math.cos((a * Math.PI) / 180) * r, dy = Math.sin((a * Math.PI) / 180) * r;
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.value * 2.5),
    transform: [{ translateX: cx - 24 + dx * k.value }, { translateY: cy - 24 + dy * k.value - Math.sin(Math.PI * k.value) * 18 }, { scale: 0.6 + 0.4 * k.value }] as any,
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 48, height: 48 }, st]}><ClayIcon name={name} size={48} /></Animated.View>;
}
