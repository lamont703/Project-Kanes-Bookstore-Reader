import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/** Admin list of merchandise. Books have their own list at /admin/books. */
export const dynamic = "force-dynamic"

interface VariantRow {
    id: string
    price: number | string
    is_in_stock: boolean
    size: string | null
}

export default async function AdminProductsPage() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("books")
        .select("id, title, status, merch_category, cover_image_url, book_variants (id, price, is_in_stock, size)")
        .eq("product_type", "merch")
        .order("title")

    const products = data ?? []

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl tracking-wide md:text-4xl">Merchandise</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Candles, soap, apparel and accessories. Books are managed in the Catalog.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/products/new">Add Product</Link>
                </Button>
            </div>

            {error && (
                <Card className="p-6 text-muted-foreground">
                    Could not load products: {error.message}
                </Card>
            )}

            {!error && products.length === 0 && (
                <Card className="p-10 text-center">
                    <p className="text-muted-foreground">No merchandise yet.</p>
                    <Button asChild className="mt-4">
                        <Link href="/admin/products/new">Add your first product</Link>
                    </Button>
                </Card>
            )}

            <div className="space-y-3">
                {products.map((product) => {
                    const variants = (product.book_variants ?? []) as VariantRow[]
                    const prices = variants.map((v) => Number(v.price)).filter(Number.isFinite)
                    const low = prices.length ? Math.min(...prices) : null
                    const high = prices.length ? Math.max(...prices) : null
                    const anyInStock = variants.some((v) => v.is_in_stock)

                    return (
                        <Card key={product.id} className="flex items-center gap-4 p-4">
                            <div className="size-16 shrink-0 overflow-hidden rounded bg-muted">
                                {product.cover_image_url && (
                                    <Image
                                        src={product.cover_image_url}
                                        alt={product.title}
                                        width={128}
                                        height={128}
                                        className="size-full object-cover"
                                    />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="truncate font-semibold">{product.title}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full border border-border px-2 py-0.5 uppercase text-muted-foreground">
                                        {product.merch_category}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 uppercase ${
                                            product.status === "published"
                                                ? "bg-green-600/15 text-green-500"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {product.status}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {variants.length} variant{variants.length === 1 ? "" : "s"}
                                    </span>
                                    {!anyInStock && variants.length > 0 && (
                                        <span className="text-orange-500">out of stock</span>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                {low !== null && (
                                    <p className="font-bold text-primary">
                                        {low === high ? `$${low.toFixed(2)}` : `$${low!.toFixed(2)}–$${high!.toFixed(2)}`}
                                    </p>
                                )}
                                <Button asChild variant="outline" size="sm" className="mt-2">
                                    <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
