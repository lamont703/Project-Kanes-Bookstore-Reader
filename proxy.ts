import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { RETIRED_HOME_ROUTE, SITE_ORIGIN, isLegacyHost } from '@/lib/hosts'

/**
 * Host routing.
 *
 * One site, one origin — www.kanesbookstore.com serves everything, and every
 * request gets the auth gate. Two redirects survive the 2026-09-14
 * consolidation:
 *
 *   kometz.kanesbookstore.com/*  -> the same path on the canonical origin.
 *       The retired app host. Kept resolving rather than deleted because
 *       Stripe, GoHighLevel and existing bookmarks still name it. 308 keeps the
 *       method and the body, so a POST that was in flight still completes.
 *
 *   /kanes-home                  -> /
 *       The apex used to rewrite "/" to this route to get session-free chrome.
 *       There is one homepage now.
 *
 * Session cookies are host-scoped, so nothing carries across the first
 * redirect: a member who was signed in on kometz arrives here signed out. That
 * is inherent to retiring a host, not a bug to fix here.
 */
export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl

    // Resolved before the host check so a request for the retired homepage on
    // the retired host takes ONE hop, not two. Chained 308s are correct but
    // crawlers discount them and every hop is a round trip.
    const target = pathname === RETIRED_HOME_ROUTE ? `/${search}` : `${pathname}${search}`

    if (isLegacyHost(request.headers.get('host'))) {
        return NextResponse.redirect(new URL(target, SITE_ORIGIN), 308)
    }

    if (target !== `${pathname}${search}`) {
        return NextResponse.redirect(new URL(target, request.url), 308)
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
