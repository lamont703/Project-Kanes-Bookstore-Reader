import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

interface SubscriptionRequest {
    name: string
    email: string
    phone?: string
    address: string
    dob: string
    tshirtSize: string
    selectedBookIds: string[]   // exactly 2 real book IDs from the DB
}

export async function POST(request: NextRequest) {
    try {
        // ── 1. Authenticate the user ───────────────────────────
        const cookieStore = await cookies()
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { /* read-only in route handlers */ },
                },
            }
        )

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Authentication required." }, { status: 401 })
        }

        // ── 2. Parse + validate the body ───────────────────────
        const body: SubscriptionRequest = await request.json()

        if (!body.name?.trim() || !body.email?.trim() || !body.address?.trim() ||
            !body.dob || !body.tshirtSize) {
            return NextResponse.json({ error: "Missing required profile fields." }, { status: 400 })
        }

        if (!body.selectedBookIds || body.selectedBookIds.length !== 2) {
            return NextResponse.json({ error: "Exactly 2 books must be selected." }, { status: 400 })
        }

        // ── 3. Use admin client for privileged writes ──────────
        const admin = createAdminClient()

        // ── 4. Guard: block if already premium ─────────────────
        const { data: existing } = await admin
            .from("user_subscriptions")
            .select("id, plan")
            .eq("user_id", user.id)
            .single()

        if (existing?.plan === "premium") {
            return NextResponse.json({ error: "You already have an active premium membership." }, { status: 409 })
        }

        // ── 5. Validate selected books exist ───────────────────
        const { data: books, error: bookErr } = await admin
            .from("books")
            .select("id")
            .in("id", body.selectedBookIds)
            .eq("status", "published")

        if (bookErr || !books || books.length !== 2) {
            return NextResponse.json({ error: "One or more selected books are invalid." }, { status: 400 })
        }

        // ── 6. Update user profile (tshirt_size, address, dob, phone, display_name) ──
        const { error: profileErr } = await admin
            .from("users")
            .update({
                full_name: body.name.trim(),
                display_name: body.name.trim().split(" ")[0],
                phone: body.phone?.trim() || null,
                mailing_address: body.address.trim(),
                date_of_birth: body.dob,
                tshirt_size: body.tshirtSize as
                    "xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl",
            })
            .eq("id", user.id)

        if (profileErr) {
            console.error("Profile update error:", profileErr)
            return NextResponse.json({ error: "Failed to update profile information." }, { status: 500 })
        }

        // ── 7. Upsert subscription row ─────────────────────────
        const nextBilling = new Date()
        nextBilling.setMonth(nextBilling.getMonth() + 1)

        const { error: subErr } = await admin
            .from("user_subscriptions")
            .upsert({
                user_id: user.id,
                plan: "premium",
                status: "active",
                initial_fee_paid: 49.99,
                monthly_rate: 3.99,
                selected_book_ids: body.selectedBookIds,
                started_at: new Date().toISOString(),
                expires_at: null,
                cancelled_at: null,
            }, { onConflict: "user_id" })

        if (subErr) {
            console.error("Subscription upsert error:", subErr)
            return NextResponse.json({ error: "Failed to activate subscription." }, { status: 500 })
        }

        // ── 8. Add selected books to user_library ──────────────
        const libraryEntries = body.selectedBookIds.map(bookId => ({
            user_id: user.id,
            book_id: bookId,
            source: "subscription_signup" as const,
        }))

        const { error: libraryErr } = await admin
            .from("user_library")
            .upsert(libraryEntries, { onConflict: "user_id,book_id" })

        if (libraryErr) {
            console.error("Library upsert error:", libraryErr)
            // Non-fatal — subscription is already active, just log
        }

        // ── 9. Generate a Kane Dealer promo code ───────────────
        // Format: KANE-{FIRSTNAME}-{PHONE_LAST4 or random 4 digits}
        const firstName = body.name.trim().split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "")
        const phoneLast4 = (body.phone?.replace(/\D/g, "") ?? "").slice(-4).padStart(4, "0")
        const promoCode = `KANE-${firstName}-${phoneLast4}`

        // Insert promo code — ignore conflict if already exists
        await admin
            .from("promo_codes")
            .insert({
                owner_id: user.id,
                code: promoCode,
                discount_percent: 35,
                is_active: true,
            })
            .select()
        // Silently ignore duplicate code errors (user may have one already)

        // ── 10. Return success ─────────────────────────────────
        return NextResponse.json({
            success: true,
            promoCode,
            booksAdded: body.selectedBookIds.length,
            message: "Welcome to Kane's Komet Book Club! Your membership is now active.",
        })

    } catch (err: any) {
        console.error("Subscription route error:", err)
        return NextResponse.json({ error: err.message || "An unexpected error occurred." }, { status: 500 })
    }
}
