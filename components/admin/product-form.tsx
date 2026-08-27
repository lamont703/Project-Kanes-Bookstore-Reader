"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { MerchCategoryManager } from "@/components/admin/merch-category-manager"
import {
    FALLBACK_MERCH_CATEGORIES,
    type MerchCategoryRow,
} from "@/lib/merch-categories"

/**
 * Admin form for merchandise (candles, soap, apparel, accessories).
 *
 * Separate from components/admin/book-form.tsx, which requires a PDF and posts
 * to the upload-book Edge Function to parse it — merch has no PDF and needs no
 * parsing. Merch is stored in `books` with product_type='merch'; see migration
 * 20260811000001_extend_books_to_catalog.sql for why the catalog is one table.
 */

/**
 * Any category name in merch_categories. Was a union of four literals while the
 * column was an enum; an admin can now add categories at runtime, so the type
 * cannot enumerate them (migration 20260827000000).
 */
export type MerchCategory = string

export const SIZES = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"] as const

export interface ExistingVariant {
    id: string
    price: number
    is_in_stock: boolean
    size: string | null
    /** Units on hand. null means this variant is not inventory-tracked. */
    stock_quantity: number | null
}

export interface ExistingProduct {
    id: string
    title: string
    description: string | null
    merch_category: MerchCategory
    status: "draft" | "published"
    cover_image_url: string | null
    variants: ExistingVariant[]
}

interface SizeRow {
    enabled: boolean
    price: string
    inStock: boolean
    /** Empty string means "don't track" — stored as NULL. */
    stock: string
}

function emptySizeRows(existing?: ExistingVariant[]): Record<string, SizeRow> {
    const rows: Record<string, SizeRow> = {}
    for (const size of SIZES) {
        const match = existing?.find((v) => v.size === size)
        rows[size] = {
            enabled: !!match,
            price: match ? String(match.price) : "",
            inStock: match ? match.is_in_stock : true,
            stock: match?.stock_quantity != null ? String(match.stock_quantity) : "",
        }
    }
    return rows
}

export function ProductForm({ product }: { product?: ExistingProduct }) {
    const router = useRouter()
    const supabase = React.useMemo(() => createClient(), [])
    const isEdit = !!product

    const unsized = product?.variants.find((v) => !v.size)

    const [title, setTitle] = React.useState(product?.title ?? "")
    const [description, setDescription] = React.useState(product?.description ?? "")
    const [categories, setCategories] = React.useState<MerchCategoryRow[]>(
        FALLBACK_MERCH_CATEGORIES,
    )
    const [category, setCategory] = React.useState<MerchCategory>(
        product?.merch_category ?? "candle",
    )
    const [showCategoryManager, setShowCategoryManager] = React.useState(false)

    const loadCategories = React.useCallback(async () => {
        const { data } = await supabase
            .from("merch_categories")
            .select("name, label, sort_order, is_active, is_sized")
            .order("sort_order")
            .order("label")
        if (data?.length) setCategories(data as MerchCategoryRow[])
    }, [supabase])

    React.useEffect(() => {
        loadCategories()
    }, [loadCategories])

    /**
     * Retired categories stay listed while a product still carries one, so
     * editing an old product does not silently move it somewhere else.
     */
    const selectable = categories.filter((c) => c.is_active || c.name === category)
    const [status, setStatus] = React.useState<"draft" | "published">(product?.status ?? "draft")
    const [price, setPrice] = React.useState(unsized ? String(unsized.price) : "")
    const [inStock, setInStock] = React.useState(unsized ? unsized.is_in_stock : true)
    const [stock, setStock] = React.useState(
        unsized?.stock_quantity != null ? String(unsized.stock_quantity) : "",
    )
    const [sizeRows, setSizeRows] = React.useState(() => emptySizeRows(product?.variants))
    const [imageFile, setImageFile] = React.useState<File | null>(null)
    const [preview, setPreview] = React.useState<string | null>(product?.cover_image_url ?? null)
    const [saving, setSaving] = React.useState(false)

    // Sizing travels with the category now rather than being a hardcoded
    // `category === "apparel"`, which no custom category could ever satisfy.
    const sized = categories.find((c) => c.name === category)?.is_sized ?? false

    function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file (PNG/JPG/WebP)")
            return
        }
        setImageFile(file)
        setPreview(URL.createObjectURL(file))
    }

    /** Variant rows to write, derived from whichever pricing UI is active. */
    /** Blank stock box means untracked; the column is nullable for exactly that. */
    const parseStock = (raw: string): number | null => {
        const trimmed = raw.trim()
        return trimmed === "" ? null : Number(trimmed)
    }

    function buildVariants(): {
        price: number
        is_in_stock: boolean
        size: string | null
        stock_quantity: number | null
    }[] {
        if (sized) {
            return SIZES.filter((s) => sizeRows[s].enabled).map((s) => ({
                price: Number(sizeRows[s].price),
                is_in_stock: sizeRows[s].inStock,
                stock_quantity: parseStock(sizeRows[s].stock),
                size: s,
            }))
        }
        return [{
            price: Number(price),
            is_in_stock: inStock,
            stock_quantity: parseStock(stock),
            size: null,
        }]
    }

    function validate(variants: ReturnType<typeof buildVariants>): string | null {
        if (!title.trim()) return "Title is required"
        if (!isEdit && !imageFile) return "A product image is required"
        if (!variants.length) return "Add at least one size"
        for (const v of variants) {
            // The DB enforces price > 0; fail here so the user gets a real message.
            if (!Number.isFinite(v.price) || v.price <= 0) {
                return v.size
                    ? `Enter a price greater than 0 for size ${v.size.toUpperCase()}`
                    : "Enter a price greater than 0"
            }
            // The DB CHECK rejects negatives; catch it here for a usable message.
            if (v.stock_quantity !== null &&
                (!Number.isInteger(v.stock_quantity) || v.stock_quantity < 0)) {
                return v.size
                    ? `Stock for size ${v.size.toUpperCase()} must be a whole number of units (or blank to not track)`
                    : "Stock must be a whole number of units, or blank to not track it"
            }
        }
        return null
    }

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault()
        const variants = buildVariants()
        const problem = validate(variants)
        if (problem) {
            toast.error(problem)
            return
        }

        setSaving(true)
        try {
            // 1. The product row. author/genre stay null — the CHECK constraint
            //    permits that only because product_type is 'merch'.
            let productId = product?.id
            if (isEdit) {
                const { error } = await supabase
                    .from("books")
                    .update({
                        title: title.trim(),
                        description: description.trim() || null,
                        merch_category: category,
                        status,
                    })
                    .eq("id", productId!)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from("books")
                    .insert({
                        title: title.trim(),
                        description: description.trim() || null,
                        product_type: "merch",
                        merch_category: category,
                        status,
                    })
                    .select("id")
                    .single()
                if (error) throw error
                productId = data.id
            }

            // 2. Image, using the same bucket and path convention as book covers.
            if (imageFile) {
                const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg"
                const path = `${productId}/cover.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from("book-covers")
                    .upload(path, imageFile, { contentType: imageFile.type, upsert: true })
                if (uploadError) throw uploadError

                const { data: pub } = supabase.storage.from("book-covers").getPublicUrl(path)
                const { error: urlError } = await supabase
                    .from("books")
                    .update({ cover_image_url: pub.publicUrl })
                    .eq("id", productId!)
                if (urlError) throw urlError
            }

            // 3. Variants. Replace wholesale — sizes can be added or withdrawn,
            //    and the unique index is on (book_id, format, size).
            if (isEdit) {
                const { error } = await supabase.from("book_variants").delete().eq("book_id", productId!)
                if (error) throw error
            }
            const { error: variantError } = await supabase.from("book_variants").insert(
                variants.map((v) => ({
                    book_id: productId,
                    format: "merch",
                    price: v.price,
                    is_in_stock: v.is_in_stock,
                    size: v.size,
                })),
            )
            if (variantError) throw variantError

            toast.success(isEdit ? "Product updated" : "Product created")
            router.push("/admin/products")
            router.refresh()
        } catch (error: unknown) {
            console.error("[ProductForm] save failed:", error)
            const message = error instanceof Error ? error.message : "Could not save the product"
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
            <Card className="space-y-5 p-6">
                <div className="space-y-2">
                    <Label htmlFor="title">Product name</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder='e.g. Sabrina Paige&apos;s Favorite Candle "Euculyp Spearmint"'
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as MerchCategory)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {selectable.map((c) => (
                                <option key={c.name} value={c.name}>
                                    {c.label}
                                    {c.is_active ? "" : " (hidden)"}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center justify-between gap-2">
                            {sized ? (
                                <p className="text-xs text-muted-foreground">
                                    Priced per size below.
                                </p>
                            ) : (
                                <span />
                            )}
                            <button
                                type="button"
                                onClick={() => setShowCategoryManager((v) => !v)}
                                className="text-xs text-primary underline-offset-2 hover:underline"
                            >
                                {showCategoryManager ? "Done" : "Add or edit categories"}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Only published products appear on the storefront.
                        </p>
                    </div>
                </div>

                {/* Opened from the link under the Category picker. Inline rather
                    than on its own page: you find out you need a new category
                    while filling this form in, not before. */}
                {showCategoryManager && (
                    <div className="mt-5 border-t border-border pt-5">
                        <MerchCategoryManager onChanged={loadCategories} />
                    </div>
                )}
            </Card>

            <Card className="space-y-4 p-6">
                <Label htmlFor="image">Product image</Label>
                <Input id="image" type="file" accept="image/*" onChange={onPickImage} />
                {preview && (
                    <div className="w-40 overflow-hidden rounded-lg border border-border">
                        <Image
                            src={preview}
                            alt="Product preview"
                            width={320}
                            height={320}
                            className="h-auto w-full object-cover"
                            unoptimized
                        />
                    </div>
                )}
            </Card>

            <Card className="space-y-4 p-6">
                <h2 className="font-semibold">Pricing &amp; stock</h2>

                {!sized ? (
                    <div className="grid gap-5 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (USD)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">Units in stock</Label>
                            <Input
                                id="stock"
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Leave blank to not track"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                            />
                        </div>
                        <label className="flex items-end gap-2 pb-2 text-sm">
                            <input
                                type="checkbox"
                                checked={inStock}
                                onChange={(e) => setInStock(e.target.checked)}
                            />
                            In stock
                        </label>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Tick each size you sell, then set its price.
                        </p>
                        {SIZES.map((size) => {
                            const row = sizeRows[size]
                            return (
                                <div key={size} className="flex items-center gap-3">
                                    <label className="flex w-24 items-center gap-2 text-sm font-bold uppercase">
                                        <input
                                            type="checkbox"
                                            checked={row.enabled}
                                            onChange={(e) =>
                                                setSizeRows((prev) => ({
                                                    ...prev,
                                                    [size]: { ...prev[size], enabled: e.target.checked },
                                                }))
                                            }
                                        />
                                        {size}
                                    </label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder="Price"
                                        className="max-w-32"
                                        disabled={!row.enabled}
                                        value={row.price}
                                        onChange={(e) =>
                                            setSizeRows((prev) => ({
                                                ...prev,
                                                [size]: { ...prev[size], price: e.target.value },
                                            }))
                                        }
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="Units"
                                        className="max-w-28"
                                        disabled={!row.enabled}
                                        value={row.stock}
                                        onChange={(e) =>
                                            setSizeRows((prev) => ({
                                                ...prev,
                                                [size]: { ...prev[size], stock: e.target.value },
                                            }))
                                        }
                                    />
                                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            disabled={!row.enabled}
                                            checked={row.inStock}
                                            onChange={(e) =>
                                                setSizeRows((prev) => ({
                                                    ...prev,
                                                    [size]: { ...prev[size], inStock: e.target.checked },
                                                }))
                                            }
                                        />
                                        In stock
                                    </label>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
