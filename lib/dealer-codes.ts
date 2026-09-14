import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Issuing a Kane dealer code.
 *
 * A dealer code is what makes someone a Kane Dealer: the admin panel's Kane
 * Dealers tab lists exactly the users with a promo_codes row pointing at them
 * (see app/api/admin/users, which filters on dealerInfo !== null). So a member
 * who has been given book club membership but no code is not a dealer anywhere
 * the product can see, which is the gap this closes for the admin path.
 *
 * Server-only — it takes a service-role client and writes promo_codes, which is
 * admin-only under RLS. Never import this into a client component.
 *
 * The Stripe path issues its own code inline in supabase/functions/stripe-webhook
 * (Deno, a different runtime, so the two cannot literally share this module).
 * Kept deliberately in step with it: same KANE-{FIRSTNAME}-{PHONE_LAST4} shape,
 * same app_settings.dealer_discount_default, same 35 fallback.
 */

/** The rate before app_settings existed, and the rate if the setting is unusable. */
const FALLBACK_DISCOUNT = 35

/** Suffixes tried when the natural code is already someone else's. */
const MAX_DISAMBIGUATION = 50

export interface DealerCodeResult {
    code: string
    discountPercent: number
    /** False when the member already had one and nothing was written. */
    created: boolean
}

/**
 * The rate new codes are issued at, as the admin has configured it.
 *
 * Falls back to 35 rather than failing: a missing or malformed setting should
 * issue a normal code, not a 0% one and not none at all.
 */
async function newCodeDiscount(admin: SupabaseClient): Promise<number> {
    const { data, error } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "dealer_discount_default")
        .maybeSingle()

    if (error) {
        console.error("[dealer-codes] could not read dealer_discount_default, using 35:", error.message)
        return FALLBACK_DISCOUNT
    }

    const configured = Number(data?.value)
    if (Number.isInteger(configured) && configured >= 0 && configured <= 100) return configured

    if (data !== null && data !== undefined) {
        console.error("[dealer-codes] dealer_discount_default is not a whole 0-100 percent, using 35:", data?.value)
    }
    return FALLBACK_DISCOUNT
}

/**
 * Give this member a dealer code, unless they already have one.
 *
 * Idempotent: a member who already holds a code keeps it, with its accumulated
 * total_uses and whatever rate an admin has since set on it. Promoting someone
 * twice does not mint a second code or reset the first.
 *
 * Never reassigns a code that belongs to someone else. The natural code is
 * KANE-{FIRSTNAME}-{PHONE_LAST4}, which is NOT unique in practice — measured
 * against live data, two production members and three on staging all resolve to
 * the same string, because a shared surname-less first name and a shared phone
 * are ordinary. `code` carries a UNIQUE constraint, so an upsert on conflict
 * would rewrite the existing row's owner_id and hand one member's code, and its
 * use count, to another. This appends -2, -3 … instead.
 */
export async function ensureDealerCode(
    admin: SupabaseClient,
    userId: string,
): Promise<{ result: DealerCodeResult } | { error: string }> {
    // Already a dealer? Leave everything exactly as it is.
    const { data: existing, error: existingError } = await admin
        .from("promo_codes")
        .select("code, discount_percent")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)

    if (existingError) return { error: `Could not check for an existing code: ${existingError.message}` }
    if (existing?.length) {
        return {
            result: {
                code: existing[0].code,
                discountPercent: existing[0].discount_percent,
                created: false,
            },
        }
    }

    const { data: user, error: userError } = await admin
        .from("users")
        .select("full_name, display_name, phone")
        .eq("id", userId)
        .maybeSingle()

    if (userError) return { error: `Could not read the member: ${userError.message}` }
    if (!user) return { error: "That member no longer exists." }

    // Same derivation as the webhook. Non-alphanumerics are stripped so a name
    // like "O'Brien" or "Anne-Marie" cannot produce a code with punctuation in
    // it that nobody can read out over a phone.
    const rawName = user.full_name || user.display_name || "MEMBER"
    const firstName =
        rawName.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, "") || "MEMBER"
    const phoneLast4 = (user.phone || "").replace(/\D/g, "").slice(-4).padStart(4, "0")
    const base = `KANE-${firstName}-${phoneLast4}`

    // One query for every code already in this family, rather than a probe per
    // candidate.
    const { data: taken, error: takenError } = await admin
        .from("promo_codes")
        .select("code")
        .like("code", `${base}%`)

    if (takenError) return { error: `Could not check code availability: ${takenError.message}` }

    const used = new Set((taken ?? []).map((r) => r.code))
    let code = base
    for (let n = 2; used.has(code) && n <= MAX_DISAMBIGUATION; n++) code = `${base}-${n}`
    if (used.has(code)) return { error: `Could not find a free code based on ${base}.` }

    const discountPercent = await newCodeDiscount(admin)

    // insert, not upsert: if this races another issue for the same string the
    // unique constraint must reject it, not silently take the other row over.
    const { error: insertError } = await admin.from("promo_codes").insert({
        code,
        discount_percent: discountPercent,
        is_active: true,
        owner_id: userId,
    })

    if (insertError) return { error: `Could not create the dealer code: ${insertError.message}` }

    return { result: { code, discountPercent, created: true } }
}
