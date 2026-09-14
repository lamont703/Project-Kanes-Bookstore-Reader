/**
 * "View As" — read-only admin impersonation.
 *
 * An admin can borrow another member's point of view so member-facing pages
 * render with that member's library, orders, subscription and entitlements.
 * Nothing about the admin's own session changes: the Supabase session cookie
 * still belongs to the admin, so every write still runs as the admin. That is
 * why the whole feature is deliberately read-only — see lib/view-as/server.ts.
 */
import type { UserRole } from "@/lib/roles"

export interface ViewAsTarget {
    id: string
    /** Display name, already falling back through display_name → full_name → email. */
    name: string
    email: string
    role: UserRole
    plan: "free" | "premium"
    /** plan === 'premium' AND the subscription is active — the gate the site uses. */
    isPremium: boolean
    isBanned: boolean
}
