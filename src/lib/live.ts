/** Is this the real app? Kept apart from cloud.ts so dates.ts can ask without loading Supabase. */
export const LIVE = !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.EXPO_PUBLIC_DEMO !== '1';
