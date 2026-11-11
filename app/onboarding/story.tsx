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
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, useReducedMotion, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Btn, TextLink } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import PressScale from '../../src/components/ui/PressScale';
import { ClayIcon } from '../../src/components/ui/Clay';
import type { ClayName } from '../../src/lib/clayIcons';
import Mascot, { type Pose } from '../../src/components/onboarding/Mascot';
import LiveMemo, { BIG } from '../../src/components/onboarding/LiveMemo';
import SignInSheet from '../../src/components/onboarding/SignInSheet';
import TalkBar from '../../src/components/TalkBar';
import { buddyJoy, buddyPoke, setBuddy, useBuddy } from '../../src/lib/buddy';
import { understand } from '../../src/lib/talk';
import type { CalEvent } from '../../src/state/types';
import { TODAY, addDays, weekday, WD_LONG, hm } from '../../src/lib/dates';
import { tokens } from '../../src/theme';
import { haptics } from '../../src/lib/haptics';
import { tx } from '../../src/i18n/lang';
import { LIVE } from '../../src/lib/live';
import { getAuth } from '../../src/lib/auth';
import { setPref } from '../../src/lib/prefs';
import { isPreview } from '../../src/lib/vorschau';
import { startNotifications } from '../../src/lib/notify';
import { stepViewed, onboardingDone } from '../../src/lib/funnel';
import { useKeyboardInset } from '../../src/lib/keyboard';

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
const whenOf = (e: CalEvent) => `${WD_LONG[weekday(e.date)]}${e.allDay ? '' : `, ${hm(e.start)}`}`;

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

export default function Story() {
  const q = useLocalSearchParams<{ step?: string; signin?: string }>();
  const start = (STEPS as string[]).includes(q.step ?? '') ? (q.step as Step) : 'peek';
  const [step, setStep] = useState<Step>(start);
  const [name, setName] = useState('');
  const [partner, setPartner] = useState('');
  const [familie, setFamilie] = useState<string | null>(null);
  const [nervt, setNervt] = useState<string[]>([]);
  const [ev, setEv] = useState<CalEvent | null>(null);
  /** Where Pin is in the try step: in the avatar slot, in the bar, or back in the slot once the card landed. */
  const [docked, setDocked] = useState(false);
  const [signIn, setSignIn] = useState(!!q.signin);
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const kb = useKeyboardInset();
  const me = name.trim();
  const du = partner.trim();

  useEffect(() => { stepViewed(step, 'story', STEPS.indexOf(step)); }, [step]);
  const go = (s?: Step) => {
    haptics.tap();
    const next = s ?? STEPS[STEPS.indexOf(step) + 1];
    if (next) setStep(next);
  };
  const back = () => {
    const p = STEPS[STEPS.indexOf(step) - 1];
    if (p) { haptics.select(); setDocked(false); setStep(p); }
  };
  const finish = () => {
    haptics.success();
    setPref('obName', me);
    if (du) setPref('obPartner', du);
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
  const bottomPad = Math.max(insets.bottom, 16) + (kb ? kb - Math.max(insets.bottom, 0) : 0);
  /** The avatar slot of the question screens (window coordinates): Pin flies from here into the bar and back. */
  // LiveMemo scales around a point near his feet, so the small Pin sits lower than its centre: take that back.
  const slot = { x: 20 + 30, y: insets.top + 52 + 6 + 6 + 30 - Math.round(0.4 * BIG * (1 - 60 / BIG)) };
  const hero = { x: W / 2, y: insets.top + Math.max(196, Math.round(H * 0.26)) };

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  switch (step) {
    case 'peek':
      body = <Peek onDone={() => go('welcome')} />;
      break;
    case 'welcome':
      body = <Welcome />;
      footer = (
        <View style={{ gap: 14 }}>
          <Btn label={tx('Los geht’s', 'Let’s go')} onPress={() => go()} />
          <TextLink label={tx('Ich wurde eingeladen', 'I was invited')} onPress={() => (LIVE && !isPreview() ? setSignIn(true) : go())} />
        </View>
      );
      break;
    case 'intro':
      body = <Intro lines={[tx(`Hey, ich bin ${NAME}!`, `Hey, I’m ${NAME}!`), tx('Sag mir, was ansteht. Ich trage es ein und denke für euch mit.', 'Tell me what’s coming up. I add it and think along for you.')]} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'name':
      body = <NameAsk value={name} onChange={setName} onSubmit={() => me && go()} title={tx('Wie soll ich dich nennen?', 'What should I call you?')} placeholder={tx('Dein Name', 'Your name')} />;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!me} onPress={() => go()} />;
      break;
    case 'partner':
      body = (
        <Ask say={me ? tx(`Schön dich kennenzulernen, ${me}! Wer plant mit dir?`, `Nice to meet you, ${me}! Who plans with you?`) : tx('Wer plant mit dir?', 'Who plans with you?')}>
          <PartnerField value={partner} onChange={setPartner} onSubmit={() => go()} />
        </Ask>
      );
      footer = (
        <View style={{ gap: 12 }}>
          <Btn label={tx('Weiter', 'Next')} disabled={!du} onPress={() => go()} />
          <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => { setPartner(''); go(); }} />
        </View>
      );
      break;
    case 'familie':
      body = <Ask say={du ? tx(`Und wer gehört zu dir und ${du}?`, `And who belongs to you and ${du}?`) : tx('Wer gehört zu eurer Familie?', 'Who’s in your family?')}>{FAMILIE.map((o) => <Choice key={o.key} o={o} on={familie === o.key} onPress={() => { haptics.select(); setFamilie(o.key); buddyPoke(); }} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!familie} onPress={() => go()} />;
      break;
    case 'nervt':
      body = <Ask say={tx('Was nervt euch beim Planen am meisten?', 'What bugs you most about planning?')} hint={tx('Mehrere möglich', 'Pick any')}>{NERVT.map((o) => <Choice key={o.key} o={o} multi on={nervt.includes(o.key)} onPress={() => toggle(o.key)} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!nervt.length} onPress={() => go()} />;
      break;
    case 'confirm': {
      const n = NERVT.find((o) => o.key === nervt[0]);
      body = (
        <Big
          pose="wave"
          title={tx('Damit seid ihr nicht allein.', 'You’re not alone with that.')}
          sub={n ? tx(`„${n.de}“ muss nicht mehr sein. Genau dafür bin ich da.`, `“${n.en}” doesn’t have to happen anymore. That’s what I’m here for.`) : tx('Genau dafür bin ich da.', 'That’s what I’m here for.')}
        />
      );
      footer = <Btn label={tx('Zeig’s mir', 'Show me')} onPress={() => go()} />;
      break;
    }
    case 'probe':
      body = <Probe me={me} du={du} familie={familie} ev={ev} setEv={setEv} docked={docked} setDocked={setDocked} pad={bottomPad} onDone={() => go('fertig')} />;
      break;
    case 'fertig':
      body = <Fertig me={me} du={du} ev={ev} nervt={nervt} top={hero.y + BIG / 2} cx={hero.x} cy={hero.y - insets.top - 8} />;
      footer = <Btn label={tx('Sichern und loslegen', 'Save and get started')} onPress={finish} />;
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {barI >= 0 ? <Bar i={barI} n={BAR_LIST.length} onBack={back} /> : <View style={{ height: 8 }} />}
      <Animated.View key={step} entering={FadeIn.duration(220)} exiting={FadeOut.duration(100)} style={{ flex: 1 }}>
        {body}
      </Animated.View>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottomPad }}>{footer}</View> : null}
      {/* One Pin for the try step and the end: from the avatar slot into the bar, back out, then up to celebrate. */}
      {step === 'probe' || step === 'fertig' ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: signIn ? 0 : 1 }}>
          <LiveMemo place={step === 'fertig' ? 'hero' : docked ? 'dock' : 'mid'} hero={hero} mid={slot} midScale={60 / BIG} mood={step === 'fertig' ? 'happy' : undefined} />
        </View>
      ) : null}
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

/** The mascot rises from below the bottom edge, only its top half showing. */
function Rising({ size, delay = 0, peek = 0.5, children }: { size: number; delay?: number; peek?: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : size * peek + 40);
  useEffect(() => { y.value = withDelay(delay, withTiming(0, { duration: 760, easing: out })); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -size * (1 - peek), alignItems: 'center' }}>
      <Animated.View style={st}>{children}</Animated.View>
    </View>
  );
}

function Peek({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 1.05, 460);
  const [g, setG] = useState<{ x: number; y: number; n: number } | undefined>();
  useEffect(() => {
    const a = setTimeout(() => setG({ x: 0, y: -0.5, n: 1 }), 900);
    const b = setTimeout(() => { haptics.tap(); buddyPoke(); }, 1300);
    const c = setTimeout(onDone, 1900);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, []);
  return (
    <Pressable style={{ flex: 1 }} onPress={onDone} accessibilityLabel={tx('Weiter', 'Next')}>
      <Rising size={size} peek={0.58}><Mascot size={size} pose="peek" glance={g} /></Rising>
    </Pressable>
  );
}

function Welcome() {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.5, 210);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setTimeout(() => setN(1), 500); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 26 }}>
      <Mascot size={size} pose={n ? 'wave' : 'rest'} n={n} />
      <View style={{ gap: 12, alignItems: 'center' }}>
        <Txt size={30} line={36} weight={700} center>{tx('Der klügste Familienkalender, mit dem du je gesprochen hast', 'The smartest family calendar you ever spoke to')}</Txt>
        <Txt size={16} line={22} color={tokens.sub} center>{tx('Sag einfach, was ansteht. Ich kümmere mich um den Rest.', 'Just say what’s coming up. I’ll handle the rest.')}</Txt>
      </View>
    </View>
  );
}

function Intro({ lines, sub, rise }: { lines: string[]; sub?: string; rise?: boolean }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.86, 380);
  const [k, setK] = useState(0);
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 28, gap: 14 }}>
        {lines.map((l, i) => (i <= k ? <Typer key={i} text={l} size={30} line={37} delay={i ? 250 : 350} onDone={() => setK((v) => Math.max(v, i + 1))} /> : null))}
        {sub && k >= lines.length ? <Animated.View entering={FadeIn.duration(300)}><Txt size={17} line={23} color={tokens.sub}>{sub}</Txt></Animated.View> : null}
      </View>
      <Rising size={size} peek={rise ? 0.72 : 0.55}><Mascot size={size} mood={k < lines.length ? 'type' : 'idle'} gaze={{ x: -0.4, y: -0.7 }} /></Rising>
    </View>
  );
}

function NameAsk({ value, onChange, onSubmit, title, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; title: string; placeholder: string }) {
  // The eyes follow the letters: left at the start, along to the right as the name grows.
  const gx = Math.min(0.7, -0.3 + value.length * 0.08);
  // Focus after the screen faded in (autoFocus during the entering animation is lost on some devices).
  const ref = useRef<TextInput>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 350); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, gap: 22 }}>
      <Mascot size={96} mood={value ? 'type' : 'idle'} gaze={{ x: gx, y: 0.7 }} />
      <Txt size={28} line={34} weight={700} center>{title}</Txt>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => { onChange(t); if (t.length === 1 && !value) buddyPoke(); }}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={tokens.mute}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={30}
        style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: 30, fontWeight: '600', color: tokens.ink, paddingVertical: 10, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : null) }}
      />
    </View>
  );
}

function PartnerField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <View style={{ backgroundColor: tokens.row, borderRadius: 18, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 16, height: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ClayIcon name="herz" size={34} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={() => value.trim() && onSubmit()}
        placeholder={tx('Name, z. B. Sophia', 'Name, e.g. Sophia')}
        placeholderTextColor={tokens.mute}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={30}
        style={{ flex: 1, fontSize: 18, fontWeight: '600', color: tokens.ink, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : null) }}
      />
    </View>
  );
}

/** A question: the mascot top left with its line in a bubble, the answers below. */
function Ask({ say, hint, children }: { say: string; hint?: string; children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 22 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ marginTop: 6 }}><Mascot size={60} shadow={false} gaze={{ x: 0.6, y: 0.1 }} /></View>
        <View style={{ flex: 1, backgroundColor: tokens.row, borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: tokens.hair }}>
          <Typer text={say} size={18} line={24} weight={600} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {hint ? <Txt size={13} color={tokens.mute} style={{ marginLeft: 4 }}>{hint}</Txt> : null}
        {children}
      </View>
    </ScrollView>
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

function Big({ title, sub, pose }: { title: string; sub?: string; pose: Pose }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.56, 240);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setN(1); if (pose === 'jump') haptics.success(); }, 280); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 26 }}>
      <Mascot size={size} pose={n ? pose : 'rest'} n={n} mood="happy" />
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        <Typer text={title} size={28} line={34} center />
        {sub ? <Animated.View entering={FadeIn.delay(500).duration(300)}><Txt size={16.5} line={23} color={tokens.sub} center>{sub}</Txt></Animated.View> : null}
      </View>
    </View>
  );
}

/** The bubble of the question screens, with the avatar slot left free: Pin is the live one here. */
function Say({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingTop: 6 }}>
      <View style={{ width: 60, height: 72 }} />
      <View style={{ flex: 1, backgroundColor: tokens.row, borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: tokens.hair }}>
        <Typer text={text} size={18} line={24} weight={600} />
      </View>
    </View>
  );
}

/**
 * The try step, as a sequence of states (vault pattern 7 and 9):
 *   intro   Pin sits in his slot and says what comes
 *   wait    he has flown into the bar and is the talk button; a label names it; three examples to tap
 *   think   the examples are gone, your sentence stays, he thinks
 *   landed  the card is there with both of you on it; he comes back out, glad
 *   notif   your partner's phone: the notification is the question about reminders
 */
function Probe({ me, du, familie, ev, setEv, docked, setDocked, pad, onDone }: {
  me: string; du: string; familie: string | null; ev: CalEvent | null; setEv: (e: CalEvent) => void;
  docked: boolean; setDocked: (v: boolean) => void; pad: number; onDone: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'wait' | 'think' | 'landed' | 'notif'>(ev ? 'notif' : 'intro');
  const [said, setSaid] = useState('');
  const [miss, setMiss] = useState(false);
  const [hint, setHint] = useState(false);
  const b = useBuddy();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); setBuddy({ thinking: false }); }, []);
  useEffect(() => {
    if (phase !== 'intro') return;
    // Only one Pin: the bar's own stays hidden until this one has flown into its place.
    setBuddy({ dockHidden: true });
    // He reads his line to you first, then goes where you will find him from now on.
    later(1500, () => setDocked(true));
    later(1500 + 900, () => { setPhase('wait'); });
    later(1500 + 1500, () => setHint(true));
  }, []);

  const ex = (SAG[familie === 'patchwork' ? 'kinder' : familie ?? 'zwei'] ?? SAG.zwei).map(([d, e]) => tx(d, e));
  const send = (text: string) => {
    const t = text.trim();
    if (!t || phase === 'think') return;
    setHint(false); setMiss(false); setSaid(t); setPhase('think'); setBuddy({ thinking: true });
    later(750, () => {
      setBuddy({ thinking: false });
      const r = understand(t, [], null, () => 'ev_mine');
      if (r.kind === 'answer') { setMiss(true); setPhase('wait'); return; }
      const e: CalEvent = r.kind === 'added'
        ? { ...r.event, who: r.event.who ?? 'J' }
        : { id: 'ev_mine', title: (r as any).title ?? t, icon: 'kalender', date: addDays(TODAY, 1), start: '00:00', allDay: true, who: 'J' } as CalEvent;
      setEv(e);
      setPhase('landed');
      setDocked(false);
      haptics.success();
      later(420, () => buddyJoy());
      later(1900, () => { setPhase('notif'); haptics.tap(); });
    });
  };

  const line = phase === 'intro' ? (me ? tx(`Jetzt du, ${me}. Ich setze mich in die Leiste.`, `Your turn, ${me}. I’ll sit down in the bar.`) : tx('Jetzt du. Ich setze mich in die Leiste.', 'Your turn. I’ll sit down in the bar.'))
    : phase === 'wait' ? (miss ? tx('Das war kein Termin. Versuch „Freitag 15 Uhr Zahnarzt“.', 'That wasn’t an appointment. Try “Friday 3pm dentist”.') : tx('Tipp mich unten an und sag euren nächsten Termin.', 'Tap me down there and say your next appointment.'))
      : phase === 'think' ? tx('Moment …', 'One moment …')
        : phase === 'landed' ? tx(`Steht drin. ${ev ? whenOf(ev) : ''}.`, `It’s in. ${ev ? whenOf(ev) : ''}.`)
          : tx(du ? `${du} sieht es auch sofort. Soll ich euch Bescheid sagen, wenn sich was ändert?` : 'Dein Partner sieht es auch sofort. Soll ich euch Bescheid sagen, wenn sich was ändert?', du ? `${du} sees it right away too. Should I tell you both when something changes?` : 'Your partner sees it right away too. Should I tell you both when something changes?');
  const bar = phase === 'intro' || phase === 'wait' || phase === 'think';

  return (
    <View style={{ flex: 1 }}>
      <Say text={line} />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 12 }}>
        {phase === 'think' ? (
          <Rise style={{ alignSelf: 'flex-end', maxWidth: '84%', backgroundColor: tokens.chipBg, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 11 }}>
            <Txt size={16.5} line={22}>{said}</Txt>
          </Rise>
        ) : null}
        {ev && (phase === 'landed' || phase === 'notif') ? (
          <Rise style={{ backgroundColor: tokens.row, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: tokens.hair }}>
            <ClayIcon name={ev.icon as ClayName} size={52} celebrate />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt size={18} line={23} weight={700}>{ev.title}</Txt>
              <Txt size={15} color={tokens.sub}>{whenOf(ev)}</Txt>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Who n={me || tx('Du', 'You')} bg="#F6DDE2" fg="#9D2B48" />
              <Who n={du || '+'} bg="#DCE7F4" fg="#1F4E89" style={{ marginLeft: -8 }} />
            </View>
          </Rise>
        ) : null}
        {ev && phase === 'notif' ? (
          <Rise delay={120} style={{ marginTop: 14, gap: 8 }}>
            <Txt size={13} weight={600} color={tokens.mute} style={{ marginLeft: 4 }}>{du ? tx(`Auf ${du}s Handy`, `On ${du}’s phone`) : tx('Auf dem Handy deines Partners', 'On your partner’s phone')}</Txt>
            <View style={{ backgroundColor: tokens.noteBg, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 12 }}>
              <ClayIcon name="glocke" size={38} />
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

      {phase === 'wait' ? (
        <Rise style={{ paddingHorizontal: 16, paddingBottom: 50, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <Txt size={13} color={tokens.mute}>{tx('Oder tipp ein Beispiel an', 'Or tap an example')}</Txt>
            <PressScale onPress={onDone} hitSlop={10}><Txt size={13} color={tokens.mute}>{tx('Überspringen', 'Skip')}</Txt></PressScale>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ex.map((e) => (
              <PressScale key={e} onPress={() => { haptics.select(); send(e); }} style={{ backgroundColor: tokens.row, borderRadius: 999, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 14, height: 40, justifyContent: 'center' }}>
                <Txt size={15} weight={600}>{e}</Txt>
              </PressScale>
            ))}
          </View>
        </Rise>
      ) : null}
      {bar ? (
        <View style={{ paddingBottom: pad, opacity: phase === 'think' ? 0.5 : 1 }} pointerEvents={phase === 'think' ? 'none' : 'auto'}>
          <TalkBar split onSend={(t) => send(t)} spoken={ex} placeholder={tx('Sprich oder schreib einfach …', 'Just say or type it …')} />
        </View>
      ) : null}
      {phase === 'landed' ? <View style={{ height: 54 + 34 + pad }} /> : null}
      {phase === 'notif' ? (
        <Rise delay={260} style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: pad, gap: 12 }}>
          <Btn label={tx('Ja, sag Bescheid', 'Yes, tell us')} onPress={() => { if (!isPreview()) void startNotifications(); buddyJoy(); onDone(); }} />
          <TextLink label={tx('Später', 'Later')} weight={400} onPress={onDone} />
        </Rise>
      ) : null}
      {/* The label over Pin in the bar: this is the talk button. */}
      {hint && phase === 'wait' && b.dockAt ? <TapHint x={b.dockAt.x} y={b.dockAt.y} /> : null}
    </View>
  );
}

function Who({ n, bg, fg, style }: { n: string; bg: string; fg: string; style?: any }) {
  return (
    <View style={[{ width: 34, height: 34, borderRadius: 17, backgroundColor: bg, borderWidth: 2, borderColor: tokens.row, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Txt size={14} weight={700} color={fg}>{n.slice(0, 1).toUpperCase()}</Txt>
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
  useEffect(() => { const t = setTimeout(() => { haptics.success(); buddyJoy(); }, 760); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1 }}>
      <Burst icons={icons} cx={cx} cy={cy} />
      <View style={{ paddingTop: top - insets.top + 26, paddingHorizontal: 24, gap: 10 }}>
        <Rise delay={700}><Txt size={30} line={36} weight={700} center>{me ? tx(`Fertig, ${me}!`, `All set, ${me}!`) : tx('Fertig!', 'All set!')}</Txt></Rise>
        <Rise delay={820}><Txt size={16.5} line={23} color={tokens.sub} center>{tx(`Sichere es jetzt, damit ${du || 'dein Partner'} alles auch sieht.`, `Save it now so ${du || 'your partner'} sees it all too.`)}</Txt></Rise>
      </View>
      <Rise delay={1000} style={{ marginTop: 22, marginHorizontal: 20, backgroundColor: tokens.row, borderRadius: 24, borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 16, paddingVertical: 6 }}>
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
      {icons.map((n, i) => <Pop key={n} name={n} cx={cx} cy={cy} a={SPOTS[i][0]} r={SPOTS[i][1]} delay={900 + i * 120} />)}
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
