/** Eine gesagte Uhrzeit für die Sprechkarte (Julian 08.11.). Ohne Imports, damit sie sich leicht prüfen lässt. */
const WORDS: Record<string, number> = {
  eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, 'zwölf': 12, zwoelf: 12,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, noon: 12, mittag: 12, mittags: 12,
};
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Eine gesagte Uhrzeit: "15 Uhr", "um drei", "halb vier", "3 pm", "ganztägig".
 * Ohne Tageszeit gelten 1 bis 7 als Nachmittag (ein Termin um 3 ist fast nie nachts).
 */
export function parseHour(said: string): string | 'allday' | null {
  const t = said.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/ganzt[aä]g|den ganzen tag|all day|whole day|ganzer tag/.test(t)) return 'allday';
  let h = -1, m = 0;
  const half = t.match(/halb (\d{1,2}|[a-zäöü]+)/);
  const dig = t.match(/(\d{1,2})(?:[:.h ](\d{2}))?/);
  if (half) {
    const v = /\d/.test(half[1]) ? Number(half[1]) : WORDS[half[1]];
    if (v) { h = v - 1; m = 30; }
  } else if (dig) {
    h = Number(dig[1]); m = dig[2] ? Number(dig[2]) : 0;
  } else {
    const w = t.split(' ').find((x) => WORDS[x] !== undefined);
    if (w) h = WORDS[w];
  }
  if (h < 0 || h > 24 || m > 59) return null;
  if (/viertel nach/.test(t)) m = 15;
  if (/abends|nachmittags|\bpm\b|evening|afternoon|nachts/.test(t) && h < 12) h += 12;
  else if (!/morgens|früh|frueh|vormittags|\bam\b|morning/.test(t) && h >= 1 && h <= 7) h += 12;
  if (h === 24) h = 0;
  return `${pad2(h)}:${pad2(m)}`;
}
