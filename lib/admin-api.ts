import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Guard for admin-only API routes.
 *
 * Reads the caller's role from public.users with the service-role client rather
 * than trusting anything on the request, and hands back that same client so the
 * route can read across users — which is the whole point of an admin endpoint
 * and something RLS will not grant.
 *
 * Returns null when the caller is not an admin; the route decides the status.
 */
export async function requireAdmin(): Promise<{ user: any; admin: any } | null> {
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
