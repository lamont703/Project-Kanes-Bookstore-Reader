import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/roles"

/**
 * The signed-in user's role, for Server Components that need to decide what to
 * render rather than whether to allow.
 *
 * Access is gated in the middleware and in app/admin/layout.tsx; this is for the
 * softer question of which controls a page should offer — an employee reaching
 * /admin/books legitimately still must not be shown a delete button, because
 * RLS would refuse it (migration 20260826000001) and a button that always errors
 * is worse than no button.
 *
 * Reads the cookie-scoped client on purpose, so it answers for the real session
 * under RLS rather than bypassing it.
 */
export async function getCurrentRole(): Promise<UserRole> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return "reader"

    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    return (data?.role ?? "reader") as UserRole
}
