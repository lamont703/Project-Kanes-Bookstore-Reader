import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { ProductPurchase } from "@/components/product-purchase"

/**
 * Merchandise detail page (app host).
 *
 * Merch lives in the `books` table with product_type='merch' — see migration
 * 20260811000001_extend_books_to_catalog.sql. It gets its own route rather than
 * reusing /book/[id], which renders author, formats and reader affordances that
 * a candle does not have.
 */

export const dynamic = "force-dynamic"

interface VariantRow {
    id: string
    format: string
    price: number | string
    is_in_stock: boolean
    size: string | null
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("books")
        .select(`
            id,
            title,
            description,
            cover_image_url,
            merch_category,
            status,
            book_variants (id, format, price, is_in_stock, size)
        `)
        .eq("id", id)
        .eq("product_type", "merch")
        .eq("status", "published")
        .single()

    if (error || !data) notFound()

    const variants = ((data.book_variants ?? []) as VariantRow[])
        .map((v) => ({ ...v, price: Number(v.price) }))
        .sort((a, b) => {
            // Present apparel in wearable order, not alphabetical.
            const order = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"]
            const ai = a.size ? order.indexOf(a.size) : -1
            const bi = b.size ? order.indexOf(b.size) : -1
            return ai - bi
        })

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <div className="container mx-auto px-4 py-8 md:py-12">
                <ProductPurchase
                    product={{
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        coverImage: data.cover_image_url,
                        category: data.merch_category,
                    }}
                    variants={variants}
                />
            </div>
        </div>
    )
}
