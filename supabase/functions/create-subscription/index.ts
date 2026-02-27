import { stripe } from '../_shared/stripe-client.ts'
import { createAuthClient } from '../_shared/supabase-client.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse } from '../_shared/errors.ts'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Missing authorization header')
        }

        const supabase = createAuthClient(authHeader)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'User not found')
        }

        const { tshirtSize, mailingAddress, selectedBookIds, phone, fullName } = await req.json()

        if (!selectedBookIds || selectedBookIds.length !== 2) {
            return createErrorResponse(400, 'VALIDATION_ERROR', 'Please select exactly 2 free ebooks')
        }

        // 1. Get/Create Stripe Customer (Environment Aware)
        const { data: profile } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

        let customerId = profile?.stripe_customer_id

        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId)
            } catch (error: any) {
                if (error.raw?.code === 'resource_missing' || error.statusCode === 404) {
                    customerId = null
                } else {
                    throw error
                }
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: fullName || '',
                metadata: { supabase_user_id: user.id }
            })
            customerId = customer.id
            await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
        }

        // 2. Create Payment Intent for $49.99 (Initial Fee)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 4999,
            currency: 'usd',
            customer: customerId,
            setup_future_usage: 'off_session',
            description: 'Kane\'s Komet Book Club Membership — Initial Fee',
            metadata: {
                user_id: user.id,
                type: 'subscription_initial',
                selected_book_ids: JSON.stringify(selectedBookIds),
                tshirt_size: tshirtSize,
                mailing_address: mailingAddress,
                full_name: fullName,
                phone: phone
            }
        })

        return new Response(JSON.stringify({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Subscription preparation error:', error)
        return createErrorResponse(500, 'INTERNAL_ERROR', error.message)
    }
})
