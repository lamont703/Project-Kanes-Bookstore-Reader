import { createClient, createAdminClient } from '../_shared/supabase-client.ts'
import { stripe } from '../_shared/stripe-client.ts'

export async function handleCheckout(authHeader: string, body: any) {
    const supabase = createClient(authHeader)
    const adminSupabase = createAdminClient()

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
    const variantIds = items.map((i: any) => i.variantId)
    const { data: variants, error: variantError } = await adminSupabase
        .from('book_variants')
        .select('*')
        .in('id', variantIds)

    if (variantError || !variants) {
        console.error('Variant validation error:', variantError)
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid items in cart' }
    }

    let subtotal = 0
    items.forEach((item: any) => {
        const variant = variants.find(v => v.id === item.variantId)
        if (variant) {
            subtotal += variant.price * item.quantity
        }
    })

    // 2.1 Handle Promo Code
    let discountAmount = 0
    let promoCodeId = null
    if (promoCode) {
        const { data: promo } = await adminSupabase
            .from('promo_codes')
            .select('id, discount_percent')
            .eq('code', promoCode.trim().toUpperCase())
            .eq('is_active', true)
            .maybeSingle()

        if (promo) {
            promoCodeId = promo.id
            discountAmount = subtotal * (promo.discount_percent / 100)
        }
    }

    const shippingAmount = items.some((i: any) => i.format !== 'ebook') ? 5.99 : 0
    const taxAmount = (subtotal - discountAmount) * 0.05
    const totalAmount = subtotal - discountAmount + taxAmount + shippingAmount

    // 3. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe expects cents
        currency: 'usd',
        customer: await getOrCreateStripeCustomer(adminSupabase, user),
        metadata: {
            user_id: user.id,
            items: JSON.stringify(items.map((i: any) => ({ id: i.bookId, q: i.quantity, f: i.format }))),
            promo_code: promoCode || null
        },
        automatic_payment_methods: {
            enabled: true,
        },
    })

    // 4. Create Order in DB (Pending status)
    const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending',
            subtotal,
            discount_amount: discountAmount,
            shipping_amount: shippingAmount,
            tax_amount: taxAmount,
            total: totalAmount,
            has_physical_items: shippingAmount > 0,
            promo_code_id: promoCodeId,
            stripe_payment_intent_id: paymentIntent.id,
            shipping_name: shippingAddress ? `${shippingAddress.firstName} ${shippingAddress.lastName}` : null,
            shipping_address: shippingAddress?.address,
            shipping_city: shippingAddress?.city,
            shipping_zip: shippingAddress?.zip,
            shipping_state: null,
        })
        .select()
        .single()

    if (orderError) {
        console.error('Order creation error:', orderError)
        throw { status: 500, code: 'DATABASE_ERROR', message: 'Failed to create order' }
    }

    // 4.1 Create Promo Usage entry
    if (promoCodeId) {
        await adminSupabase.from('promo_code_usages').insert({
            promo_code_id: promoCodeId,
            used_by_user_id: user.id,
            order_id: order.id,
            discount_amount: discountAmount
        })
    }

    // 5. Create Order Items
    const orderItems = items.map((item: any) => {
        const variant = variants.find(v => v.id === item.variantId)
        return {
            order_id: order.id,
            book_id: item.bookId,
            variant_id: item.variantId,
            format: item.format,
            quantity: item.quantity,
            unit_price: variant?.price || 0
        }
    })

    const { error: itemsError } = await adminSupabase
        .from('order_items')
        .insert(orderItems)

    if (itemsError) {
        console.error('Order items creation error:', itemsError)
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
