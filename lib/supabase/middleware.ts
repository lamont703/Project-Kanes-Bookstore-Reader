import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

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

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/auth')
    // /preview renders unpublished draft content, so it is gated exactly like
    // /admin even though it sits outside that segment (it must not inherit the
    // admin layout — see app/preview/[slug]/page.tsx).
    const isAdminPage = request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/preview')
    const isPremiumPage = request.nextUrl.pathname.startsWith('/book-club/discussions') ||
        request.nextUrl.pathname.startsWith('/book-club/events')

    if (!user && (isAdminPage || isPremiumPage)) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            response.cookies.set(cookie.name, cookie.value, cookie)
        })
        return response
    }

    if (user && (isAdminPage || isPremiumPage)) {
        // Fetch both role and subscription in parallel
        const [profileRes, subRes] = await Promise.all([
            supabase.from('users').select('role').eq('id', user.id).single(),
            supabase.from('user_subscriptions').select('plan, status').eq('user_id', user.id).single()
        ])

        const role = profileRes.data?.role
        const sub = subRes.data

        // Admin check
        if (isAdminPage && role !== 'admin') {
            const response = NextResponse.redirect(new URL('/', request.url))
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                response.cookies.set(cookie.name, cookie.value, cookie)
            })
            return response
        }

        // Premium check (Admins get access to premium pages too)
        if (isPremiumPage && role !== 'admin') {
            const isPremium = sub?.plan === 'premium' && sub?.status === 'active'
            if (!isPremium) {
                const response = NextResponse.redirect(new URL('/book-club', request.url))
                supabaseResponse.cookies.getAll().forEach((cookie) => {
                    response.cookies.set(cookie.name, cookie.value, cookie)
                })
                return response
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
