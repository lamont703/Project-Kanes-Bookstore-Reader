import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProductForm, type ExistingProduct } from "@/components/admin/product-form"

export const dynamic = "force-dynamic"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("books")
        .select("id, title, description, merch_category, status, cover_image_url, book_variants (id, price, is_in_stock, size)")
        .eq("id", id)
        .eq("product_type", "merch")
        .single()

    if (error || !data) notFound()

    const product: ExistingProduct = {
        id: data.id,
        title: data.title,
        description: data.description,
        merch_category: data.merch_category,
        status: data.status,
        cover_image_url: data.cover_image_url,
        variants: (data.book_variants ?? []).map((v: { id: string; price: number | string; is_in_stock: boolean; size: string | null }) => ({
            id: v.id,
            price: Number(v.price),
            is_in_stock: v.is_in_stock,
            size: v.size,
        })),
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="font-display mb-8 text-3xl tracking-wide md:text-4xl">Edit Product</h1>
            <ProductForm product={product} />
        </div>
    )
}
