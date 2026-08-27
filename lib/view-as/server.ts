import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { VIEW_AS_COOKIE } from "./constants"
import type { ViewAsTarget } from "./types"

/**
 * Server-side resolution of the current viewer.
 *
 * Member-facing Server Components should ask this for the user id they scope
 * their queries to, and for the client they run those queries through, instead
 * of calling supabase.auth.getUser() and createClient() themselves. With no
 * impersonation active the two are exactly what they always were; while an
 * admin is viewing as a member, `userId` becomes the member's id and `db`
 * becomes the service-role client, because the admin's session has no RLS grant
 * on another member's library, orders or progress.
 *
 * Because `db` bypasses RLS, every query written against it MUST filter by
 * `userId` explicitly. Anywhere RLS was doing visibility work on its own — the
 * public/premium split on book_club_events is the one live case — the caller has
 * to reproduce that filter from `viewingAs.isPremium`, or the admin will see
 * more than the member can.
 */
export interface ViewerContext {
    /** The signed-in Supabase user. Always the admin during impersonation. */
    realUser: any | null
    /** True when the signed-in user is an admin. Only computed when it matters. */
    realIsAdmin: boolean
    /** The member being viewed, or null when nobody is being impersonated. */
    viewingAs: ViewAsTarget | null
    isViewingAs: boolean
    /** The id every user-scoped query should filter on. */
    userId: string | null
    /** The client those queries should run through. */
    db: any
}

/** Load a member and their subscription into the shape the UI needs. */
export async function loadViewAsTarget(
    admin: any,
    userId: string
): Promise<ViewAsTarget | null> {
    const [{ data: profile }, { data: sub }] = await Promise.all([
        admin
            .from("users")
            .select("id, full_name, display_name, email, role, is_banned")
            .eq("id", userId)
            .single(),
        admin
            .from("user_subscriptions")
            .select("plan, status")
            .eq("user_id", userId)
            .maybeSingle(),
    ])

    if (!profile) return null

    const plan = sub?.plan === "premium" ? "premium" : "free"

    return {
        id: profile.id,
        name: profile.display_name || profile.full_name || profile.email || "Member",
        email: profile.email ?? "",
        role: (profile.role ?? "reader") as ViewAsTarget["role"],
        plan,
        isPremium: plan === "premium" && sub?.status === "active",
        isBanned: !!profile.is_banned,
    }
}

export async function getViewerContext(): Promise<ViewerContext> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const cookieStore = await cookies()
    const targetId = cookieStore.get(VIEW_AS_COOKIE)?.value

    const passthrough: ViewerContext = {
        realUser: user,
        realIsAdmin: false,
        viewingAs: null,
        isViewingAs: false,
        userId: user?.id ?? null,
        db: supabase,
    }

    // The overwhelmingly common path: no cookie, so no extra queries at all.
    if (!targetId || !user) return passthrough

    const admin = createAdminClient()
    const { data: caller } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    // A non-admin carrying the cookie (revoked role, copied cookie) simply sees
    // their own account. Clearing the cookie is the API route's job — a Server
    // Component cannot write cookies.
    if (caller?.role !== "admin") return passthrough

    const viewingAs = await loadViewAsTarget(admin, targetId)
    if (!viewingAs) return { ...passthrough, realIsAdmin: true }

    return {
        realUser: user,
        realIsAdmin: true,
        viewingAs,
        isViewingAs: true,
        userId: viewingAs.id,
        db: admin,
    }
}
