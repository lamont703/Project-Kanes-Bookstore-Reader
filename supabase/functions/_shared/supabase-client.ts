import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const createClient = (authHeader?: string) => {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!url) {
        console.error("[supabase-client] Missing SUPABASE_URL environment variable");
    }

    const key = authHeader ? anonKey : serviceKey;
    if (!key) {
        console.error(`[supabase-client] Missing ${authHeader ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'} environment variable`);
    }

    return createSupabaseClient(url ?? '', key ?? '', {
        global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

export const createAdminClient = () => createClient()
export const createAuthClient = (authHeader: string) => createClient(authHeader)
