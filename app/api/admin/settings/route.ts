import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config"
import { DEALER_DISCOUNT_DEFAULT_KEY, FALLBACK_DEALER_DISCOUNT } from "@/lib/app-settings"

/**
 * Operator settings the admin panel writes and the backend reads.
 *
 * Only whitelisted keys are accepted. app_settings is a key/value table, so
 * without that this route would let an admin write any key at all, including one
 * a future feature is about to rely on — a config table is worth exactly as much
 * as the discipline about what may go into it.
 *
 * Reads and writes go through the service role after an explicit admin check,
 * matching app/api/admin/users. RLS on the table already restricts it to admins;
 * this is the same belt and braces the rest of the admin API uses.
 */

const WRITABLE = {
    [DEALER_DISCOUNT_DEFAULT_KEY]: {
        /** Whole percent, 0–100. Mirrors the CHECK on promo_codes. */
        parse(raw: unknown): { value: number } | { error: string } {
            const value = Number(raw)
            if (!Number.isInteger(value) || value < 0 || value > 100) {
                return { error: "Default discount must be a whole number between 0 and 100." }
            }
            return { value }
        },
    },
} as const

type WritableKey = keyof typeof WRITABLE

async function verifyAdmin(): Promise<{ user: any; error?: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() { },
        },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) return { user: null, error: `Authentication failed: ${authError.message}` }
    if (!user) return { user: null, error: "No active session found. Please log in." }

    const admin = createAdminClient()
    const { data, error: roleError } = await admin
        .from("users").select("role").eq("id", user.id).single()
    if (roleError) return { user: null, error: `Role check failed: ${roleError.message}` }
    if (data?.role !== "admin") return { user: null, error: "Access denied." }

    return { user }
}

export async function GET() {
    const { user: caller, error: verifyError } = await verifyAdmin()
    if (!caller) return NextResponse.json({ error: verifyError }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
        .from("app_settings")
        .select("key, value")
        .eq("key", DEALER_DISCOUNT_DEFAULT_KEY)
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // An unseeded row falls back to the rate the app shipped with, so the panel
    // shows what a code would actually be issued at rather than a blank.
    const raw = Number(data?.value)
    return NextResponse.json({
        dealerDiscountDefault: Number.isFinite(raw) ? raw : FALLBACK_DEALER_DISCOUNT,
    })
}

export async function PATCH(request: NextRequest) {
    const { user: caller, error: verifyError } = await verifyAdmin()
    if (!caller) return NextResponse.json({ error: verifyError }, { status: 403 })

    const body = await request.json() as { key?: string; value?: unknown }
    const key = body.key as WritableKey | undefined

    if (!key || !(key in WRITABLE)) {
        return NextResponse.json({ error: `Unknown setting "${body.key}"` }, { status: 400 })
    }

    const parsed = WRITABLE[key].parse(body.value)
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from("app_settings").upsert({
        key,
        value: parsed.value,
        updated_at: new Date().toISOString(),
        updated_by: caller.id,
    }, { onConflict: "key" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deliberately does NOT touch existing codes: this is the rate the next code
    // is issued at. Changing what dealers already hold is a per-code action.
    return NextResponse.json({ success: true, key, value: parsed.value })
}
