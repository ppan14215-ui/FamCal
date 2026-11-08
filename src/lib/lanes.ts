/**
 * Side by side, like Apple and Google (Julian 08.11.: "wir beide arbeiten
 * gleichzeitig"). Blocks that overlap in time share the column: each gets its
 * own lane and keeps its own colour, nothing is drawn over anything else.
 * Only blocks that really overlap get narrower; the rest stay full width.
 */
export type Lane = { lane: number; lanes: number };

/** items: top and bottom in any unit (minutes or pixels). order breaks ties, so a person always keeps the same side. */
export function lanes<T>(items: T[], span: (x: T) => [number, number], order: (x: T) => number = () => 0, side?: (x: T) => string): Map<T, Lane> {
  const out = new Map<T, Lane>();
  const sorted = [...items].sort((a, b) => span(a)[0] - span(b)[0] || order(a) - order(b) || span(b)[1] - span(a)[1]);
  let group: { x: T; lane: number }[] = [];
  let ends: number[] = [];
  let groupEnd = -Infinity;
  const close = () => {
    const n = Math.max(1, ends.length);
    // One block per person (work): Julian left, Sophia right, every time, not whoever starts first.
    if (side && group.length > 1) {
      const keys = [...new Set(group.map((g) => side(g.x)))].sort();
      if (keys.length === group.length) { for (const g of group) out.set(g.x, { lane: keys.indexOf(side(g.x)), lanes: keys.length }); group = []; ends = []; return; }
    }
    for (const g of group) out.set(g.x, { lane: g.lane, lanes: n });
    group = [];
    ends = [];
  };
  for (const x of sorted) {
    const [a, b] = span(x);
    if (a >= groupEnd) { close(); groupEnd = -Infinity; }
    let lane = ends.findIndex((end) => end <= a);
    if (lane < 0) { lane = ends.length; ends.push(b); } else ends[lane] = b;
    group.push({ x, lane });
    groupEnd = Math.max(groupEnd, b);
  }
  close();
  return out;
}
