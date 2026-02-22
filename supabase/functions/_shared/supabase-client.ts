import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const createAdminClient = () => {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

export const createAuthClient = (authHeader: string) => {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
            global: {
                headers: { Authorization: authHeader },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
