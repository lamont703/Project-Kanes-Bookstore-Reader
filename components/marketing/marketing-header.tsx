"use client"

import { SiteNav } from "@/components/nav/site-nav"

/**
 * Header for the marketing host (apex).
 *
 * Renders the same SiteNav as the app host so the two read as one site, but
 * mounts neither useAuth nor useCart. The apex must never create a Supabase
 * session, and it cannot read the app host's cart, so it passes a signed-out
 * viewer and no cart count — the cart and sign-in affordances become links into
 * the app host rather than interactive widgets.
 */
export function MarketingHeader() {
    return (
        <SiteNav
            mode="marketing"
            viewer={{ isLoggedIn: false, isPremium: false, isAdmin: false }}
        />
    )
}
