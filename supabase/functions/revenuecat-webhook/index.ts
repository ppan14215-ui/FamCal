// RevenueCat webhook -> families.plus_until (Julian 05.11.2026: "Revenue Cat properly placed").
//
// Why on the server: Plus must never be set by the phone. In Namore a client RPC let any signed-in user grant
// themselves premium; the fix was this webhook with the service key. FamCal starts that way.
//
// RevenueCat dashboard > Integrations > Webhooks:
//   URL                   https://jzfubxcdpznzxqtvnodm.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header  the value of the secret RC_WEBHOOK_SECRET (compared verbatim)
//   Environment           Production and Sandbox (sandbox only marks, never grants in production families)
// Deploy with --no-verify-jwt (RevenueCat sends no Supabase JWT; the header above is the check).
//
// Secrets: RC_WEBHOOK_SECRET (required), POSTHOG_KEY (optional, FamCal project token; then purchase events are
// sent to PostHog from here, exact even when the phone dies right after paying).
// The app user id in RevenueCat is the Supabase user id (src/lib/purchases.ts), so the family is found through
// family_members. Plus belongs to the family: both partners have it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

type RcEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  environment?: string;
  store?: string;
  price?: number | null;
  currency?: string | null;
  period_type?: string;
};

const GRANT = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "TRANSFER", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT"]);
const END = new Set(["EXPIRATION"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const secret = Deno.env.get("RC_WEBHOOK_SECRET");
  if (!secret || req.headers.get("authorization") !== secret) return new Response("forbidden", { status: 403 });
  let ev: RcEvent;
  try { ev = (await req.json()).event; } catch { return new Response("bad json", { status: 400 }); }
  if (!ev?.id || !ev.type) return new Response("no event", { status: 400 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Each RevenueCat event once (it retries on any non-200).
  const seen = await db.from("revenuecat_events").insert({ id: ev.id, type: ev.type, app_user_id: ev.app_user_id ?? null, payload: ev }).select("id");
  if (seen.error) {
    if (seen.error.code === "23505") return new Response("dup", { status: 200 });
    return new Response(seen.error.message, { status: 500 });
  }

  const ids = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])].filter((x): x is string => !!x && UUID.test(x));
  if (!ids.length) return new Response("no supabase user", { status: 200 });
  const mem = await db.from("family_members").select("family_id, user_id").in("user_id", ids).limit(1);
  const familyId = mem.data?.[0]?.family_id as string | undefined;
  const userId = mem.data?.[0]?.user_id as string | undefined;
  if (!familyId) return new Response("no family", { status: 200 });

  const sandbox = ev.environment === "SANDBOX";
  const until = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  if (!sandbox && (GRANT.has(ev.type) || END.has(ev.type))) {
    const { error } = await db.from("families").update({ plus_until: until }).eq("id", familyId);
    if (error) return new Response(error.message, { status: 500 });
  }

  const ph = Deno.env.get("POSTHOG_KEY");
  if (ph && userId) {
    const name = ev.type === "INITIAL_PURCHASE" ? (ev.period_type === "TRIAL" ? "trial_started" : "purchase_completed")
      : ev.type === "RENEWAL" ? "subscription_renewed"
      : ev.type === "CANCELLATION" ? "subscription_cancelled"
      : ev.type === "EXPIRATION" ? "subscription_expired"
      : ev.type === "BILLING_ISSUE" ? "billing_issue" : null;
    if (name) {
      await fetch("https://eu.i.posthog.com/capture/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: ph, event: name, distinct_id: userId,
          timestamp: ev.event_timestamp_ms ? new Date(ev.event_timestamp_ms).toISOString() : undefined,
          properties: { product: ev.product_id, store: ev.store, price: ev.price, currency: ev.currency, sandbox, $groups: { family: familyId }, source: "revenuecat" },
        }),
      }).catch(() => {});
    }
  }
  return new Response("ok", { status: 200 });
});
