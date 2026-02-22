import { createClient } from '../_shared/supabase-client.ts'
import { stripe } from '../_shared/stripe-client.ts'

export async function handleCheckout(authHeader: string, body: any) {
    const supabase = createClient(authHeader)

    // 1. Get User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw { status: 401, code: 'UNAUTHORIZED', message: 'User not found' }
    }

    const { items, shippingAddress, promoCode } = body

    if (!items || !items.length) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cart is empty' }
    }

    // 2. Validate Cart and Calculate Totals
    // For MVP, we'll trust the frontend prices but in a real app we'd fetch from DB
    // Let's at least fetch variants to be sure
    const variantIds = items.map((i: any) => i.variantId)
    const { data: variants, error: variantError } = await supabase
        .from('book_variants')
        .select('*, books(title)')
        .in('id', variantIds)

    if (variantError || !variants) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid items in cart' }
    }

    let subtotal = 0
    items.forEach((item: any) => {
        const variant = variants.find(v => v.id === item.variantId)
        if (variant) {
            subtotal += variant.price * item.quantity
        }
    })

    const shipping = items.some((i: any) => i.format !== 'ebook') ? 5.99 : 0
    const tax = subtotal * 0.05
    const total = subtotal + tax + shipping

    // 3. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Stripe expects cents
        currency: 'usd',
        customer: await getOrCreateStripeCustomer(supabase, user),
        metadata: {
            user_id: user.id,
            items: JSON.stringify(items.map((i: any) => ({ id: i.id, q: i.quantity, f: i.format })))
        },
        automatic_payment_methods: {
            enabled: true,
        },
    })

    // 4. Create Order in DB (Pending status)
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending',
            subtotal,
            tax,
            shipping,
            total,
            stripe_payment_intent_id: paymentIntent.id,
            shipping_address: shippingAddress
        })
        .select()
        .single()

    if (orderError) {
        throw { status: 500, code: 'DATABASE_ERROR', message: 'Failed to create order' }
    }

    // 5. Create Order Items
    const orderItems = items.map((item: any) => {
        const variant = variants.find(v => v.id === item.variantId)
        return {
            order_id: order.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            unit_price: variant?.price || 0
        }
    })

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

    if (itemsError) {
        throw { status: 500, code: 'DATABASE_ERROR', message: 'Failed to create order items' }
    }

    return {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id
    }
}

async function getOrCreateStripeCustomer(supabase: any, user: any) {
    const { data: profile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

    if (profile?.stripe_customer_id) {
        return profile.stripe_customer_id
    }

    const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
            supabase_user_id: user.id
        }
    })

    await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id)

    return customer.id
}
