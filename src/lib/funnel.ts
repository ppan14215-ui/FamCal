/**
 * Onboarding funnel helpers (see EVENTS in analytics.ts). The preview from Einstellungen never counts:
 * it is Julian looking at the screens, not a new family.
 */
import { isPreview } from './vorschau';
import { trackOnce, track, setPerson } from './analytics';
import { navStyle } from './navStyle';
import { getPref } from './prefs';

let startedAt = 0;

export function stepViewed(step: string, flow: 'v3' | 'flow' = 'v3', index?: number) {
  if (isPreview()) return;
  if (!startedAt) startedAt = Date.now();
  trackOnce(`${flow}:${step}`, 'onboarding_step_viewed', { step, flow, index });
}

export function onboardingDone(flow: 'v3' | 'flow' = 'v3') {
  if (isPreview()) return;
  trackOnce(flow, 'onboarding_completed', {
    flow,
    nav_style: navStyle(),
    time_picker: getPref('wann') === 'text' ? 'keyboard' : 'calendar',
    ms_total: startedAt ? Date.now() - startedAt : undefined,
  });
}

export function inviteSent(method: 'share' | 'copy', source: 'onboarding' | 'settings') {
  if (isPreview()) return;
  track('partner_invite_sent', { method, source });
}

export function calendarConnected(provider: string, calendars: number) {
  if (isPreview() || !calendars) return;
  track('calendar_connected', { provider, calendars, source: 'onboarding' });
}

/** Bottom navigation chosen (onboarding or settings); also kept on the person so every funnel can be split by it. */
export function chooseNav(style: string, source: 'onboarding' | 'settings', previous?: string) {
  if (isPreview()) return;
  track('nav_style_chosen', { style, source, previous });
  setPerson({ nav_style: style });
}
