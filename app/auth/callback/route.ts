import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Where the links Supabase emails land.
 *
 * The client is the @supabase/ssr one, which uses PKCE: the emailed link carries
 * a one-time `code`, not a session, and that code has to be exchanged on the
 * server so the session cookies are set by the same code that reads them
 * everywhere else. Without this route a recovery link just drops the visitor on
 * a page with no session and nothing to explain why.
 *
 * The code is single-use and short-lived (mailer_otp_exp, currently one hour),
 * and Supabase — not this app — issues and validates it. That is the whole point
 * of using the built-in flow: no token of ours to generate, store, compare or
 * accidentally leak.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")

    /**
     * Only ever redirect within this site.
     *
     * `next` arrives in a URL the recipient can edit, so an unchecked value
     * turns the callback into an open redirect — and one that fires with a
     * freshly minted session attached. A leading `//` or `/\` is a
     * protocol-relative URL to another host, so those are rejected too.
     */
    const requested = searchParams.get("next") ?? "/reset-password"
    const next =
        requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\")
            ? requested
            : "/reset-password"

    // Supabase reports an expired or already-used link here rather than as a
    // failed exchange. Send it to the request form with something to read.
    const emailedError = searchParams.get("error_description") ?? searchParams.get("error")
    if (emailedError) {
        return NextResponse.redirect(`${origin}/forgot-password?error=${encodeURIComponent(emailedError)}`)
    }

    /**
     * No code is not necessarily a broken link.
     *
     * Supabase answers in one of two shapes. A link requested from the browser
     * carries a PKCE `code` in the query string, which is what the exchange
     * below is for. A link minted without a verifier — an admin-generated one,
     * say — comes back in the IMPLICIT shape instead, with the session in the URL
     * fragment (`#access_token=...`). A fragment never reaches the server, so
     * there is nothing to read here and nothing to exchange.
     *
     * Browsers re-apply the original fragment to a redirect that has none of its
     * own, so handing this straight to the reset page delivers those tokens to
     * the client, where supabase-js picks them up (detectSessionInUrl). A link
     * that is genuinely spent arrives there with no fragment either, and the page
     * says so — which is the same thing this route would have had to say.
     */
    if (!code) {
        return NextResponse.redirect(`${origin}${next}`)
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return NextResponse.redirect(`${origin}/forgot-password?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}${next}`)
}
