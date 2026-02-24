import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

// ─── Guard: verify the caller is an admin ──────────────────────────────────
async function verifyAdmin(): Promise<{ user: any; error?: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { },
            },
        }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) return { user: null, error: `Authentication failed: ${authError.message}` }
    if (!user) return { user: null, error: "No active session found. Please log in." }

    // Check role via admin client
    const admin = createAdminClient()
    const { data, error: roleError } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (roleError) return { user: null, error: `Role check failed: ${roleError.message}` }
    if (data?.role !== "admin") return { user: null, error: `Access denied: User role is "${data?.role}", not "admin".` }

    return { user }
}

// ─── GET: list all users with their subscription plan ─────────────────────
export async function GET(request: NextRequest) {
    const { user: caller, error: verifyError } = await verifyAdmin()
    if (!caller) return NextResponse.json({ error: verifyError }, { status: 403 })

    const admin = createAdminClient()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") ?? ""
    const tier = searchParams.get("tier") ?? "all" // "all" | "premium"

    // Fetch users (admin client bypasses RLS)
    let query = admin
        .from("users")
        .select(`
            id,
            full_name,
            display_name,
            email,
            role,
            is_banned,
            created_at,
            last_active_at,
            deleted_at,
            user_subscriptions (
                plan,
                status,
                started_at
            ),
            user_library (
                id
            )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200)

    if (q) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: users, error } = await query

    if (error) {
        console.error("Admin users fetch error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalise the nested arrays into flat fields
    const normalised = (users ?? []).map(u => {
        const sub = Array.isArray(u.user_subscriptions)
            ? u.user_subscriptions[0]
            : u.user_subscriptions

        // Ensure libraryCount is the actual length of the returned array
        const libraryCount = Array.isArray(u.user_library)
            ? u.user_library.length
            : 0

        return {
            id: u.id,
            name: u.full_name ?? u.display_name ?? "—",
            email: u.email,
            role: u.role,
            isBanned: u.is_banned,
            joinDate: u.created_at,
            lastActive: u.last_active_at,
            booksOwned: libraryCount,
            plan: (sub?.plan ?? "free") as "free" | "premium",
            subscriptionStatus: sub?.status ?? null,
        }
    })

    // Filter by tier client-side after normalisation
    const filtered = tier === "premium"
        ? normalised.filter(u => u.plan === "premium")
        : normalised

    return NextResponse.json({ users: filtered })
}

// ─── POST: add a book to user's library ───────────────────────────────
export async function POST(request: NextRequest) {
    const { user: caller, error: verifyError } = await verifyAdmin()
    if (!caller) return NextResponse.json({ error: verifyError }, { status: 403 })

    const body = await request.json() as {
        userId: string
        bookId: string
    }

    if (!body.userId || !body.bookId) {
        return NextResponse.json({ error: "Missing userId or bookId" }, { status: 400 })
    }

    const admin = createAdminClient()

    // check if already exists
    const { data: existing } = await admin
        .from("user_library")
        .select("id")
        .eq("user_id", body.userId)
        .eq("book_id", body.bookId)
        .single()

    if (existing) {
        return NextResponse.json({ error: "User already owns this book" }, { status: 400 })
    }

    const { error } = await admin
        .from("user_library")
        .insert({
            user_id: body.userId,
            book_id: body.bookId,
            source: "admin_gift"
        })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, action: "add_to_library" })
}

// ─── PATCH: update subscription tier or ban status ────────────────────────
export async function PATCH(request: NextRequest) {
    const { user: caller, error: verifyError } = await verifyAdmin()
    if (!caller) return NextResponse.json({ error: verifyError }, { status: 403 })

    const body = await request.json() as {
        userId: string
        action: "set_plan" | "ban" | "unban" | "set_role"
        plan?: "free" | "premium"
        role?: "reader" | "admin"
    }

    if (!body.userId || !body.action) {
        return NextResponse.json({ error: "Missing userId or action" }, { status: 400 })
    }

    // Prevent admin from acting on themselves
    if (body.userId === caller.id) {
        return NextResponse.json({ error: "You cannot modify your own account." }, { status: 400 })
    }

    const admin = createAdminClient()

    if (body.action === "set_plan") {
        if (!body.plan) return NextResponse.json({ error: "Missing plan" }, { status: 400 })

        if (body.plan === "premium") {
            // Upsert subscription to premium
            const { error } = await admin.from("user_subscriptions").upsert({
                user_id: body.userId,
                plan: "premium",
                status: "active",
                started_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        } else {
            // Downgrade to free — update existing subscription
            const { error } = await admin.from("user_subscriptions").upsert({
                user_id: body.userId,
                plan: "free",
                status: "active",
                cancelled_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, action: "set_plan", plan: body.plan })
    }

    if (body.action === "ban") {
        const { error } = await admin.from("users").update({ is_banned: true }).eq("id", body.userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Also update subscription status to expired
        await admin.from("user_subscriptions").update({ status: 'expired' }).eq("user_id", body.userId)

        // Trigger USER_BANNED event via email-ops Edge Function
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-ops`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                    event: "USER_BANNED",
                    userId: body.userId
                })
            })
        } catch (e) {
            console.error("Failed to trigger email-ops for banning:", e)
        }

        return NextResponse.json({ success: true, action: "ban" })
    }

    if (body.action === "unban") {
        const { error } = await admin.from("users").update({ is_banned: false }).eq("id", body.userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, action: "unban" })
    }

    if (body.action === "set_role") {
        if (!body.role) return NextResponse.json({ error: "Missing role" }, { status: 400 })
        const { error } = await admin.from("users").update({ role: body.role }).eq("id", body.userId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, action: "set_role", role: body.role })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
