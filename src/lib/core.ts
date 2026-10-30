/**
 * Julian 30.10.: "Wir müssen simplifizieren. Zurück zum eigentlichen Kern."
 * The core is the shared calendar, lists (a dish or a recipe link still fills
 * the shopping list) and the chat as log and input. Everything else stays in
 * the code but is hidden, so it neither confuses nor breaks.
 */
export const HIDDEN = {
  /** Aufgaben as their own tab; reminders go on the list "Zu erledigen" instead. */
  tasks: true,
  /** Rommé and other points lists. */
  points: true,
  /** Scores and stars on films, series and books. */
  ratings: true,
  /** "Mitdenken": things to bring offered under a new Termin (U-Heft, Impfpass). */
  suggestions: true,
} as const;
