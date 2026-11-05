/**
 * Onboarding preview (Julian 01.11.: "das Onboarding sauber screenen, ohne dass ich alle
 * Daten verliere"). While on, the onboarding screens look like a first launch but write
 * nothing: no reset, no names, no people, no calendars, no invite. Names typed in the
 * preview live only here so the last step can greet them.
 */
let on = false;
let names: { J: string; T: string } = { J: '', T: '' };

export const isPreview = () => on;
export function startPreview() { on = true; names = { J: '', T: '' }; }
export function endPreview() { on = false; names = { J: '', T: '' }; }
export const previewNames = () => names;
export function setPreviewNames(n: { J: string; T: string }) { names = n; }
