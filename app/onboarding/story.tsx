/**
 * The story onboarding (Julian 11.11.2026, x.com/jacobrodri_/status/2120150681256628702: "adopt this
 * onboarding concept with our apps content and mascot, stick as closely as possible to the design and
 * concept but make it our own"; 22:51: "mit unserem neuen Maskottchen und zur App passend").
 *
 * The concept (a study app's 37 screens, see project-files famcal/onboarding/knowunity-ref) told with our
 * content and mascot, light like the app:
 *   peek       the mascot looks in huge from the bottom edge and blinks
 *   welcome    claim, Los geht's / Ich wurde eingeladen
 *   intro1/2   lines that type themselves while the mascot peeks from below
 *   name       big centered input, then "Schön dich kennenzulernen"
 *   questions  mascot top left with a speech bubble, answer rows with clay icons (family, partner, what
 *              bugs you, how you plan today, what I should take off you)
 *   confirm    "Damit seid ihr nicht allein", how I take it off you, the curve (less on your mind), a
 *              little commitment with confetti, reminders pre-prompt
 *   setup      percent loader with ticks built from your answers, "Fertig, {Name}!" with confetti
 *   then the sign-in sheet (not a wall, adrian_partain) and Plus.
 * Not copied on purpose: invented numbers (users, ratings), the dark look, the app icon picker (needs a build).
 * No network here: no assistant call without an account. The answers only shape the words on screen.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withDelay, withSequence, Easing, useReducedMotion, FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Btn, TextLink } from '../../src/components/ui/kit';
import LineIcon from '../../src/components/ui/LineIcon';
import PressScale from '../../src/components/ui/PressScale';
import { ClayIcon } from '../../src/components/ui/Clay';
import type { ClayName } from '../../src/lib/clayIcons';
import Mascot, { type Pose } from '../../src/components/onboarding/Mascot';
import SignInSheet from '../../src/components/onboarding/SignInSheet';
import { buddyJoy, buddyPoke } from '../../src/lib/buddy';
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

/** The mascot's name on screen; one place to change when the new one gets its name. */
const NAME = 'Memo';

type Step = 'peek' | 'welcome' | 'intro1' | 'intro2' | 'name' | 'nice' | 'familie' | 'partner' | 'nervt' | 'bisher' | 'abnehmen'
  | 'confirm' | 'value' | 'kurve' | 'abmachung' | 'abgemacht' | 'erinnern' | 'setup' | 'fertig';
const STEPS: Step[] = ['peek', 'welcome', 'intro1', 'intro2', 'name', 'nice', 'familie', 'partner', 'nervt', 'bisher', 'abnehmen',
  'confirm', 'value', 'kurve', 'abmachung', 'abgemacht', 'erinnern', 'setup', 'fertig'];
/** The steps that show the progress bar (the story part before and the celebrations after do not). */
const BAR = new Set<Step>(['name', 'familie', 'partner', 'nervt', 'bisher', 'abnehmen', 'confirm', 'value', 'kurve', 'abmachung', 'erinnern']);
const BAR_LIST = STEPS.filter((s) => BAR.has(s));

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
const BISHER: Opt[] = [
  { key: 'chat', icon: 'chat', de: 'Im Chat hin und her', en: 'Back and forth in chat' },
  { key: 'papier', icon: 'magnet', de: 'Kalender am Kühlschrank', en: 'Calendar on the fridge' },
  { key: 'app', icon: 'kalender', de: 'Google oder Apple Kalender', en: 'Google or Apple Calendar' },
  { key: 'kopf', icon: 'gluehbirne', de: 'Gar nicht, alles im Kopf', en: 'Not at all, all in our heads' },
];
const ABNEHMEN: Opt[] = [
  { key: 'termine', icon: 'kalender', de: 'Termine eintragen', en: 'Adding appointments' },
  { key: 'erinnern', icon: 'glocke', de: 'Rechtzeitig erinnern', en: 'Reminding in time' },
  { key: 'einkauf', icon: 'einkauf', de: 'Die Einkaufsliste', en: 'The shopping list' },
  { key: 'essen', icon: 'pasta', de: 'Was es zu essen gibt', en: 'What’s for dinner' },
  { key: 'aufgaben', icon: 'checkliste', de: 'Aufgaben fair verteilen', en: 'Sharing chores fairly' },
  { key: 'schule', icon: 'schule', de: 'Kita und Schule', en: 'Daycare and school' },
];
/** How I take each thing off you (the value list). */
const SO: Record<string, [string, string, string, string]> = {
  termine: ['Einfach sagen, ich trage ein', '„Freitag 16 Uhr Kinderarzt“ reicht. Kein Formular.', 'Just say it, I add it', '“Friday 4 pm pediatrician” is enough. No form.'],
  erinnern: ['Ich sage rechtzeitig Bescheid', 'Bevor ihr losmüsst, nicht erst wenn es zu spät ist.', 'I tell you in time', 'Before you need to leave, not when it’s too late.'],
  einkauf: ['Eine Liste für euch beide', 'Was einer abhakt, sieht der andere sofort.', 'One list for both of you', 'What one ticks off, the other sees at once.'],
  essen: ['Ich schlage vor, was es gibt', 'Und die Zutaten landen direkt auf der Liste.', 'I suggest what to cook', 'And the ingredients go straight on the list.'],
  aufgaben: ['Aufgaben mit Namen', 'Jeder sieht, was er übernommen hat.', 'Chores with names', 'Everyone sees what they took on.'],
  schule: ['Kita und Schule im Blick', 'Elternabende, Ferien, Ausflüge, alles an einem Ort.', 'Daycare and school in view', 'Parent evenings, holidays, trips, all in one place.'],
  beide: ['Ihr seht beide dasselbe', 'Kein „hast du das eingetragen?“ mehr.', 'You both see the same', 'No more “did you add that?”.'],
};
const ZIEL: Opt[] = [
  { key: '3', icon: 'kalender', de: '3 Tage', en: '3 days' },
  { key: '7', icon: 'wochenplan', de: '7 Tage', en: '7 days' },
  { key: '14', icon: 'monatsplan', de: '14 Tage', en: '14 days' },
  { key: '30', icon: 'pokal', de: '30 Tage', en: '30 days' },
];
const label = (o: Opt) => tx(o.de, o.en);

const out = Easing.bezier(0.23, 1, 0.32, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export default function Story() {
  const q = useLocalSearchParams<{ step?: string; signin?: string }>();
  const start = (STEPS as string[]).includes(q.step ?? '') ? (q.step as Step) : 'peek';
  const [step, setStep] = useState<Step>(start);
  const [name, setName] = useState('');
  const [partner, setPartner] = useState('');
  const [familie, setFamilie] = useState<string | null>(null);
  const [nervt, setNervt] = useState<string[]>([]);
  const [bisher, setBisher] = useState<string | null>(null);
  const [abnehmen, setAbnehmen] = useState<string[]>([]);
  const [ziel, setZiel] = useState<string | null>('7');
  const [signIn, setSignIn] = useState(!!q.signin);
  const insets = useSafeAreaInsets();
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
    const i = STEPS.indexOf(step);
    // The celebrations are not stops on the way back.
    let p = STEPS[i - 1];
    if (p === 'nice') p = 'name';
    if (p === 'abgemacht') p = 'abmachung';
    if (p) { haptics.select(); setStep(p); }
  };
  const finish = () => {
    setPref('obName', me);
    if (du) setPref('obPartner', du);
    onboardingDone('story');
    if (LIVE && !getAuth().session && !isPreview()) setSignIn(true);
    else router.replace('/plus?trigger=onboarding');
  };
  const toggle = (list: string[], set: (v: string[]) => void, k: string) => {
    haptics.select();
    set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
    buddyPoke();
  };
  const pick = (set: (v: string) => void, k: string) => { haptics.select(); set(k); buddyPoke(); };

  const barI = BAR_LIST.indexOf(step);
  const showBar = barI >= 0;
  const bottomPad = Math.max(insets.bottom, 16) + (kb ? kb - Math.max(insets.bottom, 0) : 0);

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
    case 'intro1':
      body = <Intro lines={[tx(`Hey, ich bin ${NAME}!`, `Hey, I’m ${NAME}!`)]} sub={tx('Euer Familienkalender, mit dem man einfach reden kann.', 'Your family calendar you can simply talk to.')} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'intro2':
      body = <Intro lines={[tx('Ich behalte Termine, Listen und Pläne für euch im Kopf.', 'I keep appointments, lists and plans in mind for you.'), tx('Lass uns kurz kennenlernen.', 'Let’s get to know each other.')]} rise />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'name':
      body = <NameAsk value={name} onChange={setName} onSubmit={() => me && go()} title={tx('Wie soll ich dich nennen?', 'What should I call you?')} placeholder={tx('Dein Name', 'Your name')} />;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!me} onPress={() => go()} />;
      break;
    case 'nice':
      body = <Big pose="jump" title={me ? tx(`Schön dich kennenzulernen, ${me}!`, `Nice to meet you, ${me}!`) : tx('Schön dich kennenzulernen!', 'Nice to meet you!')} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'familie':
      body = <Ask say={me ? tx(`Wer gehört zu eurer Familie, ${me}?`, `Who’s in your family, ${me}?`) : tx('Wer gehört zu eurer Familie?', 'Who’s in your family?')}>{FAMILIE.map((o) => <Choice key={o.key} o={o} on={familie === o.key} onPress={() => pick(setFamilie, o.key)} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!familie} onPress={() => go()} />;
      break;
    case 'partner':
      body = (
        <Ask say={tx('Und wer plant mit dir zusammen?', 'And who plans with you?')}>
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
    case 'nervt':
      body = <Ask say={tx('Was nervt euch beim Planen am meisten?', 'What bugs you most about planning?')} hint={tx('Mehrere möglich', 'Pick any')}>{NERVT.map((o) => <Choice key={o.key} o={o} multi on={nervt.includes(o.key)} onPress={() => toggle(nervt, setNervt, o.key)} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!nervt.length} onPress={() => go()} />;
      break;
    case 'bisher':
      body = <Ask say={tx('Wie plant ihr bisher?', 'How do you plan today?')}>{BISHER.map((o) => <Choice key={o.key} o={o} on={bisher === o.key} onPress={() => pick(setBisher, o.key)} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!bisher} onPress={() => go()} />;
      break;
    case 'abnehmen':
      body = <Ask say={tx('Was soll ich euch abnehmen?', 'What should I take off your hands?')} hint={tx('Mehrere möglich', 'Pick any')}>{ABNEHMEN.map((o) => <Choice key={o.key} o={o} multi on={abnehmen.includes(o.key)} onPress={() => toggle(abnehmen, setAbnehmen, o.key)} />)}</Ask>;
      footer = <Btn label={tx('Weiter', 'Next')} disabled={!abnehmen.length} onPress={() => go()} />;
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
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    }
    case 'value': {
      const keys = [...abnehmen.filter((k) => SO[k]), 'beide', 'termine', 'erinnern'].filter((k, i, a) => a.indexOf(k) === i).slice(0, 3);
      body = <Value title={me ? tx(`So nehme ich euch das ab, ${me}`, `Here’s how I take it off you, ${me}`) : tx('So nehme ich euch das ab', 'Here’s how I take it off you')} keys={keys} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    }
    case 'kurve':
      body = <Curve partner={du} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'abmachung':
      body = (
        <Ask say={tx('Abmachung? Sag mir alles, was ansteht. Wie lange probierst du es?', 'Deal? Tell me everything that comes up. How long will you try it?')}>
          {ZIEL.map((o) => <Choice key={o.key} o={o} on={ziel === o.key} tag={o.key === '7' ? tx('Empfohlen', 'Recommended') : undefined} onPress={() => pick(setZiel, o.key)} />)}
        </Ask>
      );
      footer = <Btn label={tx('Abgemacht', 'It’s a deal')} disabled={!ziel} onPress={() => { haptics.success(); buddyJoy(); go(); }} />;
      break;
    case 'abgemacht':
      body = <Big pose="jump" confetti title={tx(`${ziel} Tage, abgemacht!`, `${ziel} days, it’s a deal!`)} sub={tx('Ich bin jeden Tag da. Du musst nur sagen, was ansteht.', 'I’m here every day. You only need to say what’s coming up.')} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={() => go()} />;
      break;
    case 'erinnern':
      body = <Remind me={me} du={du} />;
      footer = (
        <View style={{ gap: 12 }}>
          <Btn label={tx('Ja, erinnere mich', 'Yes, remind me')} onPress={() => { if (!isPreview()) void startNotifications(); buddyJoy(); go(); }} />
          <TextLink label={tx('Später', 'Later')} weight={400} onPress={() => go()} />
        </View>
      );
      break;
    case 'setup':
      body = <Setup me={me} du={du} picks={abnehmen} onDone={() => go('fertig')} />;
      break;
    case 'fertig':
      body = <Big pose="jump" confetti title={tx(`Fertig, ${me || 'ihr zwei'}!`, `All set, ${me || 'you two'}!`)} sub={tx('Alles steht. Jetzt nur noch sichern, damit nichts verloren geht.', 'Everything’s ready. Just save it so nothing gets lost.')} />;
      footer = <Btn label={tx('Weiter', 'Next')} onPress={finish} />;
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {showBar ? <Bar i={barI} n={BAR_LIST.length} onBack={back} /> : <View style={{ height: 8 }} />}
      <Animated.View key={step} entering={FadeIn.duration(260)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
        {body}
      </Animated.View>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottomPad }}>{footer}</View> : null}
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
    const c = setTimeout(onDone, 2300);
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

function Big({ title, sub, pose, confetti }: { title: string; sub?: string; pose: Pose; confetti?: boolean }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.56, 240);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setN(1); if (pose === 'jump') haptics.success(); }, 280); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 26 }}>
      {confetti ? <Confetti /> : null}
      <Mascot size={size} pose={n ? pose : 'rest'} n={n} mood="happy" />
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        <Typer text={title} size={28} line={34} center />
        {sub ? <Animated.View entering={FadeIn.delay(500).duration(300)}><Txt size={16.5} line={23} color={tokens.sub} center>{sub}</Txt></Animated.View> : null}
      </View>
    </View>
  );
}

function Value({ title, keys }: { title: string; keys: string[] }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, gap: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mascot size={64} shadow={false} mood="happy" />
        <View style={{ flex: 1 }}><Typer text={title} size={24} line={30} /></View>
      </View>
      <View style={{ gap: 22 }}>
        {keys.map((k, i) => {
          const s = SO[k];
          return (
            <Animated.View key={k} entering={FadeIn.delay(350 + i * 260).duration(320)} style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Txt size={15} weight={700} color={tokens.onInk}>{i + 1}</Txt>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={17} line={22} weight={700}>{tx(s[0], s[2])}</Txt>
                <Txt size={15} line={21} color={tokens.sub}>{tx(s[1], s[3])}</Txt>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const APath = Animated.createAnimatedComponent(Path);
/** "Less on your mind": a curve that falls week by week. A goal, not a measured number. */
function Curve({ partner }: { partner: string }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 40, 420), H = 210;
  const pts = [[0.06, 0.16], [0.36, 0.34], [0.64, 0.66], [0.94, 0.82]].map(([x, y]) => [x * W, y * H]);
  const d = `M${pts[0][0]},${pts[0][1]} C${pts[0][0] + W * 0.16},${pts[0][1]} ${pts[1][0] - W * 0.12},${pts[1][1] - 6} ${pts[1][0]},${pts[1][1]} S${pts[2][0] - W * 0.12},${pts[2][1] - 8} ${pts[2][0]},${pts[2][1]} S${pts[3][0] - W * 0.14},${pts[3][1]} ${pts[3][0]},${pts[3][1]}`;
  const L = W * 1.25;
  const p = useSharedValue(L);
  useEffect(() => { p.value = withDelay(400, withTiming(0, { duration: 1400, easing: inOut })); }, []);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: p.value }));
  const weeks = [tx('Heute', 'Today'), tx('Woche 1', 'Week 1'), tx('Woche 2', 'Week 2'), tx('Woche 4', 'Week 4')];
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 20 }}>
      <Typer text={partner ? tx(`Weniger im Kopf, für dich und ${partner}`, `Less on your mind, for you and ${partner}`) : tx('Weniger im Kopf, Woche für Woche', 'Less on your mind, week by week')} size={26} line={32} />
      <View style={{ backgroundColor: tokens.row, borderRadius: 24, borderWidth: 1, borderColor: tokens.hair, padding: 16, gap: 10 }}>
        <Txt size={13.5} weight={600} color={tokens.sub}>{tx('Woran ihr selbst denken müsst', 'What you need to keep in mind yourselves')}</Txt>
        <Svg width={W - 34} height={H} viewBox={`0 0 ${W} ${H}`}>
          {[0.25, 0.5, 0.75].map((y) => <Line key={y} x1={0} x2={W} y1={y * H} y2={y * H} stroke={tokens.hair} strokeWidth={1} strokeDasharray="4 6" />)}
          <APath d={d} stroke={tokens.done} strokeWidth={5} strokeLinecap="round" fill="none" strokeDasharray={`${L} ${L}`} animatedProps={ap} />
          {pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={i === 3 ? 9 : 6} fill={i === 3 ? tokens.done : tokens.row} stroke={tokens.done} strokeWidth={3} />)}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {weeks.map((w) => <Txt key={w} size={12} color={tokens.mute}>{w}</Txt>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mascot size={52} shadow={false} mood="happy" />
        <Txt size={15} line={21} color={tokens.sub} style={{ flex: 1 }}>{tx('Das ist das Ziel, keine Statistik: Je mehr ihr mir sagt, desto weniger müsst ihr selbst behalten.', 'That’s the goal, not a statistic: the more you tell me, the less you have to remember.')}</Txt>
      </View>
    </ScrollView>
  );
}

function Remind({ me, du }: { me: string; du: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, gap: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ marginTop: 6 }}><Mascot size={60} shadow={false} /></View>
        <View style={{ flex: 1, backgroundColor: tokens.row, borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: tokens.hair }}>
          <Typer text={tx('Darf ich dich rechtzeitig erinnern? Nur bei Wichtigem, versprochen.', 'May I remind you in time? Only when it matters, promise.')} size={18} line={24} weight={600} />
        </View>
      </View>
      <Animated.View entering={FadeIn.delay(700).duration(360)} style={{ backgroundColor: tokens.row, borderRadius: 22, padding: 14, gap: 6, borderWidth: 1, borderColor: tokens.hair, flexDirection: 'row' }}>
        <ClayIcon name="glocke" size={40} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={13} weight={600} color={tokens.sub}>FamCal</Txt>
            <Txt size={13} color={tokens.mute}>{tx('jetzt', 'now')}</Txt>
          </View>
          <Txt size={15.5} line={21} weight={600}>{tx('Kinderarzt in 45 Minuten', 'Pediatrician in 45 minutes')}</Txt>
          <Txt size={14.5} line={20} color={tokens.sub}>{du ? tx(`${du} bringt die Versichertenkarte mit.`, `${du} brings the insurance card.`) : tx('Denk an die Versichertenkarte.', 'Remember the insurance card.')}</Txt>
        </View>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(1100).duration(360)} style={{ backgroundColor: tokens.row, borderRadius: 22, padding: 14, gap: 6, borderWidth: 1, borderColor: tokens.hair, flexDirection: 'row' }}>
        <ClayIcon name="einkauf" size={40} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={13} weight={600} color={tokens.sub}>FamCal</Txt>
            <Txt size={13} color={tokens.mute}>{tx('vor 2 Min.', '2 min ago')}</Txt>
          </View>
          <Txt size={15.5} line={21} weight={600}>{du ? tx(`${du} hat Milch abgehakt`, `${du} ticked off milk`) : tx('Milch wurde abgehakt', 'Milk was ticked off')}</Txt>
          <Txt size={14.5} line={20} color={tokens.sub}>{tx(`Fehlt noch: Brot und Eier${me ? `, ${me}` : ''}.`, `Still missing: bread and eggs${me ? `, ${me}` : ''}.`)}</Txt>
        </View>
      </Animated.View>
    </View>
  );
}

function Setup({ me, du, picks, onDone }: { me: string; du: string; picks: string[]; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [mood, setMood] = useState<'think' | 'happy'>('think');
  const lists = ABNEHMEN.filter((o) => picks.includes(o.key) && ['einkauf', 'essen', 'aufgaben'].includes(o.key)).map(label);
  const rows = [
    du ? tx(`Familie für ${me} und ${du} anlegen`, `Setting up the family for ${me} and ${du}`) : tx(`Familie für ${me || 'euch'} anlegen`, `Setting up the family for ${me || 'you'}`),
    tx('Kalender vorbereiten', 'Preparing the calendar'),
    lists.length ? tx(`Listen anlegen: ${lists.join(', ')}`, `Creating lists: ${lists.join(', ')}`) : tx('Einkaufsliste anlegen', 'Creating the shopping list'),
    tx('Erinnerungen einstellen', 'Setting up reminders'),
  ];
  useEffect(() => {
    const t0 = Date.now(), D = 3600;
    let done = false;
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / D);
      // Eased like real work: quick start, a little wait near the end.
      const e = k < 0.8 ? (k / 0.8) * 0.86 : 0.86 + ((k - 0.8) / 0.2) * 0.14;
      setPct(Math.round(e * 100));
      if (k >= 1 && !done) {
        done = true;
        clearInterval(id);
        setMood('happy');
        haptics.success();
        buddyJoy();
        setTimeout(onDone, 900);
      }
    }, 50);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 22 }}>
      <Mascot size={150} mood={mood} />
      <Txt size={52} line={58} weight={700}>{pct} %</Txt>
      <Txt size={22} line={28} weight={700} center>{tx('Ich richte alles für euch ein', 'I’m setting everything up for you')}</Txt>
      <View style={{ height: 8, alignSelf: 'stretch', borderRadius: 4, backgroundColor: tokens.segBg, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, borderRadius: 4, backgroundColor: tokens.done }} />
      </View>
      <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 4 }}>
        {rows.map((r, i) => {
          const ok = pct >= (i + 1) * 24;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: ok ? 1 : 0.45 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ok ? tokens.done : 'transparent', borderWidth: ok ? 0 : 2, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }}>
                {ok ? <LineIcon name="check" size={15} color={tokens.onInk} /> : null}
              </View>
              <Txt size={15.5} weight={ok ? 600 : 400} style={{ flex: 1 }}>{r}</Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Paper confetti from the top: falls, turns, fades. Each piece on its own curve. */
const COLORS = ['#075056', '#F6CD6A', '#9D2B48', '#1F4E89', '#AF3A0B', '#2F9E6E', '#F6DDE2'];
function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    x: Math.random() * width, d: 1500 + Math.random() * 1300, delay: Math.random() * 350,
    w: 7 + Math.random() * 6, h: 10 + Math.random() * 8, c: COLORS[i % COLORS.length], r: (Math.random() - 0.5) * 900, drift: (Math.random() - 0.5) * 120,
  })), [width]);
  if (useReducedMotion()) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, zIndex: 5 }}>
      {pieces.map((p, i) => <Piece key={i} p={p} fall={height * 0.9} />)}
    </View>
  );
}
function Piece({ p, fall }: { p: { x: number; d: number; delay: number; w: number; h: number; c: string; r: number; drift: number }; fall: number }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(p.delay, withTiming(1, { duration: p.d, easing: Easing.bezier(0.3, 0.1, 0.6, 1) })); }, []);
  const st = useAnimatedStyle(() => ({
    opacity: k.value < 0.75 ? 1 : 1 - (k.value - 0.75) / 0.25,
    transform: [{ translateX: p.x + p.drift * k.value }, { translateY: -30 + fall * k.value }, { rotate: `${p.r * k.value}deg` }, { scaleX: Math.cos(k.value * 12) }] as any,
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.c }, st]} />;
}
