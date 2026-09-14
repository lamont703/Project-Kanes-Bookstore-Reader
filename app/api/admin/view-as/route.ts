import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadViewAsTarget } from "@/lib/view-as/server"
import {
    VIEW_AS_COOKIE,
    VIEW_AS_LABEL_COOKIE,
    VIEW_AS_MAX_AGE,
} from "@/lib/view-as/constants"
import type { ViewAsTarget } from "@/lib/view-as/types"

/**
 * Start, read and stop a read-only "View As" session.
 *
 * The only thing this writes is a pair of cookies; it never touches the admin's
 * Supabase session and never mints one for the target. See lib/view-as/types.ts
 * for why the resulting view is read-only.
 */

async function verifyAdmin(): Promise<{ user: any; admin: any } | null> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (data?.role !== "admin") return null
    return { user, admin }
}

/**
 * The client-readable half of the pair. Display only — the httpOnly cookie is
 * what any server decision is made from.
 *
 * base64url, not base64: the value survives cookie serialisation without '+',
 * '/' or '=' having to be escaped and unescaped on the way back out.
 */
function labelFor(target: ViewAsTarget): string {
    return Buffer.from(
        JSON.stringify({
            id: target.id,
            name: target.name,
            email: target.email,
            plan: target.plan,
            isPremium: target.isPremium,
            role: target.role,
            isBanned: target.isBanned,
        })
    ).toString("base64url")
}

const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: VIEW_AS_MAX_AGE,
}

// ─── GET: who, if anyone, is being viewed right now ───────────────────────────
export async function GET() {
    const session = await verifyAdmin()
    if (!session) {
        return NextResponse.json({ isAdmin: false, viewingAs: null })
    }

    const cookieStore = await cookies()
    const targetId = cookieStore.get(VIEW_AS_COOKIE)?.value
    if (!targetId) {
        return NextResponse.json({ isAdmin: true, viewingAs: null })
    }

    const viewingAs = await loadViewAsTarget(session.admin, targetId)
    return NextResponse.json({ isAdmin: true, viewingAs })
}

// ─── POST: begin viewing as a member ─────────────────────────────────────────
export async function POST(request: NextRequest) {
    const session = await verifyAdmin()
    if (!session) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let body: { userId?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const userId = body.userId
    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    if (userId === session.user.id) {
        return NextResponse.json(
            { error: "You are already viewing the site as yourself." },
            { status: 400 }
        )
    }

    const target = await loadViewAsTarget(session.admin, userId)
    if (!target) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const cookieStore = await cookies()
    cookieStore.set(VIEW_AS_COOKIE, target.id, { ...baseCookie, httpOnly: true })
    cookieStore.set(VIEW_AS_LABEL_COOKIE, labelFor(target), {
        ...baseCookie,
        httpOnly: false,
    })

    return NextResponse.json({ viewingAs: target })
}

// ─── DELETE: return to the admin's own view ──────────────────────────────────
export async function DELETE() {
    // Deliberately not admin-gated: exiting is always allowed, so a session that
    // somehow holds the cookie without the role can still clear it.
    const cookieStore = await cookies()
    cookieStore.set(VIEW_AS_COOKIE, "", { ...baseCookie, httpOnly: true, maxAge: 0 })
    cookieStore.set(VIEW_AS_LABEL_COOKIE, "", { ...baseCookie, httpOnly: false, maxAge: 0 })

    return NextResponse.json({ viewingAs: null })
}
