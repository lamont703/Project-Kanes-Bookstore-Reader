import { findSection, getPublishedPage, setting, type PageDocument } from "@/lib/page-content"
import type { Metadata } from "next"
import Image from "next/image"
import { createStaticClient } from "@/lib/supabase/server"
import { apexUrl, kometzUrl } from "@/lib/hosts"
import { TileGrid, TILE_BASIS } from "@/components/marketing/tile-grid"

export const metadata: Metadata = {
    title: "More Funk | Kane's Komet Bookstore",
    description:
        "The More Funk collection — character-inspired candles, foam soaps, apparel and accessories from Kane's Komet Bookstore.",
    alternates: { canonical: apexUrl("/morefunk") },
}

// Merchandise changes when admin publishes; don't serve a stale build forever.
export const revalidate = 300

interface VariantRow {
    id: string
    price: number | string | null
    is_in_stock: boolean | null
    size: string | null
}

interface ProductRow {
    id: string
    title: string
    cover_image_url: string | null
    merch_category: string | null
    book_variants: VariantRow[] | null
}

/** Price range across in-stock variants — apparel is priced per size. */
function priceRange(variants: VariantRow[] | null): { low: number; high: number } | null {
    const prices = (variants ?? [])
        .filter((v) => v.is_in_stock)
        .map((v) => Number(v.price))
        .filter((n) => Number.isFinite(n) && n > 0)
    if (!prices.length) return null
    return { low: Math.min(...prices), high: Math.max(...prices) }
}


export default async function MoreFunkPage({ previewDocument }: {
    /** Supplied only by the admin draft preview. */
    previewDocument?: PageDocument
} = {}) {
    const copyDoc = previewDocument ?? (await getPublishedPage("morefunk"))
    const header = findSection(copyDoc, "morefunk-header")

    // Public catalog, cookie-free — the marketing host never creates a session.
    const supabase = createStaticClient()

    // Section headings come from merch_categories rather than a map in this
    // file, so a category an admin adds is titled properly here instead of
    // falling back to its raw key (migration 20260827000000).
    const { data: categoryRows } = await supabase
        .from("merch_categories")
        .select("name, label")
    const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
        (categoryRows ?? []).map((c: { name: string; label: string }) => [c.name, c.label]),
    )

    const { data, error } = await supabase
        .from("books")
        .select("id, title, cover_image_url, merch_category, book_variants (id, price, is_in_stock, size)")
        .eq("product_type", "merch")
        .eq("status", "published")
        .order("title", { ascending: true })

    const products = (data ?? []) as ProductRow[]

    // Group by category so candles don't interleave with T-shirts.
    const grouped = products.reduce<Record<string, ProductRow[]>>((acc, product) => {
        const key = product.merch_category ?? "other"
        ;(acc[key] ??= []).push(product)
        return acc
    }, {})
    const categories = Object.keys(grouped).sort()

    return (
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
            <h1 className="font-display text-5xl uppercase tracking-wider md:text-6xl">
                <span className="text-primary" data-edit-setting="morefunk-header:headingPrimary">
                    {setting(header, "headingPrimary") ?? "MORE FUNK"}
                </span>{" "}
                <span className="text-secondary" data-edit-setting="morefunk-header:headingSecondary">
                    {setting(header, "headingSecondary") ?? "COLLECTION"}
                </span>
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground" data-edit-setting="morefunk-header:intro">
                {setting(header, "intro") ??
                    "Character-inspired candles, foam soaps, apparel and accessories."}
            </p>

            {error && (
                <p className="mt-10 rounded-lg border border-border p-6 text-muted-foreground">
                    The collection is unavailable right now. Please try again shortly.
                </p>
            )}

            {!error && products.length === 0 && (
                <p className="mt-10 rounded-lg border border-border p-6 text-muted-foreground">
                    Nothing in the collection yet. Check back soon.
                </p>
            )}

            {categories.map((category) => (
                <section key={category} className="mt-14">
                    <h2 className="font-display text-3xl uppercase tracking-wider text-secondary">
                        {CATEGORY_LABEL[category] ?? category}
                    </h2>
                    <TileGrid className="mt-6">
                        {grouped[category].map((product) => {
                            const range = priceRange(product.book_variants)
                            return (
                                <a
                                    key={product.id}
                                    href={kometzUrl(`/product/${product.id}`)}
                                    className={`${TILE_BASIS} group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50`}
                                >
                                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                                        {product.cover_image_url ? (
                                            <Image
                                                src={product.cover_image_url}
                                                alt={product.title}
                                                width={512}
                                                height={512}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-display mt-3 line-clamp-2 text-lg tracking-wide transition-colors group-hover:text-primary">
                                        {product.title}
                                    </h3>
                                    {range ? (
                                        <p className="mt-1 text-sm font-bold text-primary">
                                            {range.low === range.high
                                                ? `$${range.low.toFixed(2)}`
                                                : `$${range.low.toFixed(2)} – $${range.high.toFixed(2)}`}
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Currently unavailable
                                        </p>
                                    )}
                                </a>
                            )
                        })}
                    </TileGrid>
                </section>
            ))}
        </div>
    )
}
