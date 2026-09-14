/**
 * Host topology — one site, one origin.
 *
 * www.kanesbookstore.com serves everything: marketing, catalogue, auth, cart,
 * checkout, library, reader, book club, admin.
 *
 * It did not always. Until the 2026-09-14 consolidation the apex served six
 * marketing paths and redirected everything else to kometz.kanesbookstore.com,
 * which owned auth and commerce. That split is retired. kometz still resolves
 * and now permanently redirects here (see proxy.ts) — Stripe, GoHighLevel and
 * a year of bookmarks still point at it, so it is kept as a redirect rather
 * than deleted.
 *
 * The practical consequence for components: in-page links are RELATIVE.
 * There is no other host to reach, so an absolute URL would only add a DNS
 * lookup and break local development and preview deployments, where the origin
 * is neither of the production names.
 */

/**
 * The canonical absolute origin. Used for <link rel="canonical">, for the
 * redirect target out of retired hosts, and nowhere else — in-page links must
 * stay relative so previews and localhost link to themselves.
 *
 * www, not the bare apex: kanesbookstore.com is configured in Vercel as a 308
 * to www, so pointing canonicals at the bare name would aim them at a redirect.
 */
export const SITE_ORIGIN =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://www.kanesbookstore.com"

/**
 * Hostnames that no longer serve the site and are redirected to SITE_ORIGIN.
 *
 * Deliberately an explicit list rather than "anything that is not SITE_ORIGIN":
 * localhost, staging.kanesbookstore.com and *.vercel.app previews all serve the
 * full application under their own names and must never be redirected away.
 */
export const LEGACY_HOSTNAMES = new Set(
    (process.env.NEXT_PUBLIC_LEGACY_HOSTNAMES ?? "kometz.kanesbookstore.com")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
)

function hostnameOf(value: string | null | undefined): string {
    return (value ?? "").split("://").pop()!.split("/")[0].split(":")[0].toLowerCase()
}

/**
 * Should this host be redirected to the canonical origin?
 *
 * Guards against the canonical host being listed as legacy — that would be an
 * infinite redirect, and a typo in one environment variable should not be able
 * to take the site down.
 */
export function isLegacyHost(hostname: string | null | undefined): boolean {
    const host = hostnameOf(hostname)
    if (!host || host === hostnameOf(SITE_ORIGIN)) return false
    return LEGACY_HOSTNAMES.has(host)
}

/**
 * Link to a route on this site.
 *
 * Returns the path unchanged. It exists as a named seam: every cross-host link
 * in the codebase used to go through here, and keeping the call sites means the
 * consolidation is one edit in one file rather than a rename spread across the
 * component tree — and reversible the same way.
 */
export function appUrl(path = "/"): string {
    return path.startsWith("/") ? path : `/${path}`
}

/** Absolute URL for canonical tags and anything that must name the origin. */
export function canonicalUrl(path = "/"): string {
    return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`
}

/** Product detail. */
export function bookDetailUrl(bookId: string): string {
    return appUrl(`/book/${bookId}`)
}

/**
 * The retired marketing homepage route.
 *
 * The apex used to rewrite "/" to /kanes-home so the homepage could render in
 * session-free chrome. With one host there is one homepage — app/page.tsx —
 * and this path redirects to it (proxy.ts) so old links still land.
 */
export const RETIRED_HOME_ROUTE = "/kanes-home"
