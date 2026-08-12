/**
 * Host topology.
 *
 * kanesbookstore.com (apex)  — public marketing only. No login, no cart, no
 *                              Supabase session is ever created here.
 * kometz.kanesbookstore.com  — the app: auth, cart, checkout, library, reader,
 *                              book club. Single auth origin, single commerce
 *                              origin.
 *
 * Every apex CTA that leads into the app must be an absolute kometz URL, not a
 * relative path — a relative link would keep the user on the apex, where the
 * route does not belong and no session can exist.
 */

export const KOMETZ_ORIGIN =
    process.env.NEXT_PUBLIC_KOMETZ_ORIGIN ?? "https://kometz.kanesbookstore.com"

export const APEX_ORIGIN =
    process.env.NEXT_PUBLIC_APEX_ORIGIN ?? "https://kanesbookstore.com"

/** Hostnames that serve the marketing site. Everything else gets the full app,
 *  so staging.kanesbookstore.com and *.vercel.app previews stay testable. */
export const APEX_HOSTNAMES = new Set(["kanesbookstore.com", "www.kanesbookstore.com"])

export function isApexHost(hostname: string | null | undefined): boolean {
    if (!hostname) return false
    return APEX_HOSTNAMES.has(hostname.split(":")[0].toLowerCase())
}

/** Absolute URL into the app host. */
export function kometzUrl(path = "/"): string {
    return `${KOMETZ_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`
}

/** Absolute URL on the marketing host. */
export function apexUrl(path = "/"): string {
    return `${APEX_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`
}

/** Product detail lives on kometz — that is where purchase happens. */
export function bookDetailUrl(bookId: string): string {
    return kometzUrl(`/book/${bookId}`)
}

/** Paths the marketing host is allowed to serve. Anything else redirects to
 *  the app host. Keep in sync with the routes under app/(marketing). */
export const APEX_PATHS = [
    "/",
    "/about",
    "/characters",
    "/contact",
    "/komet-book-club",
    "/kometbooks",
    "/morefunk",
    "/privacy-policy",
] as const

export function isApexPath(pathname: string): boolean {
    return (APEX_PATHS as readonly string[]).includes(pathname)
}
