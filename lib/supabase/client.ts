import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
    if (!client) {
        console.log("🆕 Creating fresh Supabase Singleton Client instance")
        client = createBrowserClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        )
    }
    return client
}
