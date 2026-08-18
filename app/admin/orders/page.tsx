export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminOrdersContent } from "@/components/admin/admin-orders-content"

export default async function AdminOrdersPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login?redirect=/admin/orders")
    }

    // Fetch all orders with their items, variants, books, and customer info
    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            user_id,
            status,
            subtotal,
            tax_amount,
            shipping_amount,
            total,
            shipping_name,
            shipping_email,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip,
            placed_at,
            has_physical_items,
            fulfillment_status,
            tracking_number,
            tracking_carrier,
            shipped_at,
            users:user_id (
                email,
                full_name,
                display_name
            ),
            order_items (
                id,
                variant_id,
                quantity,
                unit_price,
                book_variants:variant_id (
                    format,
                    books:book_id (
                        title,
                        author
                    )
                )
            )
        `)
        .order("placed_at", { ascending: false })

    if (error) {
        console.error("DEBUG - Failed to fetch orders for admin. Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
    }

    return (
        <AdminOrdersContent initialOrders={(data as any) || []} />
    )
}
