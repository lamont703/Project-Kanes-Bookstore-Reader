import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const cookieStore = await cookies()
        const supabaseAuth = createServerClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { /* read-only */ },
                },
            }
        )

        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required.' },
                { status: 401 }
            )
        }

        const { code } = await request.json()

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Please enter a dealer code.' },
                { status: 400 }
            )
        }

        const admin = createAdminClient()
        const normalizedCode = code.trim().toUpperCase()

        const { data: promo, error } = await admin
            .from('promo_codes')
            .select('id, owner_id, discount_percent, is_active')
            .eq('code', normalizedCode)
            .maybeSingle()

        if (error || !promo) {
            return NextResponse.json(
                { error: 'Invalid dealer code. Please check and try again.' },
                { status: 400 }
            )
        }

        if (!promo.is_active) {
            return NextResponse.json(
                { error: 'This dealer code is no longer active.' },
                { status: 400 }
            )
        }

        if (promo.owner_id === user.id) {
            return NextResponse.json(
                { error: 'You cannot use your own dealer code.' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            valid: true,
            discountPercent: promo.discount_percent,
            message: `Dealer code applied! ${promo.discount_percent}% discount activated.`,
        })

    } catch (err: any) {
        console.error('Dealer code validation error:', err)
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        )
    }
}
