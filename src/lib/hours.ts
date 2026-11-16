/**
 * The hours a day shows (Julian 16.11.: "Wieso geht der Tag immer noch bis 7 Uhr? Müsste sich das nicht anpassen, wie
 * lange und wie viele Termine man hat? Meine Tage gehen oft bis 21, 22 Uhr"): from the first Termin's hour to the
 * last one's end, whatever a family's day looks like. A day with little on it still shows `least` hours, so one
 * Termin does not fill the screen alone: first the morning before it (from 8), then the hours after it.
 * Spans and the result are minutes of the day.
 */
export function hourRange(spans: [number, number][], least: number): [number, number] {
  if (!spans.length) return [8 * 60, (8 + least) * 60];
  let a = 24 * 60, b = 0;
  for (const [s, e] of spans) {
    a = Math.min(a, Math.floor(s / 60) * 60);
    b = Math.max(b, Math.min(24 * 60, Math.ceil(e / 60) * 60));
  }
  const short = least * 60 - (b - a);
  if (short > 0) {
    const early = Math.min(short, Math.max(0, a - 8 * 60));
    a -= early;
    b = Math.min(24 * 60, b + short - early);
    a = Math.max(0, Math.min(a, b - least * 60));
  }
  return [a, b];
}
