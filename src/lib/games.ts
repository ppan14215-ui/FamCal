/**
 * Rules of common games, so a points list counts the way the game does (Julian 01.11.:
 * "die Regeln bekannt sind und die Listen entsprechend aufgebaut sind"). Looked up by the
 * list's name, so lists made before this also count right. Only rules most families play;
 * house rules win: "Neue Partie" and plain numbers always work.
 */
import { tx } from '../i18n/lang';

export type GameRule = {
  name: string;
  re: RegExp;
  /** Fewest points win (Rommé, Phase 10, 6 nimmt). */
  lowWins?: boolean;
  /** The game ends when someone reaches this total. */
  endAt?: number;
  /** How a round is counted, one short sentence. */
  how: () => string;
  /** Turns spoken game words into plain points before the round is parsed. */
  spoken?: (said: string) => string;
};

/** Kniffel fields with a fixed value; "Julian Full House" is 25. */
const KNIFFEL_FIXED: [RegExp, number][] = [
  [/full[\s-]?house/gi, 25],
  [/kleine(n)?\s+stra(ß|ss)e|small\s+straight/gi, 30],
  [/gro(ß|ss)e(n)?\s+stra(ß|ss)e|large\s+straight/gi, 40],
  [/\bkniffel\b|\byahtzee\b/gi, 50],
];

/** Wizard: "Julian sagt 2, macht 2" is 40, a miss costs 10 per trick off. */
export const wizardPoints = (bid: number, made: number) => (bid === made ? 20 + 10 * made : -10 * Math.abs(bid - made));
const WIZARD = /([A-Za-zÄÖÜäöüß]+)\s+(?:sagt|sagte|hat angesagt|ansage|bid|bids|called)\s+(\d+)\s*,?\s*(?:und\s+)?(?:macht|hat|kriegt|bekommt|made|makes|got|gets|stiche?|tricks?)\s+(\d+)(?:\s+stiche?|\s+tricks?)?/gi;

export const GAME_RULES: GameRule[] = [
  { name: 'Rommé', re: /romm[eé]|rummy/i, lowWins: true,
    how: () => tx('Wer rauskommt, kriegt 0. Die anderen zählen ihre Karten auf der Hand. Wer auf einmal rausgeht, verdoppelt. Wenig Punkte gewinnen.', 'Whoever goes out gets 0, the others count the cards in hand. Going out at once doubles. Fewest points win.') },
  { name: 'Canasta', re: /canasta/i, endAt: 5000,
    how: () => tx('Gemeldete Karten und Canastas zählen plus, Karten auf der Hand minus. Bei 5000 ist Schluss.', 'Melds and canastas count plus, cards in hand minus. The game ends at 5000.') },
  { name: 'Uno', re: /\buno\b/i, endAt: 500,
    how: () => tx('Wer rauskommt, bekommt die Kartenpunkte der anderen. Wer zuerst 500 hat, gewinnt.', 'Whoever goes out scores the others’ cards. First to 500 wins.') },
  { name: 'Phase 10', re: /phase\s?10/i, lowWins: true,
    how: () => tx('Karten auf der Hand zählen: 1 bis 9 sind 5, 10 bis 12 sind 10, Aussetzen 15, Joker 25. Wer zuerst Phase 10 schafft, gewinnt; bei Gleichstand die wenigsten Punkte.', 'Cards in hand count: 1–9 are 5, 10–12 are 10, Skip 15, Wild 25. First through phase 10 wins, ties go to fewest points.') },
  { name: 'Kniffel', re: /kniffel|yahtzee/i,
    how: () => tx('13 Runden, jedes Feld einmal. Full House 25, kleine Straße 30, große Straße 40, Kniffel 50. Ab 63 oben gibt es 35 Bonus.', '13 rounds, each box once. Full house 25, small straight 30, large straight 40, Yahtzee 50. 63 or more on top gives a 35 bonus.'),
    spoken: (s) => KNIFFEL_FIXED.reduce((t, [re, n]) => t.replace(re, ` ${n} `), s) },
  { name: 'Wizard', re: /wizard/i,
    how: () => tx('Jeder sagt Stiche an. Getroffen: 20 plus 10 pro Stich. Daneben: minus 10 pro Stich Abstand. Sag einfach „Julian sagt 2, macht 2“.', 'Everyone bids tricks. Hit: 20 plus 10 per trick. Miss: minus 10 per trick off. Just say “Julian bids 2, makes 2”.'),
    spoken: (s) => s.replace(WIZARD, (_, who: string, bid: string, made: string) => `${who} ${wizardPoints(+bid, +made)},`) },
  { name: 'Skat', re: /\bskat\b/i,
    how: () => tx('Der Spieler bekommt den Spielwert, verloren zählt doppelt minus. Die anderen bekommen nichts.', 'The declarer scores the game value, a lost game counts double minus. The others score nothing.') },
  { name: 'Doppelkopf', re: /doppelkopf|doko/i,
    how: () => tx('Die Gewinner bekommen die Spielpunkte, die Verlierer dieselben minus. Zusammen bleibt es bei null.', 'Winners get the game points, losers the same in minus. It always adds up to zero.') },
  { name: 'Schafkopf', re: /schafkopf/i,
    how: () => tx('Gewinner bekommen den Tarif, Verlierer zahlen ihn. Zusammen bleibt es bei null.', 'Winners get the rate, losers pay it. It always adds up to zero.') },
  { name: '6 nimmt', re: /6 nimmt|sechs nimmt|take 6/i, lowWins: true, endAt: 66,
    how: () => tx('Hornochsen auf den genommenen Karten zählen. Bei 66 ist Schluss, die wenigsten gewinnen.', 'Bull heads on taken cards count. The game ends at 66, fewest win.') },
  { name: 'Hearts', re: /\bhearts\b|\bherzen\b/i, lowWins: true, endAt: 100,
    how: () => tx('Jedes Herz 1, Pik-Dame 13. Bei 100 ist Schluss, die wenigsten gewinnen.', 'Each heart 1, queen of spades 13. The game ends at 100, fewest win.') },
  { name: 'Mau Mau', re: /mau[\s-]?mau/i, lowWins: true,
    how: () => tx('Wer rauskommt, kriegt 0. Die anderen zählen ihre Karten auf der Hand. Wenig Punkte gewinnen.', 'Whoever goes out gets 0, the others count cards in hand. Fewest win.') },
  { name: 'Tichu', re: /tichu/i, endAt: 1000,
    how: () => tx('Kartenpunkte plus Tichu-Ansagen (100 oder 200). Bei 1000 ist Schluss.', 'Card points plus Tichu calls (100 or 200). The game ends at 1000.') },
  { name: 'Catan', re: /catan|siedler/i, endAt: 10,
    how: () => tx('Siegpunkte: Siedlung 1, Stadt 2, längste Straße und größte Rittermacht je 2. Wer zuerst 10 hat, gewinnt.', 'Victory points: settlement 1, city 2, longest road and largest army 2 each. First to 10 wins.') },
  { name: 'Cribbage', re: /cribbage/i, endAt: 121,
    how: () => tx('Wer zuerst 121 hat, gewinnt.', 'First to 121 wins.') },
  { name: 'Stadt Land Fluss', re: /stadt[\s-]?land[\s-]?fluss/i,
    how: () => tx('Pro Feld 10, doppelt genannt 5, als Einziger etwas 20.', 'Per box 10, same answer 5, only one with an answer 20.') },
  { name: 'Qwixx', re: /qwixx/i,
    how: () => tx('Am Ende jede Reihe nach Kreuzen zählen, Fehlwürfe minus 5.', 'At the end count each row by its crosses, misses minus 5.') },
  { name: 'Scrabble', re: /scrabble/i,
    how: () => tx('Buchstabenwerte mal Wort- und Buchstabenfelder. Am Ende Reste auf der Hand abziehen.', 'Letter values times word and letter squares. At the end subtract leftover tiles.') },
];

export const gameRule = (name: string): GameRule | undefined => GAME_RULES.find((g) => g.re.test(name));
