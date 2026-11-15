/**
 * "Nur dieser Termin": one day leaves its series and becomes a Termin of its own, with a new id. The sheet that opened
 * the day still holds the day's old id and showed the series' day and time after the change. While that sheet is open
 * it follows to the new Termin; when it closes the note is dropped, so the old id means the series again.
 */
const to = new Map<string, string>();

/** The store notes it the moment the day is split off, before the events change. */
export const noteSplit = (from: string, id: string) => { to.set(from, id); };
export const splitOf = (id?: string) => (id ? to.get(id) : undefined);
export const dropSplit = (id?: string) => { if (id) to.delete(id); };
