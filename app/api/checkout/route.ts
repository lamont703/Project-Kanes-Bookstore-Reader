import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Types ──────────────────────────────────────────────────
interface CheckoutItem {
    bookId: string
    variantId: string
    format: string
    quantity: number
}

interface CheckoutRequest {
    items: CheckoutItem[]
    dealerCode?: string
    shipping?: {
        firstName: string
        lastName: string
        address: string
        city: string
        zip: string
        country: string
    }
}

// ─── Constants ──────────────────────────────────────────────
const FLAT_SHIPPING_RATE = 5.99
const TAX_RATE = 0.05 // 5% GST

export async function POST(request: NextRequest) {
    try {
        // ── 1. Authenticate the user ────────────────────────────
        const cookieStore = await cookies()
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { /* read-only in route handlers */ },
                },
            }
        )

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required. Please log in.' },
                { status: 401 }
            )
        }

        // ── 2. Parse and validate the request body ──────────────
        const body: CheckoutRequest = await request.json()

        if (!body.items || body.items.length === 0) {
            return NextResponse.json(
                { error: 'Cart is empty.' },
                { status: 400 }
            )
        }

        // ── 3. Use admin client for privileged operations ───────
        const admin = createAdminClient()

        // ── 4. Validate all cart items against the database ─────
        const variantIds = body.items.map(i => i.variantId)
        const { data: variants, error: variantsError } = await admin
            .from('book_variants')
            .select('id, book_id, format, price, is_in_stock, stock_count')
            .in('id', variantIds)

        if (variantsError || !variants) {
            return NextResponse.json(
                { error: 'Failed to validate cart items.' },
                { status: 500 }
            )
        }

        // Check all variants exist
        if (variants.length !== variantIds.length) {
            return NextResponse.json(
                { error: 'One or more items in your cart are no longer available.' },
                { status: 400 }
            )
        }

        // Check stock for each item
        const hasPhysicalItems = body.items.some(i => i.format !== 'ebook')
        for (const item of body.items) {
            const variant = variants.find(v => v.id === item.variantId)
            if (!variant) {
                return NextResponse.json(
                    { error: `Item not found: ${item.variantId}` },
                    { status: 400 }
                )
            }
            if (!variant.is_in_stock) {
                return NextResponse.json(
                    { error: `"${item.format}" format is out of stock.` },
                    { status: 400 }
                )
            }
            // For physical items, check stock count
            if (item.format !== 'ebook' && variant.stock_count !== null && variant.stock_count < item.quantity) {
                return NextResponse.json(
                    { error: `Insufficient stock for ${item.format}. Only ${variant.stock_count} available.` },
                    { status: 400 }
                )
            }
            // Ebook duplicate check
            if (item.format === 'ebook') {
                const { data: existingLib } = await admin
                    .from('user_library')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('book_id', variant.book_id)
                    .maybeSingle()

                if (existingLib) {
                    return NextResponse.json(
                        { error: 'You already own one or more of the ebooks in your cart.' },
                        { status: 400 }
                    )
                }
            }
        }

        // ── 5. Validate dealer code (if provided) ───────────────
        let promoCodeId: string | null = null
        let discountPercent = 0

        if (body.dealerCode && body.dealerCode.trim()) {
            const { data: promo, error: promoError } = await admin
                .from('promo_codes')
                .select('id, owner_id, discount_percent, is_active')
                .eq('code', body.dealerCode.trim().toUpperCase())
                .maybeSingle()

            if (promoError || !promo) {
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

            promoCodeId = promo.id
            discountPercent = promo.discount_percent
        }

        // ── 6. Calculate totals ─────────────────────────────────
        let subtotal = 0
        const orderItems: {
            book_id: string
            variant_id: string
            format: string
            quantity: number
            unit_price: number
        }[] = []

        for (const item of body.items) {
            const variant = variants.find(v => v.id === item.variantId)!
            const lineTotal = variant.price * item.quantity
            subtotal += lineTotal
            orderItems.push({
                book_id: variant.book_id,
                variant_id: variant.id,
                format: variant.format,
                quantity: item.quantity,
                unit_price: variant.price,
            })
        }

        const discountAmount = discountPercent > 0
            ? Math.round(subtotal * (discountPercent / 100) * 100) / 100
            : 0
        const taxableAmount = subtotal - discountAmount
        const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100
        const shippingAmount = hasPhysicalItems ? FLAT_SHIPPING_RATE : 0
        const total = Math.round((taxableAmount + taxAmount + shippingAmount) * 100) / 100

        // ── 7. Create the order ─────────────────────────────────
        const { data: order, error: orderError } = await admin
            .from('orders')
            .insert({
                user_id: user.id,
                status: 'confirmed',
                subtotal,
                discount_amount: discountAmount,
                shipping_amount: shippingAmount,
                tax_amount: taxAmount,
                total,
                has_physical_items: hasPhysicalItems,
                promo_code_id: promoCodeId,
                shipping_name: body.shipping
                    ? `${body.shipping.firstName} ${body.shipping.lastName}`
                    : null,
                shipping_address: body.shipping?.address || null,
                shipping_city: body.shipping?.city || null,
                shipping_zip: body.shipping?.zip || null,
            })
            .select()
            .single()

        if (orderError || !order) {
            console.error('Order creation error:', orderError)
            return NextResponse.json(
                { error: 'Failed to create order. Please try again.' },
                { status: 500 }
            )
        }

        // ── 8. Create order items ───────────────────────────────
        const orderItemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id,
        }))

        const { error: itemsError } = await admin
            .from('order_items')
            .insert(orderItemsWithOrderId)

        if (itemsError) {
            console.error('Order items creation error:', itemsError)
            // Rollback: delete the order
            await admin.from('orders').delete().eq('id', order.id)
            return NextResponse.json(
                { error: 'Failed to process order items. Please try again.' },
                { status: 500 }
            )
        }

        // ── 9. Add digital items to user_library ────────────────
        const digitalFormats = ['ebook', 'komet_card'] // Both grant digital access
        const libraryEntries: { user_id: string; book_id: string; source: string }[] = []

        for (const item of orderItems) {
            if (digitalFormats.includes(item.format)) {
                // Check if already in library (idempotent)
                const { data: existing } = await admin
                    .from('user_library')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('book_id', item.book_id)
                    .maybeSingle()

                if (!existing) {
                    libraryEntries.push({
                        user_id: user.id,
                        book_id: item.book_id,
                        source: 'purchase',
                    })
                }
            }
        }

        if (libraryEntries.length > 0) {
            const { error: libError } = await admin
                .from('user_library')
                .insert(libraryEntries)

            if (libError) {
                console.error('Library entry error:', libError)
                // Non-fatal — order succeeded, library can be fixed manually
            }
        }

        // ── 10. Update stock counts for physical items ──────────
        for (const item of orderItems) {
            if (item.format !== 'ebook') {
                const variant = variants.find(v => v.id === item.variant_id)
                if (variant && variant.stock_count !== null) {
                    await admin
                        .from('book_variants')
                        .update({ stock_count: variant.stock_count - item.quantity })
                        .eq('id', item.variant_id)
                }
            }
        }

        // ── 11. Record promo code usage ─────────────────────────
        if (promoCodeId) {
            await admin
                .from('promo_code_usages')
                .insert({
                    promo_code_id: promoCodeId,
                    used_by_user_id: user.id,
                    order_id: order.id,
                    discount_amount: discountAmount,
                })

            // Increment total_uses counter
            const { data: currentPromo } = await admin
                .from('promo_codes')
                .select('total_uses')
                .eq('id', promoCodeId)
                .single()

            if (currentPromo) {
                await admin
                    .from('promo_codes')
                    .update({ total_uses: (currentPromo.total_uses || 0) + 1 })
                    .eq('id', promoCodeId)
            }
        }

        // ── 12. Return success ──────────────────────────────────
        return NextResponse.json({
            success: true,
            orderId: order.id,
            total,
            itemCount: orderItems.length,
            digitalItems: libraryEntries.length,
            hasPhysicalItems,
        })

    } catch (err: any) {
        console.error('Checkout error:', err)
        return NextResponse.json(
            { error: err.message || 'An unexpected error occurred.' },
            { status: 500 }
        )
    }
}
