/**
 * Where the plus was tapped (Julian 14.11.2026: the plus menu grows out of the plus instead of sliding up as a
 * sheet). The button notes its place just before it opens "/neu"; the menu takes it once. Without a place (the plus
 * in the input, Memo without the assistant) the menu rises above the nav.
 */
export type PlusFrom = { x: number; y: number; size: number };

let from: PlusFrom | null = null;
let at = 0;

export function setPlusFrom(f: PlusFrom | null) { from = f; at = Date.now(); }

/** The place, if it was noted just now; it is used once. */
export function takePlusFrom(): PlusFrom | null {
  const f = from && Date.now() - at < 1500 ? from : null;
  from = null;
  return f;
}
