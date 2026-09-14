import { IS_STAGING_TARGET } from "@/lib/supabase/config"

/**
 * Which Stripe account the browser talks to.
 *
 * Mirrors lib/supabase/config.ts: a staging-prefixed variable wins when
 * present, so Preview can run against the Stripe sandbox without overwriting
 * the production key.
 *
 *   NEXT_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY  -> pk_test_... (sandbox)
 *
 * ⚠️  Set it on the PREVIEW environment ONLY.
 *
 * This pairing is easy to get half-right and the failure is confusing. The
 * publishable key lives in the browser bundle; the secret key lives in the
 * Supabase Edge Function. They must belong to the SAME Stripe mode:
 *
 *   test secret + test publishable   -> works
 *   test secret + LIVE publishable   -> "No such payment_intent" at confirm
 *   LIVE secret + LIVE publishable   -> works, and charges a real card
 *
 * The last row is why assertStripeMode() shouts rather than shrugs.
 */

export const STRIPE_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

export const STRIPE_MODE: "test" | "live" | "unknown" =
    STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ? "test"
        : STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_") ? "live"
            : "unknown"

/**
 * Warn when the Stripe mode and the Supabase target disagree.
 *
 * A deployment pointed at the staging database has no business holding a live
 * Stripe key: either checkout breaks on a mode mismatch, or — if the secret key
 * is live too — a test purchase charges a real card. Runs in the browser as
 * well as on the server, since the publishable key is what the browser uses.
 */
export function assertStripeMode(): void {
    if (IS_STAGING_TARGET && STRIPE_MODE === "live") {
        console.error(
            "🚨 Stripe is in LIVE mode while Supabase points at STAGING. " +
            "Set NEXT_PUBLIC_STRIPE_STAGING_PUBLISHABLE_KEY to your pk_test_ key. " +
            "Checkout will fail on a key mismatch — or take a real payment if the " +
            "secret key is live too.",
        )
    }
    if (STRIPE_MODE === "unknown") {
        console.error("🚨 Stripe publishable key is missing or malformed.")
    }
}
