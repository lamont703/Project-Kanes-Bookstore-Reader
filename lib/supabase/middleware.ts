import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIEW_AS_COOKIE, VIEW_AS_LABEL_COOKIE } from '@/lib/view-as/constants'
import { adminRedirectFor } from '@/lib/roles'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake can make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // The two View As cookies are written together and expire together. If the
    // client-readable half is gone while the authoritative half survives, the
    // server would keep impersonating with nothing on screen to say so and no
    // way out — so drop the pair instead. Costs nothing: no queries, and the
    // cookies are only present at all during an active session.
    let viewAsId = request.cookies.get(VIEW_AS_COOKIE)?.value
    if (viewAsId && !request.cookies.get(VIEW_AS_LABEL_COOKIE)?.value) {
        supabaseResponse.cookies.set(VIEW_AS_COOKIE, '', { path: '/', maxAge: 0 })
        viewAsId = undefined
    }

    const pathname = request.nextUrl.pathname

    const isAuthPage = pathname.startsWith('/login') ||
        pathname.startsWith('/auth')
    const isAdminPage = pathname.startsWith('/admin')
    // /preview renders unpublished draft content. It needs the same sign-in gate
    // as /admin even though it sits outside that segment (it must not inherit
    // the admin layout — see app/preview/[slug]/page.tsx), but not the same role
    // gate: previewing a draft is site-page work, so it stays admin-only while
    // /admin itself now also admits employees.
    const isPreviewPage = pathname.startsWith('/preview')
    const isPremiumPage = pathname.startsWith('/book-club/discussions') ||
        pathname.startsWith('/book-club/events')

    if (!user && (isAdminPage || isPreviewPage || isPremiumPage)) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            response.cookies.set(cookie.name, cookie.value, cookie)
        })
        return response
    }

    if (user && (isAdminPage || isPreviewPage || isPremiumPage)) {
        // Fetch both role and subscription in parallel
        const [profileRes, subRes] = await Promise.all([
            supabase.from('users').select('role').eq('id', user.id).single(),
            supabase.from('user_subscriptions').select('plan, status').eq('user_id', user.id).single()
        ])

        const role = profileRes.data?.role
        const sub = subRes.data

        const redirectTo = (path: string) => {
            const response = NextResponse.redirect(new URL(path, request.url))
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                response.cookies.set(cookie.name, cookie.value, cookie)
            })
            return response
        }

        // Role checks below deliberately read the *real* role, never the View As
        // target: an admin who steps into a member's view must still be able to
        // walk back into /admin and leave it.

        // Employees reach only the two catalogue sections; anything else under
        // /admin bounces them to the one they do have. See lib/roles.ts.
        if (isAdminPage) {
            const destination = adminRedirectFor(role, pathname)
            if (destination) return redirectTo(destination)
        }

        // Drafts are site-page work, so previewing stays admin-only.
        if (isPreviewPage && role !== 'admin') {
            return redirectTo('/')
        }

        // Premium check (Admins get access to premium pages too)
        if (isPremiumPage) {
            if (role === 'admin' && viewAsId) {
                // Inside a View As session the gate belongs to the member being
                // viewed. Getting bounced to /book-club is part of what a free
                // member's screen actually does.
                const admin = createAdminClient()
                const [targetProfileRes, targetSubRes] = await Promise.all([
                    admin.from('users').select('role').eq('id', viewAsId).single(),
                    admin.from('user_subscriptions').select('plan, status').eq('user_id', viewAsId).maybeSingle()
                ])

                const targetRole = targetProfileRes.data?.role
                const targetSub = targetSubRes.data
                const targetIsPremium = targetSub?.plan === 'premium' && targetSub?.status === 'active'

                if (targetRole !== 'admin' && !targetIsPremium) {
                    return redirectTo('/book-club')
                }
            } else if (role !== 'admin') {
                // Employees get no book-club bypass — the admin exemption here is
                // about running the club, which is not their job.
                const isPremium = sub?.plan === 'premium' && sub?.status === 'active'
                if (!isPremium) {
                    return redirectTo('/book-club')
                }
            }
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but remember that it
    //    needs to be returned from the middleware.

    return supabaseResponse
}
