/**
 * Icons that are one piece still get their own little story (Julian 31.10.:
 * "Animationen, die nicht einfach nur Hüpfen sind"). The whole picture moves
 * the way the thing moves: rackets swing, cars drive off and come back, the
 * plane takes off, the phone rings, the heart beats. Hop stays the default
 * for the few icons nothing fits.
 */
import type { ClayName } from './clayIcons';

export type WholeKind = 'swing' | 'drive' | 'fly' | 'roll' | 'rock' | 'ring' | 'beat' | 'shine' | 'buzz' | 'pour' | 'sway' | 'drum' | 'scrub' | 'drift' | 'drop' | 'turn' | 'pump';

const groups: Record<WholeKind, string[]> = {
  swing: ['tennis', 'badminton', 'squash', 'tischtennis', 'golf', 'hockey', 'cricket', 'fechten', 'darts'],
  drive: ['zug', 'schulbus', 'radfahren', 'laufrad', 'skateboard', 'inline-skaten', 'umzug', 'bowling', 'schlittschuhlaufen', 'ski', 'snowboard', 'laufen', 'rollstuhl', 'reise', 'termin-verschieben'],
  fly: ['flugzeug', 'surfen'],
  roll: ['ball', 'fussball', 'basketball', 'volleyball', 'handball', 'rugby', 'boule', 'gesellschaftsspiel'],
  rock: ['schwimmen', 'segeln', 'kanu', 'rudern', 'stand-up-paddling', 'babybett', 'mobile', 'schlafsack', 'waage', 'reiten'],
  ring: ['telefon', 'uhr', 'stoppuhr', 'babyphone', 'rassel'],
  beat: ['herz', 'gluehbirne', 'blutdruck', 'sparschwein', 'schnuller', 'foto', 'kamera-scan', 'geburtstagskrone', 'prioritaet'],
  shine: ['sonne', 'wolke-sonne', 'mond'],
  buzz: ['bohrmaschine', 'medizin', 'thermometer', 'werkzeugkasten', 'rasenmaeher', 'waschmaschine', 'geschirrspueler', 'heckenschere', 'milchpumpe', 'friseur', 'termin-absagen'],
  pour: ['giesskanne', 'tee', 'wassertrinken', 'flaeschchen', 'cafe'],
  sway: ['tanzen', 'mikrofon', 'pflanze', 'kuscheltier', 'haustier', 'hundeleine', 'massage', 'saeen', 'wandern', 'einkauf', 'rucksack', 'wickeltasche'],
  drum: ['musik'],
  scrub: ['besen', 'fensterputzen', 'buegeleisen', 'staubsauger', 'hautpflege', 'sonnencreme', 'manikuere', 'haendewaschen'],
  drift: ['wolke', 'regen', 'gewitter', 'meditation', 'schlafmaske', 'ausflug'],
  drop: ['ort', 'anheften', 'fussabdruck', 'spielplatz', 'sandkasten', 'zuhause', 'puzzle', 'termin-hinzufuegen', 'tagesplan', 'wochenplan', 'monatsplan'],
  turn: ['schluessel', 'einstellungen', 'suchen', 'recycling'],
  pump: ['fitness', 'klettern', 'turnen', 'pilates', 'yogamatte', 'kampfsport', 'boxen'],
};

export const clayWhole: Partial<Record<ClayName, WholeKind>> = Object.fromEntries(
  (Object.entries(groups) as [WholeKind, string[]][]).flatMap(([k, names]) => names.map((n) => [n, k])),
) as any;

/** Where the whole icon turns: a racket at its grip, a can at its foot, the rest near the bottom. */
export const wholeOrigin: Record<WholeKind, string> = {
  swing: '28% 82%', drive: '50% 90%', fly: '50% 60%', roll: '50% 50%', rock: '50% 85%', ring: '50% 40%',
  beat: '50% 60%', shine: '50% 50%', buzz: '50% 80%', pour: '62% 80%', sway: '50% 95%', drum: '50% 80%',
  scrub: '50% 85%', drift: '50% 50%', drop: '50% 95%', turn: '50% 50%', pump: '50% 90%',
};

const ORIGIN_OF: Partial<Record<string, string>> = { badminton: '78% 84%', golf: '82% 18%', hockey: '82% 18%', darts: '50% 50%', fechten: '20% 80%' };
export const originOf = (name: string, kind: WholeKind) => ORIGIN_OF[name] ?? wholeOrigin[kind];
