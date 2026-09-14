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

    // 2. Validate the cart against the database.
    //
    // Every value that decides what is charged, what is owed, or what is
    // fulfilled is read back from the variant row. The request supplies only
    // variantId and quantity; price, format, book_id, stock and publication
    // state all come from the database. This function is callable directly, not
    // just through the checkout page, so the request body cannot be trusted.
    const variantIds = items.map((i: any) => i.variantId)

    if (variantIds.some((id: any) => typeof id !== 'string' || !id)) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid items in cart' }
    }

    const { data: variants, error: variantError } = await adminSupabase
        .from('book_variants')
        .select('id, book_id, format, price, is_in_stock, stock_quantity, book:books(id, title, status, deleted_at)')
        .in('id', variantIds)

    if (variantError || !variants) {
        console.error('Variant validation error:', variantError)
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid items in cart' }
    }

    // Resolve every line up front and reject the whole order if any line fails.
    // Previously an unresolvable line was silently skipped by the subtotal loop
    // but still written to order_items at unit_price 0 — a free item.
    const lines = items.map((item: any) => {
        const variant: any = variants.find((v: any) => v.id === item.variantId)
        if (!variant) {
            throw {
                status: 400,
                code: 'ITEM_UNAVAILABLE',
                message: 'An item in your cart is no longer available.'
            }
        }

        const quantity = Number(item.quantity)
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            // A negative quantity used to subtract from the subtotal, which let
            // one line pay for another.
            throw {
                status: 400,
                code: 'VALIDATION_ERROR',
                message: 'Item quantity must be a whole number between 1 and 99.'
            }
        }

        const book = variant.book
        if (!book || book.status !== 'published' || book.deleted_at !== null) {
            throw {
                status: 400,
                code: 'ITEM_UNAVAILABLE',
                message: 'An item in your cart is no longer available for purchase.'
            }
        }

        if (!variant.is_in_stock) {
            throw {
                status: 400,
                code: 'OUT_OF_STOCK',
                message: `"${book.title}" is out of stock.`
            }
        }

        // stock_quantity NULL means the variant is not inventory-tracked
        // (ebooks are unlimited). A number means we must have enough.
        //
        // This is a check, not a reservation: stock is only decremented once
        // payment succeeds, so two people can still pass this check for the last
        // unit. decrement_variant_stock() is the backstop that refuses to go
        // negative, and surfaces the loser as a failed fulfilment.
        if (variant.stock_quantity !== null && variant.stock_quantity < quantity) {
            throw {
                status: 400,
                code: 'OUT_OF_STOCK',
                message: variant.stock_quantity === 0
                    ? `"${book.title}" is out of stock.`
                    : `Only ${variant.stock_quantity} of "${book.title}" left.`
            }
        }

        return { variant, book, quantity }
    })

    const subtotal = lines.reduce(
        (sum: number, l: any) => sum + Number(l.variant.price) * l.quantity,
        0
    )

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

    // Physicality is a property of the variant, not of whatever format the
    // request claimed — otherwise a candle could be labelled an ebook to skip
    // the shipping charge.
    const hasPhysicalItems = lines.some((l: any) => l.variant.format !== 'ebook')
    const shippingAmount = hasPhysicalItems ? 5.99 : 0

    // Nothing physical can be delivered without somewhere to send it. The
    // checkout page enforces this, but the page is not the only caller.
    if (hasPhysicalItems) {
        const a = shippingAddress
        if (!a?.address || !a?.city || !a?.zip || !a?.state) {
            throw {
                status: 400,
                code: 'VALIDATION_ERROR',
                message: 'A complete shipping address is required for physical items.'
            }
        }
    }
    const taxAmount = (subtotal - discountAmount) * 0.05
    const totalAmount = subtotal - discountAmount + taxAmount + shippingAmount

    // 3. Handle Zero or Small Amounts
    // Stripe USD minimum is $0.50
    if (totalAmount > 0 && totalAmount < 0.50) {
        throw {
            status: 400,
            code: 'AMOUNT_TOO_SMALL',
            message: 'Stripe requires a minimum purchase amount of $0.50 USD. Please add more items to your cart or use a discount that covers the full amount.'
        }
    }

    let paymentIntentId = null
    let clientSecret = null

    if (totalAmount > 0) {
        // 4. Create Stripe Payment Intent for non-zero amounts
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Stripe expects cents
            currency: 'usd',
            customer: await getOrCreateStripeCustomer(adminSupabase, user),
            metadata: {
                user_id: user.id,
                items: JSON.stringify(lines.map((l: any) => ({ id: l.variant.book_id, q: l.quantity, f: l.variant.format }))),
                promo_code: promoCode || null
            },
            automatic_payment_methods: {
                enabled: true,
            },
        })
        paymentIntentId = paymentIntent.id
        clientSecret = paymentIntent.client_secret
    }

    // 5. Create Order in DB
    const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: totalAmount > 0 ? 'pending' : 'paid', // Mark as paid if $0
            subtotal,
            discount_amount: discountAmount,
            shipping_amount: shippingAmount,
            tax_amount: taxAmount,
            total: totalAmount,
            has_physical_items: hasPhysicalItems,
            promo_code_id: promoCodeId,
            stripe_payment_intent_id: paymentIntentId,
            shipping_name: shippingAddress ? `${shippingAddress.firstName} ${shippingAddress.lastName}` : null,
            shipping_address: shippingAddress?.address,
            shipping_city: shippingAddress?.city,
            shipping_zip: shippingAddress?.zip,
            shipping_state: shippingAddress?.state ?? null,
        })
        .select()
        .single()

    if (orderError) {
        console.error('Order creation error:', orderError)
        throw { status: 500, code: 'DATABASE_ERROR', message: 'Failed to create order' }
    }

    // 5.1 Create Promo Usage entry
    if (promoCodeId) {
        await adminSupabase.from('promo_code_usages').insert({
            promo_code_id: promoCodeId,
            used_by_user_id: user.id,
            order_id: order.id,
            discount_amount: discountAmount
        })
    }

    // 6. Create Order Items
    // book_id and format come from the variant, not the request, so the order
    // record always describes what was actually bought.
    const orderItems = lines.map((l: any) => ({
        order_id: order.id,
        book_id: l.variant.book_id,
        variant_id: l.variant.id,
        format: l.variant.format,
        quantity: l.quantity,
        unit_price: Number(l.variant.price)
    }))

    const { error: itemsError } = await adminSupabase
        .from('order_items')
        .insert(orderItems)

    if (itemsError) {
        console.error('Order items creation error:', itemsError)
        throw { status: 500, code: 'DATABASE_ERROR', message: 'Failed to create order items' }
    }

    return {
        clientSecret,
        orderId: order.id,
        isFree: totalAmount === 0
    }
}

async function getOrCreateStripeCustomer(supabase: any, user: any) {
    const { data: profile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

    let customerId = profile?.stripe_customer_id

    // If we have an ID, verify it exists in the CURRENT Stripe environment (Test vs Live)
    if (customerId) {
        try {
            await stripe.customers.retrieve(customerId)
            return customerId
        } catch (error: any) {
            // If Stripe says "No such customer", we need to create a new one for this environment
            if (error.raw?.code === 'resource_missing' || error.statusCode === 404) {
                console.log(`Customer ${customerId} not found in current Stripe environment. Creating new one.`)
                customerId = null
            } else {
                // For other errors (API down, network, etc), rethrow
                throw error
            }
        }
    }

    // Create new customer if none exists or if existing one was from a different environment
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
