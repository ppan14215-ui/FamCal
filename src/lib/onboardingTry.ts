/**
 * What was tried in the onboarding (inspiration review 01.11.: what you enter becomes real content).
 * The partner step shows this Termin on the partner's phone; the last step points at it.
 */
import type { CalEvent } from '../state/types';

let tried: CalEvent | null = null;
export const triedEvent = () => tried;
export function setTriedEvent(e: CalEvent | null) { tried = e; }
