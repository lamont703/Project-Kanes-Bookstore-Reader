"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import { useViewAs } from "@/context/view-as-context"

/**
 * Blocks writes while an admin is viewing as a member.
 *
 * A View As session borrows the member's *view*, not their identity: the
 * Supabase session cookie still belongs to the admin, so a save, an RSVP, a post
 * or a checkout started from inside the view would be written against the
 * admin's own account while the screen shows the member's. Rather than let that
 * happen quietly, every mutation entry point asks this first.
 *
 * Usage:
 *   const blockedByViewAs = useViewAsGuard()
 *   ...
 *   if (blockedByViewAs()) return
 */
export function useViewAsGuard() {
    const { viewingAs } = useViewAs()

    return useCallback(
        (action = "Changes are") => {
            if (!viewingAs) return false
            toast.error(
                `${action} disabled while viewing as ${viewingAs.name}. Exit the view to act as yourself.`
            )
            return true
        },
        [viewingAs]
    )
}
