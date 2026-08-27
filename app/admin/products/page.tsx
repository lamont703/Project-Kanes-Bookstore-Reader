import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BrowsePagination } from "@/components/browse-pagination"
import { AdminProductFilters, type CategoryOption } from "@/components/admin/admin-product-filters"
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/lib/browse-options"

/** Admin list of merchandise. Books have their own list at /admin/books. */
export const dynamic = "force-dynamic"

interface VariantRow {
    id: string
    price: number | string
    is_in_stock: boolean
    size: string | null
    stock_quantity: number | null
}

interface ProductRow {
    id: string
    title: string
    status: string
    merch_category: string | null
    cover_image_url: string | null
    created_at: string
    book_variants: VariantRow[] | null
}


/** Lowest in-stock price, used for display and for price sorting. */
function priceOf(variants: VariantRow[]): number | null {
    const prices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n))
    return prices.length ? Math.min(...prices) : null
}

/** Total units across tracked variants. null when nothing is tracked. */
function unitsOf(variants: VariantRow[]): number | null {
    const tracked = variants.filter((v) => v.stock_quantity !== null)
    if (!tracked.length) return null
    return tracked.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0)
}

export default async function AdminProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const q = ((params.q as string) ?? "").trim().toLowerCase()
    const category = (params.category as string) ?? "all"
    const status = (params.status as string) ?? "all"
    const sort = (params.sort as string) ?? "title"

    const requestedPerPage = Number(params.perPage)
    const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(requestedPerPage)
        ? requestedPerPage
        : DEFAULT_PER_PAGE
    const requestedPage = Number(params.page)
    const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1

    const supabase = await createClient()

    // Labels come from merch_categories, not a constant in this file, so a
    // category an admin just added reads properly in the filters and the rows
    // instead of showing its raw key (migration 20260827000000).
    const { data: categoryRows } = await supabase
        .from("merch_categories")
        .select("name, label")
    const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
        (categoryRows ?? []).map((c: { name: string; label: string }) => [c.name, c.label]),
    )

    // One query for the whole merch catalogue, then filter, sort and page in
    // memory.
    //
    // Price and stock live in book_variants, a to-many relation, so Postgres
    // cannot order parent rows by them — the same constraint /browse hit. There
    // the catalogue is 435 rows and worth the care; a merchandise list is tens
    // of items, so fetching it whole is simpler and lets every control work the
    // same way. The explicit bound keeps that assumption honest instead of
    // silently truncating if the shop grows.
    const { data, error } = await supabase
        .from("books")
        .select(
            "id, title, status, merch_category, cover_image_url, created_at, book_variants (id, price, is_in_stock, size, stock_quantity)",
        )
        .eq("product_type", "merch")
        .order("title")
        .range(0, 999)

    const all = (data ?? []) as ProductRow[]

    // Counts come from the unfiltered set so the controls always show the whole
    // shop, not a shrinking view of themselves.
    const counts = {
        all: all.length,
        published: all.filter((p) => p.status === "published").length,
        draft: all.filter((p) => p.status !== "published").length,
    }

    const categories: CategoryOption[] = Object.entries(
        all.reduce<Record<string, number>>((acc, p) => {
            const key = p.merch_category ?? "other"
            acc[key] = (acc[key] ?? 0) + 1
            return acc
        }, {}),
    )
        .map(([value, count]) => ({ value, label: CATEGORY_LABEL[value] ?? value, count }))
        .sort((a, b) => a.label.localeCompare(b.label))

    const filtered = all.filter((p) => {
        if (q && !p.title.toLowerCase().includes(q)) return false
        if (category !== "all" && (p.merch_category ?? "other") !== category) return false
        if (status === "published" && p.status !== "published") return false
        if (status === "draft" && p.status === "published") return false
        return true
    })

    const sorted = [...filtered].sort((a, b) => {
        const av = a.book_variants ?? []
        const bv = b.book_variants ?? []
        switch (sort) {
            case "title-desc":
                return b.title.localeCompare(a.title)
            case "newest":
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            case "price-high":
                return (priceOf(bv) ?? -Infinity) - (priceOf(av) ?? -Infinity)
            case "price-low":
                return (priceOf(av) ?? Infinity) - (priceOf(bv) ?? Infinity)
            case "stock-low":
                // Untracked variants sort last: they are not low on stock, they
                // simply have no count to compare.
                return (unitsOf(av) ?? Infinity) - (unitsOf(bv) ?? Infinity)
            default:
                return a.title.localeCompare(b.title)
        }
    })

    const total = sorted.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const from = (page - 1) * perPage
    const products = sorted.slice(from, from + perPage)
    const rangeStart = total === 0 ? 0 : from + 1
    const rangeEnd = Math.min(from + perPage, total)

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between gap-4">
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

            {!error && all.length === 0 && (
                <Card className="p-10 text-center">
                    <p className="text-muted-foreground">No merchandise yet.</p>
                    <Button asChild className="mt-4">
                        <Link href="/admin/products/new">Add your first product</Link>
                    </Button>
                </Card>
            )}

            {all.length > 0 && (
                <>
                    <AdminProductFilters categories={categories} counts={counts} />

                    {products.length === 0 ? (
                        <Card className="p-10 text-center text-muted-foreground">
                            No merchandise matches these filters.
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {products.map((product) => {
                                const variants = product.book_variants ?? []
                                const prices = variants
                                    .map((v) => Number(v.price))
                                    .filter((n) => Number.isFinite(n))
                                const low = prices.length ? Math.min(...prices) : null
                                const high = prices.length ? Math.max(...prices) : null
                                const anyInStock = variants.some((v) => v.is_in_stock)
                                const units = unitsOf(variants)

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
                                                    {CATEGORY_LABEL[product.merch_category ?? ""] ??
                                                        product.merch_category}
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
                                                    {variants.length} variant
                                                    {variants.length === 1 ? "" : "s"}
                                                </span>
                                                {units !== null && (
                                                    <span
                                                        className={
                                                            units === 0
                                                                ? "text-orange-500"
                                                                : units <= 5
                                                                  ? "text-yellow-500"
                                                                  : "text-muted-foreground"
                                                        }
                                                    >
                                                        {units} unit{units === 1 ? "" : "s"} on hand
                                                    </span>
                                                )}
                                                {!anyInStock && variants.length > 0 && (
                                                    <span className="text-orange-500">out of stock</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            {low !== null && (
                                                <p className="font-bold text-primary">
                                                    {low === high
                                                        ? `$${low.toFixed(2)}`
                                                        : `$${low.toFixed(2)}–$${high!.toFixed(2)}`}
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
                    )}

                    <BrowsePagination
                        page={Math.min(page, totalPages)}
                        totalPages={totalPages}
                        perPage={perPage}
                        total={total}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        basePath="/admin/products"
                        noun="item"
                    />
                </>
            )}
        </div>
    )
}
