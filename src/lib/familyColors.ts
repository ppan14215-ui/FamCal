/**
 * The parents' colours belong to the family (Julian 17.11.: "Ja, und Farben für beide Handys"), so both phones
 * show the same. They live on families.colors as the place in the colour row by role, e.g. {"J": 2, "T": 1}.
 * Kids and grandparents already carry their colour on family_people. Pure helpers, no network; sync.ts uses them.
 */
export type Role = 'J' | 'T';
export type FamilyColors = Partial<Record<Role, number>>;
export const ROLES: Role[] = ['J', 'T'];
/** The colours a new family starts with. */
export const STANDARD: Record<Role, number> = { J: 0, T: 1 };

/** Only J and T, only a whole number inside the colour row. Anything else is dropped and the standard colour holds. */
export function cleanColors(v: unknown, size: number): FamilyColors {
  const out: FamilyColors = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const p of ROLES) {
    const i = (v as Record<string, unknown>)[p];
    if (typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < size) out[p] = i;
  }
  return out;
}

export const sameColors = (a: FamilyColors, b: FamilyColors) => a.J === b.J && a.T === b.T;

/**
 * What goes up: the server's colours with only the roles chosen on this phone laid over them. The whole object
 * is written, so without this one phone would write over the colour the other one just set.
 */
export function mergeColors(server: FamilyColors, mine: Record<Role, number>, unsent: Iterable<Role>): FamilyColors {
  const next: FamilyColors = { ...server };
  for (const p of unsent) next[p] = mine[p];
  return next;
}

/** Roles whose colour here follows the family: the family has one, it differs, and no choice made here is waiting. */
export function rolesToTake(family: FamilyColors, mine: Record<Role, number>, unsent: ReadonlySet<Role>): Role[] {
  return ROLES.filter((p) => family[p] !== undefined && !unsent.has(p) && mine[p] !== family[p]);
}

/** A family without a colour for a role takes this phone's once, if this phone chose one. */
export function firstUpload(family: FamilyColors, mine: Record<Role, number>): Role[] {
  return ROLES.filter((p) => family[p] === undefined && mine[p] !== STANDARD[p]);
}
