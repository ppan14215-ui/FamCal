/**
 * FamCal design tokens. Source of truth is `design/gen.py` (Clay-Ruhe-System,
 * Canvas v37). HANDOFF.md lists the same values; the older frontmatter in
 * docs/DESIGN.md is superseded where it differs.
 *
 * Rules that shape these values (docs/DESIGN.md, "Einfachheit"):
 * - Farbe nur im Objekt: surfaces are white or `bg`, colour lives in clay
 *   icons, their tiles, people and deadlines.
 * - Ein dunkles Element pro Screen: `ink` fills only the main action and the
 *   plus button. Selection shows a ring or a person colour, never dark.
 * - `done` (teal) is for "erledigt" and the period after headlines.
 */
export const tokens = {
  bg: '#F5F5F4',
  row: '#FFFFFF',
  ink: '#16232A',
  sub: '#5B666B',
  mute: '#8A9397',
  hair: '#E7E7E4',
  done: '#075056',
  doneSoft: '#E2EEEC',
  frist: '#C2410C',
  segBg: '#EAEAE7',
  chipBg: '#EFEFEC',
  circleLine: '#C9CDCF',
  dotOff: '#D5D8D9',
  danger: '#C7372F',
  /** Marked text: light teal, so the selected words stay readable (a dark highlight hid them on Android, Julian 28.10.). */
  select: 'rgba(7,80,86,0.22)',
  ok: '#2F9E6E',
  scrim: 'rgba(22,35,42,0.28)',
  noteBg: '#ECEBE7',
  paper: '#F4F1EA',
} as const;

export type PersonId = 'J' | 'T';

export const persons: Record<PersonId, { name: string; tint: string; ink: string; stripe: string; colorName: string }> = {
  J: { name: 'Julia', tint: '#F6DDE2', ink: '#9D2B48', stripe: '#EFC6CF', colorName: 'Rosa' },
  T: { name: 'Tom', tint: '#DCE7F4', ink: '#1F4E89', stripe: '#C3D5EC', colorName: 'Blau' },
};

/** Tint behind a clay icon tile. Falls back to a neutral grey. */
const TINT: Record<string, string> = {
  stethoskop: '#E6EEF4', kochtopf: '#F2EEE7', 'umschlag-euro': '#F7EDE1', reisepass: '#E2EEEC',
  yogamatte: '#E7EDE4', geschenk: '#F8E8E5', 'papier-stift': '#EEF0F2', kalender: '#E2EEEC',
  glocke: '#F2EEE7', kindergeld: '#F6F0DD', impfung: '#F8E8E5', erledigt: '#E2EEEC',
  vertrag: '#EEF0F2', 'kamera-scan': '#EEF0F2', 'brief-gelesen': '#F7EDE1', chat: '#E7EDE4',
  eingang: '#F2EEE7', telefon: '#E6EEF4', windeln: '#E6EEF4', thermometer: '#F8E8E5',
  krankenkasse: '#E2EEEC', zuhause: '#F2EEE7', sync: '#E2EEEC', rechnung: '#EEF0F2',
  fussabdruck: '#F8E8E5', reise: '#E6EEF4', geburtstag: '#F8E8E5', 'u-heft': '#F6F0DD',
  'hand-nimmt': '#F2EEE7', spaeter: '#E2EEEC', karten: '#F2EEE7', einkauf: '#E7EDE4',
  fussball: '#E7EDE4', hebamme: '#F8E8E5', urkunde: '#F6F0DD', schnuller: '#E6EEF4', paket: '#F2EEE7',
};
export const tint = (n: string) => TINT[n] ?? '#EEF0F2';

/** The six colours a parent can pick in onboarding (Canvas "Zu zweit"). */
export const personPalette = [
  { name: 'Rosa', bg: '#F6DDE2', fg: '#9D2B48' },
  { name: 'Blau', bg: '#DCE7F4', fg: '#1F4E89' },
  { name: 'Mint', bg: '#E2EEEC', fg: '#075056' },
  { name: 'Sand', bg: '#F7EDE1', fg: '#9A5B13' },
  { name: 'Salbei', bg: '#E7EDE4', fg: '#3F6B36' },
  { name: 'Flieder', bg: '#ECE6F4', fg: '#5B3F8C' },
];

export const radii = { tile: 16, row: 20, card: 24, sheet: 32, pill: 999 } as const;

export const fonts = {
  400: 'Geist_400Regular',
  500: 'Geist_500Medium',
  600: 'Geist_600SemiBold',
  700: 'Geist_700Bold',
} as const;
export type Weight = keyof typeof fonts;
