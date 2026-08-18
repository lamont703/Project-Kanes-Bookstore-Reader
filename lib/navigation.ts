import { apexUrl, kometzUrl } from "@/lib/hosts"

/**
 * The single source of truth for site navigation across both hosts.
 *
 * kanesbookstore.com and kometz.kanesbookstore.com run the same Next app but
 * differ in one structural way: the apex never creates a session, so it cannot
 * own a cart or an auth action. Rather than maintain two menus, this config
 * describes every destination once and records which host owns it. Session
 * dependent items still appear on the apex — they resolve to absolute links
 * into the app host instead of interactive widgets, so nothing is lost.
 */

export type NavMode = "marketing" | "app"

export interface NavItem {
    label: string
    /** Path when rendered on the marketing host. Omit if the app host owns it. */
    marketing?: string
    /** Path when rendered on the app host. Omit if the marketing host owns it. */
    app?: string
    /** Only show when the viewer is signed in (app host only). */
    requiresAuth?: boolean
    /** Only show for premium members or admins. */
    requiresPremium?: boolean
    /** Only show for admins. */
    requiresAdmin?: boolean
}

/** Primary navigation, shown on both hosts in this order. */
export const PRIMARY_NAV: NavItem[] = [
    // Books goes to the app's real catalogue at /browse from every host, rather
    // than the marketing view at /kometbooks. Both render the same published
    // books, but only /browse can add to a cart, so the header should land
    // people where they can act. /kometbooks stays reachable from the footer.
    { label: "Books", app: "/browse" },
    // Book Club points at the app host's ROOT, not /book-club. Resolution is
    // environment-aware via kometzUrl, so it stays on localhost in dev and on
    // staging when browsing staging, rather than jumping to production.
    { label: "Book Club", app: "/" },
    { label: "Characters", marketing: "/characters", app: "/characters" },
    { label: "More Funk", marketing: "/morefunk", app: "/morefunk" },
]

/** Account menu. Every entry is owned by the app host. */
export const ACCOUNT_NAV: NavItem[] = [
    { label: "My Library", app: "/dashboard", requiresAuth: true },
    { label: "Discussions", app: "/book-club/discussions", requiresPremium: true },
    { label: "Events", app: "/book-club/events", requiresPremium: true },
    { label: "Admin", app: "/admin", requiresAdmin: true },
]

/** Footer links, by column. */
export const FOOTER_NAV = {
    explore: [
        { label: "Home", marketing: "/", app: "/" },
        { label: "About", marketing: "/about", app: "/about" },
        { label: "Characters", marketing: "/characters", app: "/characters" },
        { label: "Contact", marketing: "/contact", app: "/contact" },
        { label: "Privacy Policy", marketing: "/privacy-policy", app: "/privacy-policy" },
    ] as NavItem[],
    shop: [
        { label: "Komet Books", marketing: "/kometbooks", app: "/browse" },
        { label: "More Funk", marketing: "/morefunk", app: "/morefunk" },
        { label: "Komet Book Club", marketing: "/komet-book-club", app: "/book-club" },
        { label: "Komet Book Library", app: "/dashboard" },
    ] as NavItem[],
}

export interface ResolvedLink {
    label: string
    href: string
    /** True when the link crosses to the other host and needs a plain anchor. */
    external: boolean
}

/**
 * Resolve an item for the host currently rendering it.
 *
 * Same-host destinations stay relative so client navigation works. Anything
 * owned by the other host becomes an absolute URL — a relative link would keep
 * the visitor on a host where the route does not belong.
 */
export function resolveNavItem(item: NavItem, mode: NavMode): ResolvedLink {
    const own = mode === "marketing" ? item.marketing : item.app
    if (own) return { label: item.label, href: own, external: false }

    const other = mode === "marketing" ? item.app : item.marketing
    const href = mode === "marketing" ? kometzUrl(other ?? "/") : apexUrl(other ?? "/")
    return { label: item.label, href, external: true }
}

export interface Viewer {
    isLoggedIn: boolean
    isPremium: boolean
    isAdmin: boolean
}

/**
 * Which account entries to show.
 *
 * On the marketing host there is no session to read, so gated entries are
 * hidden rather than guessed at — except My Library, which is a destination
 * worth advertising to signed-out visitors. Admin is never surfaced there.
 */
export function visibleAccountNav(mode: NavMode, viewer: Viewer): NavItem[] {
    if (mode === "marketing") {
        return ACCOUNT_NAV.filter((item) => !item.requiresAdmin && !item.requiresPremium)
    }
    return ACCOUNT_NAV.filter((item) => {
        if (item.requiresAdmin) return viewer.isAdmin
        if (item.requiresPremium) return viewer.isPremium || viewer.isAdmin
        if (item.requiresAuth) return viewer.isLoggedIn
        return true
    })
}
