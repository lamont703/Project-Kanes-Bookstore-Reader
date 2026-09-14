import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
    if (!client) {
        console.log("🆕 Creating fresh Supabase Singleton Client instance")
        client = createBrowserClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                auth: {
                    /**
                     * Do not let the client try to read a session out of the URL.
                     *
                     * Nothing here needs it: sign-in is email and password, there
                     * is no OAuth or magic link, and the one URL-borne session
                     * this app does handle — a password recovery link — is
                     * exchanged server-side in app/auth/callback and adopted
                     * explicitly on app/reset-password.
                     *
                     * Left on, it actively breaks that page. In PKCE mode the
                     * client looks for a `code` in the query string, but a
                     * recovery link can arrive in the implicit shape with the
                     * tokens in the fragment instead; the client then takes its
                     * auth lock and never gives it back, and every later call —
                     * ours and AuthProvider's alike — fails with
                     * NavigatorLockAcquireTimeoutError after ten seconds.
                     */
                    detectSessionInUrl: false,
                },
            }
        )
    }
    return client
}
