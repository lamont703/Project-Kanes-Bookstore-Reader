import { stripe } from '../_shared/stripe-client.ts'
import { createClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    try {
        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(
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
        //
        // These come from the order's own columns. This block used to treat
        // order.shipping_address as an object and read .address/.city/.zip/
        // .country off it, but it is a TEXT column holding only the street
        // line — so every physical purchase wrote the literal string
        // "undefined, undefined, undefined, undefined" over the customer's
        // mailing address and "undefined undefined" over their real name.
        if (order.shipping_address) {
            const addressString = [
                order.shipping_address,
                order.shipping_city,
                order.shipping_state,
                order.shipping_zip
            ].filter(Boolean).join(', ')

            const updates: Record<string, string> = { mailing_address: addressString }

            // Only overwrite the stored name when the order actually carried one,
            // so a blank checkout field cannot erase an existing profile name.
            if (typeof order.shipping_name === 'string' && order.shipping_name.trim()) {
                updates.full_name = order.shipping_name.trim()
            }

            await supabase
                .from('users')
                .update(updates)
                .eq('id', order.user_id)
        }

        // 2. Fulfill the order: Add digital access to library
        //    - 'ebook'      → direct digital purchase
        //    - 'komet_card' → physical card that also grants digital reading access
        const { data: items } = await supabase
            .from('order_items')
            .select('*, variant:book_variants(*)')
            .eq('order_id', order.id)

        if (items) {
            for (const item of items) {
                if (item.variant.format === 'ebook' || item.variant.format === 'komet_card') {
                    await supabase.from('user_library').upsert({
                        user_id: order.user_id,
                        book_id: item.variant.book_id,
                        source: 'purchase'
                    }, { onConflict: 'user_id,book_id' })
                }

                // 2.1 Draw down inventory now that the money has actually landed.
                //
                // Deliberately at payment success rather than at checkout: an
                // abandoned payment must not hold stock hostage. The trade-off is
                // that two buyers can both clear the checkout-time availability
                // check for the last unit, so this can legitimately fail. It is
                // logged and left non-fatal — the customer has paid and the order
                // stands; overselling is an admin problem, not a reason to drop
                // the webhook and have Stripe retry the whole fulfilment.
                const { error: stockError } = await supabase.rpc('decrement_variant_stock', {
                    p_variant_id: item.variant_id,
                    p_quantity: item.quantity
                })
                if (stockError) {
                    console.error(
                        `⚠️ Stock decrement failed for order ${order.id}, variant ${item.variant_id}:`,
                        stockError.message
                    )
                }
            }
        }

        // 2.2 Close out orders that have nothing to ship.
        //
        // fulfillment_status defaults to 'unfulfilled', and nothing ever moved a
        // digital order off it, so the admin queue filled with orders that were
        // already complete the moment they were paid for.
        if (!order.has_physical_items) {
            await supabase
                .from('orders')
                .update({ fulfillment_status: 'fulfilled', fulfilled_at: new Date().toISOString() })
                .eq('id', order.id)
        }

        // 3. Trigger Order Confirmation Email (GHL Tagging)
        try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
    const metadata = paymentIntent.metadata || {}
    const {
        user_id,
        selected_book_ids,
        tshirt_size,
        mailing_address,
        full_name,
        phone
    } = metadata

    console.log(`[stripe-webhook] Processing subscription initial success for user: ${user_id} (${paymentIntent.livemode ? 'LIVE' : 'SANDBOX'})`)

    if (!user_id || !selected_book_ids) {
        console.error('[stripe-webhook] Missing critical metadata: user_id or selected_book_ids')
        return
    }

    let selectedBookIds: string[] = []
    try {
        selectedBookIds = JSON.parse(selected_book_ids)
    } catch (e) {
        console.error('[stripe-webhook] Failed to parse selected_book_ids:', selected_book_ids)
        return
    }

    // 1. Update User Profile
    const profileUpdate: any = {}
    if (tshirt_size) profileUpdate.tshirt_size = tshirt_size
    if (mailing_address) profileUpdate.mailing_address = mailing_address
    if (full_name) profileUpdate.full_name = full_name
    if (phone) profileUpdate.phone = phone

    if (Object.keys(profileUpdate).length > 0) {
        const { error: userError } = await supabase.from('users').update(profileUpdate).eq('id', user_id)
        if (userError) console.error('[stripe-webhook] Failed to update user profile:', userError)
    }

    // 2. Create Recurring Subscription in Stripe ($3.99/mo) with 30-day trial
    const priceId = Deno.env.get('STRIPE_PREMIUM_RECURRING_PRICE_ID')
    if (priceId) {
        if (priceId.startsWith('prod_')) {
            console.error(`[stripe-webhook] CRITICAL: STRIPE_PREMIUM_RECURRING_PRICE_ID is set to a PRODUCT ID (${priceId}). It must be a PRICE ID (starting with 'price_').`)
        } else {
            try {
                const subscription = await stripe.subscriptions.create({
                    customer: paymentIntent.customer,
                    items: [{ price: priceId }],
                    trial_period_days: 30, // Month 2 starts in 30 days
                    default_payment_method: paymentIntent.payment_method,
                    metadata: { user_id }
                })

                // 3. Create Subscription Record in DB
                const { error: subError } = await supabase.from('user_subscriptions').upsert({
                    user_id,
                    plan: 'premium',
                    status: 'active',
                    stripe_subscription_id: subscription.id,
                    initial_fee_paid: 49.99,
                    monthly_rate: 3.99,
                    selected_book_ids: selectedBookIds,
                    started_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

                if (subError) console.error('[stripe-webhook] Failed to create subscription record:', subError)

            } catch (e) {
                console.error('Failed to create recurring subscription:', e)
            }
        }
    } else {
        console.warn('[stripe-webhook] STRIPE_PREMIUM_RECURRING_PRICE_ID not set. Skipping recurring subscription creation.')
    }

    // 4. Grant 2 free books to library
    if (selectedBookIds.length > 0) {
        const libraryEntries = selectedBookIds.map((bookId: string) => ({
            user_id,
            book_id: bookId,
            source: 'subscription_signup'
        }))
        // Use onConflict to ignore if user already has the book
        const { error: libError } = await supabase
            .from('user_library')
            .upsert(libraryEntries, { onConflict: 'user_id,book_id' })

        if (libError) console.error('[stripe-webhook] Failed to grant library access:', libError)
    }

    // 5. Generate a Kane Dealer promo code
    // Format: KANE-[FIRSTNAME]-[PHONE_LAST4]
    try {
        const firstName = (full_name || 'MEMBER').split(' ')[0].toUpperCase()
        const phoneLast4 = (phone || '0000').slice(-4)
        const promoCode = `KANE-${firstName}-${phoneLast4}`

        // Use upsert to prevent unique constraint error on code if webhook retries
        const { error: promoError } = await supabase.from('promo_codes').upsert({
            code: promoCode,
            discount_percent: 35,
            is_active: true,
            owner_id: user_id
        }, { onConflict: 'code' })

        if (promoError) console.error('[stripe-webhook] Failed to update/insert promo code:', promoError)
    } catch (e) {
        console.error('Failed to generate promo code string:', e)
    }

    // 6. Trigger Welcome Email
    try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-ops`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
        'canceled': 'cancelled',
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
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            },
            body: JSON.stringify({
                event: 'PAYMENT_FAILED',
                userId: sub.user_id
            })
        })
    }
}
