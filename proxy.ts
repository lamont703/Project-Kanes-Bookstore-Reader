import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { APEX_HOME_ROUTE, APP_HOST_ORIGIN, isApexHost, isApexPath } from '@/lib/hosts'

/**
 * Host-aware routing.
 *
 * kanesbookstore.com (apex) is the public marketing site. It has no login and
 * never creates a Supabase session, so updateSession() must NOT run there — a
 * session minted on the apex would be scoped to the wrong host and recreate the
 * split-brain described in docs/refresh-bug-audit.md.
 *
 *   /                -> rewritten to APEX_HOME_ROUTE (the app host keeps
 *                       app/page.tsx as its own landing page)
 *   allowlisted path -> served as-is, no session work
 *   anything else    -> redirected to the same path on the app host
 *
 * Every other hostname — kometz, staging, *.vercel.app previews, localhost —
 * gets the full app with the auth gate untouched.
 */
export async function proxy(request: NextRequest) {
    if (isApexHost(request.headers.get('host'))) {
        const { pathname, search } = request.nextUrl

        if (pathname === '/') {
            return NextResponse.rewrite(new URL(APEX_HOME_ROUTE, request.url))
        }

        if (isApexPath(pathname)) {
            return NextResponse.next()
        }

        // Account and commerce routes live on the app host. 308 keeps the
        // method and tells crawlers the move is permanent.
        return NextResponse.redirect(new URL(`${pathname}${search}`, APP_HOST_ORIGIN), 308)
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
