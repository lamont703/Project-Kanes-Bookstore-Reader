import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const createClient = (authHeader?: string) => {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = authHeader ? Deno.env.get('SUPABASE_ANON_KEY') ?? '' : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    return createSupabaseClient(url, key, {
        global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

export const createAdminClient = () => createClient()
export const createAuthClient = (authHeader: string) => createClient(authHeader)
