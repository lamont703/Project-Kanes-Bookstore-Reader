import type { Metadata } from "next"
import Image from "next/image"
import { createStaticClient } from "@/lib/supabase/server"
import { apexUrl, bookDetailUrl, kometzUrl } from "@/lib/hosts"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Komet Books | Kane's Komet Bookstore",
    description:
        "Browse the Komet book collection, exclusively published by Emanuel and Bass Publishing, plus Kane's handpicked must-reads.",
    alternates: { canonical: apexUrl("/kometbooks") },
}

// The catalog changes when admin publishes; don't serve a stale build forever.
export const revalidate = 300

interface VariantRow {
    id: string
    format: string
    price: number | string | null
    is_in_stock: boolean | null
}

interface BookRow {
    id: string
    title: string
    author: string | null
    cover_image_url: string | null
    genre: string | null
    book_variants: VariantRow[] | null
}

/**
 * Price to advertise for a book.
 *
 * Mirrors components/book-card.tsx on the app host: prefer the ebook when it is
 * in stock, otherwise the first in-stock format. Do NOT use the lowest price
 * across all variants — an out-of-stock ebook is often the cheapest, and
 * advertising it here would quote a price kometz will not honour at checkout.
 * Returns null when nothing is in stock.
 */
function displayPrice(variants: VariantRow[] | null): number | null {
    const inStock = (variants ?? []).filter(
        (v) => v.is_in_stock && v.price != null && Number.isFinite(Number(v.price)),
    )
    if (!inStock.length) return null
    const preferred = inStock.find((v) => v.format === "ebook") ?? inStock[0]
    return Number(preferred.price)
}

export default async function KometBooksPage() {
    // Cookie-free anon client on purpose. The marketing host never creates a
    // session, and the published catalog is public — so this page can be
    // statically rendered and revalidated rather than forced dynamic. This is
    // the case createStaticClient() is for; see lib/supabase/server.ts.
    const supabase = createStaticClient()

    // Same source of truth as the app host's /browse — published books only.
    const { data, error } = await supabase
        .from("books")
        .select("id, title, author, cover_image_url, genre, book_variants (id, format, price, is_in_stock)")
        .eq("status", "published")
        .eq("product_type", "book")
        .order("title", { ascending: true })

    const books = (data ?? []) as BookRow[]

    return (
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
            <h1 className="font-display text-5xl uppercase tracking-wider md:text-6xl">
                <span className="text-primary">THE KOMET</span>{" "}
                <span className="text-secondary">BOOK COLLECTION</span>
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
                The Komet collection, exclusively published by Emanuel and Bass Publishing, alongside
                Kane&apos;s handpicked must-reads. Tap any title to read more and purchase.
            </p>

            {error && (
                <p className="mt-10 rounded-lg border border-border p-6 text-muted-foreground">
                    The catalog is unavailable right now. Please try again shortly, or{" "}
                    <a href={kometzUrl("/browse")} className="text-primary underline">
                        browse the full store
                    </a>
                    .
                </p>
            )}

            {!error && books.length === 0 && (
                <p className="mt-10 rounded-lg border border-border p-6 text-muted-foreground">
                    No books are published yet. Check back soon.
                </p>
            )}

            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {books.map((book) => {
                    const price = displayPrice(book.book_variants)
                    return (
                        <a
                            key={book.id}
                            href={bookDetailUrl(book.id)}
                            className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
                        >
                            <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                                {book.cover_image_url ? (
                                    <Image
                                        src={book.cover_image_url}
                                        alt={book.title}
                                        width={400}
                                        height={600}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                        No cover
                                    </div>
                                )}
                            </div>
                            <h2 className="font-display mt-3 line-clamp-2 text-lg tracking-wide transition-colors group-hover:text-primary">{book.title}</h2>
                            {book.author && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
                            )}
                            {price !== null ? (
                                <p className="mt-1 text-sm font-bold text-primary">
                                    ${price.toFixed(2)}
                                </p>
                            ) : (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Currently unavailable
                                </p>
                            )}
                        </a>
                    )
                })}
            </div>

            <div className="mt-14 text-center">
                <Button asChild size="lg">
                    <a href={kometzUrl("/browse")}>Browse the Full Store</a>
                </Button>
            </div>
        </div>
    )
}
