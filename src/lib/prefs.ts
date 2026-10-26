/**
 * Small per-device preferences. On the web link they live in localStorage,
 * in the native prototype only for the session (no storage package yet).
 */
const mem: Record<string, string> = {};
const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };

export function getPref(k: string): string | undefined {
  try { return ls()?.getItem(`famcal.${k}`) ?? mem[k]; } catch { return mem[k]; }
}
export function setPref(k: string, v: string) {
  mem[k] = v;
  try { ls()?.setItem(`famcal.${k}`, v); } catch {}
}
