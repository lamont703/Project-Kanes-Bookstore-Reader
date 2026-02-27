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
            console.error('[cancel-subscription] Missing Authorization header')
            return createErrorResponse(401, 'UNAUTHORIZED', 'Missing authorization header')
        }

        const supabase = createAuthClient(authHeader)
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('[cancel-subscription] Auth error or user not found:', authError)
            return createErrorResponse(401, 'UNAUTHORIZED', 'User not found or session expired')
        }

        console.log(`[cancel-subscription] Processing cancellation for user: ${user.id}`)

        // 1. Get the user's subscription
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('stripe_subscription_id, status')
            .eq('user_id', user.id)
            .single()

        if (subError || !subscription) {
            return createErrorResponse(404, 'NOT_FOUND', 'Subscription not found')
        }

        if (subscription.status !== 'active' && subscription.status !== 'past_due') {
            return createErrorResponse(400, 'INVALID_STATE', 'Subscription is not active')
        }

        if (!subscription.stripe_subscription_id) {
            return createErrorResponse(400, 'MISSING_DATA', 'No Stripe subscription ID found')
        }

        // 2. Cancel the subscription in Stripe
        // We use cancel_at_period_end: true to allow the user to keep access until the end of the billing period
        const updatedSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true }
        )

        // 3. Update the database (webhook will also do this, but doing it here for faster UI update if needed)
        // Actually, we'll let the webhook handle it or update it here if we want immediate feedback.
        // Let's update it here for immediate feedback in the UI.
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                expires_at: updatedSubscription.cancel_at ? new Date(updatedSubscription.cancel_at * 1000).toISOString() : null,
                cancelled_at: new Date().toISOString()
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('Failed to update subscription in DB:', updateError)
        }

        return new Response(JSON.stringify({
            success: true,
            cancelAt: updatedSubscription.cancel_at ? new Date(updatedSubscription.cancel_at * 1000).toISOString() : null
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Subscription cancellation error:', error)
        return createErrorResponse(500, 'INTERNAL_ERROR', error.message)
    }
})
