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
            console.error('[reactivate-subscription] Missing Authorization header')
            return createErrorResponse(401, 'UNAUTHORIZED', 'Missing authorization header')
        }

        const supabase = createAuthClient(authHeader)
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('[reactivate-subscription] Auth error or user not found:', authError)
            return createErrorResponse(401, 'UNAUTHORIZED', 'User not found or session expired')
        }

        console.log(`[reactivate-subscription] Processing reactivation for user: ${user.id}`)

        // 1. Get the user's subscription
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('stripe_subscription_id, status')
            .eq('user_id', user.id)
            .single()

        if (subError || !subscription) {
            return createErrorResponse(404, 'NOT_FOUND', 'Subscription not found')
        }

        if (!subscription.stripe_subscription_id) {
            return createErrorResponse(400, 'MISSING_DATA', 'No Stripe subscription ID found')
        }

        // 2. Reactivate the subscription in Stripe by turning off cancel_at_period_end
        const updatedSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: false }
        )

        // 3. Update the database
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                expires_at: null,
                cancelled_at: null,
                status: 'active'
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('Failed to update subscription in DB:', updateError)
        }

        return new Response(JSON.stringify({
            success: true,
            status: 'active'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Subscription reactivation error:', error)
        return createErrorResponse(500, 'INTERNAL_ERROR', error.message)
    }
})
