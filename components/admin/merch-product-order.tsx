"use client"

import * as React from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

/**
 * Arrange the products inside each More Funk section.
 *
 * The shop groups merchandise into one section per category and, before
 * books.display_order existed (migration 20260913000000), ordered each section
 * alphabetically by title — so renaming a product was the only way to move it.
 * These lists write that column.
 *
 * Dragging is confined to a category because a category IS a section on the
 * page; moving a product between them would be recategorising it, which is the
 * product form's job and would quietly change what the product is. Each list is
 * therefore its own DndContext.
 *
 * This writes rows rather than the page document, so it is not part of the draft
 * and takes effect on the live page immediately. The categories that define the
 * sections are managed on the product form, not here.
 */

interface ProductRow {
    id: string
    title: string
    status: string
    cover_image_url: string | null
    merch_category: string | null
    display_order: number | null
}

interface CategoryRow {
    name: string
    label: string
    sort_order: number
    is_active: boolean
}

/** Matches the key /morefunk groups an uncategorised product under. */
const UNCATEGORISED = "other"

function SortableProduct({ product, disabled }: { product: ProductRow; disabled: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: product.id,
        disabled,
    })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2 py-1.5 ${
                isDragging ? "relative z-10 opacity-90" : ""
            }`}
        >
            <button
                type="button"
                className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Drag ${product.title} to reorder`}
                disabled={disabled}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>

            <div className="size-9 shrink-0 overflow-hidden rounded border border-border bg-muted">
                {product.cover_image_url && (
                    // Not next/image: these are admin-supplied URLs on any host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.cover_image_url} alt="" className="size-full object-cover" />
                )}
            </div>

            <span className="min-w-0 flex-1 truncate text-sm">{product.title}</span>

            {product.status !== "published" && (
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {product.status}
                </span>
            )}
        </div>
    )
}

export function MerchProductOrder({ onChanged }: { onChanged?: () => void }) {
    const supabase = React.useMemo(() => createClient(), [])
    const [categories, setCategories] = React.useState<CategoryRow[]>([])
    const [groups, setGroups] = React.useState<Record<string, ProductRow[]>>({})
    const [loading, setLoading] = React.useState(true)
    const [busy, setBusy] = React.useState<string | null>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

    const load = React.useCallback(async () => {
        const [{ data: cats }, { data: products, error }] = await Promise.all([
            supabase
                .from("merch_categories")
                .select("name, label, sort_order, is_active")
                .order("sort_order")
                .order("label"),
            supabase
                .from("books")
                .select("id, title, status, cover_image_url, merch_category, display_order")
                .eq("product_type", "merch")
                .is("deleted_at", null)
                // The same ordering the page uses, so these lists open showing
                // exactly what the preview shows.
                .order("display_order", { ascending: true, nullsFirst: false })
                .order("title", { ascending: true }),
        ])

        if (error) {
            toast.error(`Could not load products: ${error.message}`)
            setLoading(false)
            return
        }

        const grouped: Record<string, ProductRow[]> = {}
        for (const p of (products ?? []) as ProductRow[]) {
            const key = p.merch_category ?? UNCATEGORISED
            ;(grouped[key] ??= []).push(p)
        }
        setCategories((cats ?? []) as CategoryRow[])
        setGroups(grouped)
        setLoading(false)
    }, [supabase])

    React.useEffect(() => {
        load()
    }, [load])

    /**
     * Write positions 1..n across the whole category.
     *
     * Not just the two products that swapped: until a category is arranged every
     * product in it is NULL, so a partial write would leave the rest sorting
     * after the arranged pair by title, which is not what the drag looked like.
     */
    async function persist(key: string, ordered: ProductRow[]) {
        setBusy(key)
        const results = await Promise.all(
            ordered.map(async (product, i) => {
                if (product.display_order === i + 1) return null
                const { error } = await supabase
                    .from("books")
                    .update({ display_order: i + 1 })
                    .eq("id", product.id)
                return error
            }),
        )
        setBusy(null)

        const failed = results.find((error) => error !== null)
        if (failed) {
            toast.error(`Could not save the order: ${failed.message}`)
            load() // the optimistic order is now a lie
            return
        }
        onChanged?.()
    }

    function onDragEnd(key: string, event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const list = groups[key] ?? []
        const from = list.findIndex((p) => p.id === active.id)
        const to = list.findIndex((p) => p.id === over.id)
        if (from < 0 || to < 0) return

        const next = arrayMove(list, from, to)
        // Optimistic, so the row does not spring back while the writes land.
        setGroups((g) => ({ ...g, [key]: next.map((p, i) => ({ ...p, display_order: i + 1 })) }))
        persist(key, next)
    }

    /** Back to alphabetical: clearing the column is what "unarranged" means. */
    async function resetOrder(key: string) {
        const list = groups[key] ?? []
        setBusy(key)
        const { error } = await supabase
            .from("books")
            .update({ display_order: null })
            .in("id", list.map((p) => p.id))
        setBusy(null)
        if (error) return toast.error(`Could not reset: ${error.message}`)
        toast.success("Back to alphabetical order")
        await load()
        onChanged?.()
    }

    // Every key that has products, in the order the page lays the sections out:
    // known categories by their sort_order, then anything filed under a category
    // that no longer exists.
    const known = new Map(categories.map((c) => [c.name, c]))
    const keys = Object.keys(groups).sort((a, b) => {
        const oa = known.get(a)?.sort_order ?? Number.MAX_SAFE_INTEGER
        const ob = known.get(b)?.sort_order ?? Number.MAX_SAFE_INTEGER
        return oa - ob || a.localeCompare(b)
    })

    return (
        <Card className="p-4">
            <h3 className="font-semibold">Product order</h3>
            <p className="mb-1 mt-1 text-xs text-muted-foreground">
                Drag a product to move it within its section on the More Funk page. Products stay in
                their own section — to move one elsewhere, change its category on the product itself.
                Anything never arranged sits at the end of its section, alphabetically.
            </p>
            <p className="mb-4 text-xs text-yellow-500">
                Stored on the products themselves, not in this page&apos;s draft — the order goes
                live straight away, without Publish. Sections and their names come from the
                categories, set under Merchandise on the product form.
            </p>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No merchandise yet. Products added under Merchandise appear here.
                </p>
            ) : (
                <div className="space-y-5">
                    {keys.map((key) => {
                        const category = known.get(key)
                        const list = groups[key] ?? []
                        const arranged = list.some((p) => p.display_order !== null)
                        return (
                            <div key={key}>
                                <div className="mb-2 flex items-center gap-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                                        {category?.label ?? key}
                                    </h4>
                                    {category?.is_active === false && (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                            Hidden from the page
                                        </span>
                                    )}
                                    {!category && (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                            No category
                                        </span>
                                    )}
                                    {busy === key && (
                                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                                    )}
                                    {arranged && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="ml-auto h-6 px-2 text-[10px]"
                                            disabled={busy !== null}
                                            onClick={() => resetOrder(key)}
                                            title="Clear the manual order for this section"
                                        >
                                            <RotateCcw className="mr-1 size-3" /> A–Z
                                        </Button>
                                    )}
                                </div>

                                <DndContext
                                    // Explicit and stable: dnd-kit otherwise derives
                                    // its aria ids from a counter that advances
                                    // differently on server and client, and React
                                    // reports a hydration mismatch it cannot patch up.
                                    id={`merch-order-${key}`}
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    modifiers={[restrictToVerticalAxis]}
                                    onDragEnd={(e) => onDragEnd(key, e)}
                                >
                                    <SortableContext
                                        items={list.map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-1.5">
                                            {list.map((product) => (
                                                <SortableProduct
                                                    key={product.id}
                                                    product={product}
                                                    disabled={busy !== null}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}
