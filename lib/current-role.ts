import { createClient } from "@/lib/supabase/server"
import { getViewerContext } from "@/lib/view-as/server"
import type { UserRole } from "@/lib/roles"

/**
 * The role the screen should be rendered for.
 *
 * During a View As session that is the *viewed* member's role, not the admin's,
 * so the admin panel shows what that person's panel shows — an employee's two
 * sections, without the delete controls. Anything that needs the real signed-in
 * role instead (there is nothing in the admin panel that does; exiting a view is
 * handled outside it) should read the session directly.
 *
 * Access is gated in lib/supabase/middleware.ts, which computes the same
 * effective role. This is the render-side half of that answer.
 */
export async function getEffectiveRole(): Promise<UserRole> {
    const { viewingAs, realUser } = await getViewerContext()

    if (viewingAs) return viewingAs.role
    if (!realUser) return "reader"

    const supabase = await createClient()
    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", realUser.id)
        .single()

    return (data?.role ?? "reader") as UserRole
}
