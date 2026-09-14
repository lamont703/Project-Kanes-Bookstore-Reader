"use client"

import * as React from "react"
import Image from "next/image"
import { ShoppingCart, Check, Minus, Plus } from "lucide-react"

import { BackLink } from "@/components/back-link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCart } from "@/context/cart-context"
import type { BookFormat } from "@/lib/types/book"

interface Variant {
    id: string
    format: string
    price: number
    is_in_stock: boolean
    size: string | null
    stock_quantity?: number | null
}

interface Product {
    id: string
    title: string
    description: string | null
    coverImage: string | null
    category: string | null
}

/**
 * Purchase UI for merchandise.
 *
 * Sized products (apparel) expose one variant per size; unsized products
 * (candles, soap) have a single variant. Either way the cart line is keyed by
 * variantId, which is the real SKU — see context/cart-context.tsx.
 */
export function ProductPurchase({ product, variants }: { product: Product; variants: Variant[] }) {
    const { addToCart } = useCart()
    const [quantity, setQuantity] = React.useState(1)
    const [added, setAdded] = React.useState(false)

    const sized = variants.some((v) => v.size)
    const inStock = variants.filter((v) => v.is_in_stock)

    const [selectedId, setSelectedId] = React.useState<string | null>(
        inStock[0]?.id ?? null,
    )
    const selected = variants.find((v) => v.id === selectedId) ?? null

    /**
     * Most this variant can be bought in one go.
     *
     * 99 is the ceiling process-checkout enforces; a tracked variant is further
     * capped at what is actually on hand, so the picker cannot offer a quantity
     * the server will refuse.
     */
    const maxQuantity = Math.max(
        1,
        Math.min(99, selected?.stock_quantity ?? 99),
    )

    // Changing size changes the SKU, and the new one may have less stock.
    React.useEffect(() => {
        setQuantity((q) => Math.min(q, maxQuantity))
    }, [maxQuantity])

    const handleAdd = () => {
        if (!selected || !selected.is_in_stock) return
        addToCart({
            id: product.id,
            variantId: selected.id,
            title: product.title,
            price: selected.price,
            coverImage: product.coverImage ?? "",
            format: selected.format as BookFormat,
            size: selected.size,
        }, quantity)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="mx-auto max-w-5xl">
            {/* Falls back to the merch collection rather than /browse: someone
                who lands on a candle directly is looking for merchandise, not
                the book catalogue. */}
            <BackLink fallbackHref="/morefunk" />

            <div className="grid gap-10 md:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-border bg-muted">
                    {product.coverImage ? (
                        <Image
                            src={product.coverImage}
                            alt={product.title}
                            width={800}
                            height={800}
                            className="h-auto w-full object-cover"
                            priority
                        />
                    ) : (
                        <div className="flex aspect-square items-center justify-center text-muted-foreground">
                            No image
                        </div>
                    )}
                </div>

                <div>
                    {product.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                            {product.category}
                        </span>
                    )}
                    <h1 className="font-display mt-2 text-3xl tracking-wide md:text-4xl">
                        {product.title}
                    </h1>

                    {selected ? (
                        <p className="mt-4 text-2xl font-bold text-primary">
                            ${selected.price.toFixed(2)}
                        </p>
                    ) : (
                        <p className="mt-4 text-lg text-muted-foreground">Currently unavailable</p>
                    )}

                    {product.description && (
                        <p className="mt-6 leading-relaxed text-muted-foreground">
                            {product.description}
                        </p>
                    )}

                    {sized && (
                        <div className="mt-8">
                            <h2 className="mb-3 text-sm font-semibold">Size</h2>
                            <div className="flex flex-wrap gap-2">
                                {variants.map((v) => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        disabled={!v.is_in_stock}
                                        onClick={() => setSelectedId(v.id)}
                                        aria-pressed={selectedId === v.id}
                                        className={`min-w-14 rounded-lg border px-3 py-2 text-sm font-bold uppercase transition-colors ${
                                            selectedId === v.id
                                                ? "border-orange-500 bg-orange-600/20 text-orange-500"
                                                : "border-border text-muted-foreground hover:border-orange-500/50"
                                        } ${!v.is_in_stock ? "cursor-not-allowed opacity-30" : ""}`}
                                    >
                                        {v.size}
                                    </button>
                                ))}
                            </div>
                            {selected && !selected.is_in_stock && (
                                <p className="mt-3 text-sm text-muted-foreground">
                                    That size is out of stock.
                                </p>
                            )}
                        </div>
                    )}

                    <Card className="mt-8 p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Quantity</span>
                            <div className="flex items-center rounded-lg border border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Decrease quantity"
                                    disabled={quantity <= 1}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                >
                                    <Minus className="size-4" />
                                </Button>
                                <input
                                    type="number"
                                    min={1}
                                    max={maxQuantity}
                                    value={quantity}
                                    aria-label="Quantity"
                                    onChange={(e) => {
                                        const n = Math.floor(Number(e.target.value))
                                        // Ignore junk rather than resetting to 1 mid-typing.
                                        if (!Number.isFinite(n)) return
                                        setQuantity(Math.min(maxQuantity, Math.max(1, n)))
                                    }}
                                    className="w-14 border-x border-border bg-transparent px-2 py-1.5 text-center text-sm focus:outline-none"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Increase quantity"
                                    disabled={quantity >= maxQuantity}
                                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                                >
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            {selected?.stock_quantity != null && selected.stock_quantity <= 10 && (
                                <span className="text-xs text-yellow-500">
                                    only {selected.stock_quantity} left
                                </span>
                            )}
                        </div>

                        <Button
                            size="lg"
                            className="w-full"
                            disabled={!selected || !selected.is_in_stock || added}
                            onClick={handleAdd}
                        >
                            {added ? (
                                <>
                                    <Check className="mr-2 size-5" />
                                    Added to Cart
                                </>
                            ) : !selected || !selected.is_in_stock ? (
                                "Out of Stock"
                            ) : (
                                <>
                                    <ShoppingCart className="mr-2 size-5" />
                                    Add to Cart
                                </>
                            )}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    )
}
