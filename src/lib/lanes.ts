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

/**
 * More at once than fit side by side (a family of seven in a week's narrow column): the first `max - 1` lanes stay,
 * the others fold into one "+N" in the last lane, from the first folded start to the last folded end.
 */
export type More<T> = { top: number; bottom: number; items: T[] };
export function fold<T>(laneOf: Map<T, Lane>, span: (x: T) => [number, number], max: number): { shown: Map<T, Lane>; more: More<T>[] } {
  const shown = new Map<T, Lane>();
  const more: More<T>[] = [];
  const crowded: T[] = [];
  for (const [x, l] of laneOf) { if (l.lanes > max) crowded.push(x); else shown.set(x, l); }
  crowded.sort((a, b) => span(a)[0] - span(b)[0]);
  let group: T[] = [];
  let end = -Infinity;
  const close = () => {
    const hidden = group.filter((x) => laneOf.get(x)!.lane >= max - 1);
    for (const x of group) if (laneOf.get(x)!.lane < max - 1) shown.set(x, { lane: laneOf.get(x)!.lane, lanes: max });
    if (hidden.length === 1) shown.set(hidden[0], { lane: max - 1, lanes: max });
    else if (hidden.length) more.push({ top: Math.min(...hidden.map((x) => span(x)[0])), bottom: Math.max(...hidden.map((x) => span(x)[1])), items: hidden });
    group = [];
  };
  for (const x of crowded) {
    const [a, b] = span(x);
    if (a >= end) { close(); end = -Infinity; }
    group.push(x);
    end = Math.max(end, b);
  }
  close();
  return { shown, more };
}
