import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { stripe } from '../_shared/stripe-client.ts'
import { createClient } from '../_shared/supabase-client.ts'

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    try {
        const body = await req.text()
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
        )

        const supabase = createClient() // Admin/Service Role client needed here

        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object
                await handlePaymentSuccess(supabase, paymentIntent)
                break
            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object
                await handlePaymentFailure(supabase, failedIntent)
                break
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object
                await handleSubscriptionUpdate(supabase, subscription)
                break
            case 'invoice.payment_failed':
                const invoice = event.data.object
                await handleInvoiceFailure(supabase, invoice)
                break
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})

async function handlePaymentSuccess(supabase: any, paymentIntent: any) {
    const { data: order } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .select()
        .single()

    if (order) {
        // 1. Update User's Profile (Mailing Address)
        if (order.shipping_address) {
            const addr = order.shipping_address
            const addressString = `${addr.address}, ${addr.city}, ${addr.zip}, ${addr.country}`

            await supabase
                .from('users')
                .update({
                    mailing_address: addressString,
                    full_name: `${addr.firstName} ${addr.lastName}`.trim()
                })
                .eq('id', order.user_id)
        }

        // 2. Fulfill the order: Add ebooks to library
        const { data: items } = await supabase
            .from('order_items')
            .select('*, variant:book_variants(*)')
            .eq('order_id', order.id)

        if (items) {
            for (const item of items) {
                if (item.variant.format === 'ebook') {
                    await supabase.from('user_library').upsert({
                        user_id: order.user_id,
                        book_id: item.variant.book_id,
                        source: 'purchase'
                    })
                }
            }
        }

        // 3. Trigger Order Confirmation Email (GHL Tagging)
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    event: 'ORDER_CONFIRMED',
                    userId: order.user_id,
                    metadata: { orderId: order.id }
                })
            })
        } catch (e) {
            console.error('Failed to trigger email-ops for order confirmation:', e)
        }
    }

    // Handle Subscription Initial Payment (from create-subscription function)
    if (paymentIntent.metadata?.type === 'subscription_initial') {
        await handleSubscriptionInitialSuccess(supabase, paymentIntent)
    }
}

async function handleSubscriptionInitialSuccess(supabase: any, paymentIntent: any) {
    const { user_id, selected_book_ids, tshirt_size, mailing_address, full_name, phone } = paymentIntent.metadata
    const selectedBookIds = JSON.parse(selected_book_ids)

    // 1. Update User Profile
    await supabase.from('users').update({
        tshirt_size,
        mailing_address,
        full_name,
        phone
    }).eq('id', user_id)

    // 2. Create Recurring Subscription in Stripe ($3.99/mo) with 30-day trial
    const priceId = Deno.env.get('STRIPE_PREMIUM_RECURRING_PRICE_ID')
    if (priceId) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: paymentIntent.customer,
                items: [{ price: priceId }],
                trial_period_days: 30, // Month 2 starts in 30 days
                default_payment_method: paymentIntent.payment_method,
                metadata: { user_id }
            })

            // 3. Create Subscription Record in DB
            await supabase.from('user_subscriptions').upsert({
                user_id,
                plan: 'premium',
                status: 'active',
                stripe_subscription_id: subscription.id,
                initial_fee_paid: 49.99,
                monthly_rate: 3.99,
                selected_book_ids: selectedBookIds,
                started_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        } catch (e) {
            console.error('Failed to create recurring subscription:', e)
        }
    }

    // 4. Grant 2 free books to library
    const libraryEntries = selectedBookIds.map((bookId: string) => ({
        user_id,
        book_id: bookId,
        source: 'subscription_signup'
    }))
    await supabase.from('user_library').upsert(libraryEntries)

    // 5. Generate a Kane Dealer promo code
    // Format: KANE-[FIRSTNAME]-[PHONE_LAST4]
    try {
        const firstName = full_name.split(' ')[0].toUpperCase()
        const phoneLast4 = phone.slice(-4)
        const promoCode = `KANE-${firstName}-${phoneLast4}`

        await supabase.from('promo_codes').insert({
            code: promoCode,
            discount_percent: 35,
            is_active: true,
            created_by: user_id,
            type: 'kane_dealer'
        })
    } catch (e) {
        console.error('Failed to generate promo code:', e)
    }

    // 6. Trigger Welcome Email
    try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
                event: 'WELCOME_PREMIUM',
                userId: user_id
            })
        })
    } catch (e) {
        console.error('Failed to trigger welcome email:', e)
    }
}

async function handlePaymentFailure(supabase: any, paymentIntent: any) {
    const { data: order } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .select()
        .single()

    if (order) {
        // Trigger Payment Failure Email (GHL Tagging)
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    event: 'PAYMENT_FAILED',
                    userId: order.user_id
                })
            })
        } catch (e) {
            console.error('Failed to trigger email-ops for payment failure:', e)
        }
    }
}

async function handleSubscriptionUpdate(supabase: any, subscription: any) {
    const statusMap: Record<string, string> = {
        'active': 'active',
        'past_due': 'past_due',
        'unpaid': 'past_due',
        'canceled': 'expired',
        'incomplete': 'past_due',
        'incomplete_expired': 'expired',
        'trialing': 'active'
    }

    const { error } = await supabase
        .from('user_subscriptions')
        .update({
            status: statusMap[subscription.status] || 'expired',
            expires_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
        })
        .eq('stripe_subscription_id', subscription.id)

    if (error) {
        console.error('Error updating subscription in DB:', error)
    }

    if (subscription.status === 'canceled') {
        // Trigger Cancellation Email via GHL
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

        if (sub) {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    event: 'SUBSCRIPTION_CANCELLED',
                    userId: sub.user_id
                })
            })
        }
    }
}

async function handleInvoiceFailure(supabase: any, invoice: any) {
    if (!invoice.subscription) return

    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single()

    if (sub) {
        // Trigger Payment Failure Email via GHL
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
                event: 'PAYMENT_FAILED',
                userId: sub.user_id
            })
        })
    }
}
