"use client"

import * as React from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2, RotateCcw, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

/**
 * Arrange the book club's free picks.
 *
 * The Free Books section is not page content — it is a live query for every
 * published book flagged eligible for the book club. So the page editor could
 * change its heading and intro and nothing else: which books appeared, and in
 * what order, was not reachable from here at all.
 *
 * Order is written to books.display_order, the same column the More Funk product
 * lists use (migration 20260913000000, comment widened in 20260914000000). The
 * two never collide — merch rows and book rows are different product_types.
 *
 * Membership is deliberately NOT editable here. A book becomes a free pick
 * through the eligibility switch on its own edit page, and duplicating that
 * control would give two places to set one fact. This links to the filtered
 * catalogue instead.
 */

interface EligibleBook {
    id: string
    title: string
    author: string | null
    cover_image_url: string | null
    display_order: number | null
}

function SortablePick({
    book,
    position,
    shown,
    disabled,
}: {
    book: EligibleBook
    position: number
    shown: boolean
    disabled: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: book.id,
        disabled,
    })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                shown ? "border-border bg-background/40" : "border-dashed border-border/60 bg-muted/10"
            } ${isDragging ? "relative z-10 opacity-90" : ""}`}
        >
            <button
                type="button"
                className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Drag ${book.title} to reorder`}
                disabled={disabled}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>

            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{position}</span>

            <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border bg-muted">
                {book.cover_image_url && (
                    // Not next/image: covers are admin-supplied URLs on any host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_image_url} alt="" className="size-full object-cover" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${shown ? "" : "text-muted-foreground"}`}>{book.title}</p>
                {book.author && (
                    <p className="truncate text-xs text-muted-foreground">By {book.author}</p>
                )}
            </div>

            {!shown && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    <EyeOff className="size-3" /> Not shown
                </span>
            )}
        </div>
    )
}

export function BookClubFreePicks({
    displayCount,
    onChanged,
}: {
    /**
     * How many the page shows, from the section's displayCount setting. Drawn as
     * a cut-off line so the order can be arranged against what members see.
     * Undefined while the setting is unset, which the page reads as 5.
     */
    displayCount?: number
    onChanged?: () => void
}) {
    const supabase = React.useMemo(() => createClient(), [])
    const [books, setBooks] = React.useState<EligibleBook[]>([])
    const [loading, setLoading] = React.useState(true)
    const [busy, setBusy] = React.useState(false)

    const limit = Number.isInteger(displayCount) && (displayCount as number) > 0 ? (displayCount as number) : 5

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

    const load = React.useCallback(async () => {
        // The same filter and ordering the book club page uses, so this list is
        // what the page renders and not an approximation of it.
        const { data, error } = await supabase
            .from("books")
            .select("id, title, author, cover_image_url, display_order")
            .eq("is_book_club_eligible", true)
            .eq("status", "published")
            .eq("product_type", "book")
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("title", { ascending: true })

        if (error) {
            toast.error(`Could not load the free picks: ${error.message}`)
            setLoading(false)
            return
        }
        setBooks((data ?? []) as EligibleBook[])
        setLoading(false)
    }, [supabase])

    React.useEffect(() => {
        load()
    }, [load])

    /**
     * Write positions 1..n across the whole list.
     *
     * Not just the two that swapped: until this list is arranged every row is
     * NULL, so a partial write would leave the rest sorting after the arranged
     * pair by title, which is not what the drag looked like.
     */
    async function persist(ordered: EligibleBook[]) {
        setBusy(true)
        const results = await Promise.all(
            ordered.map(async (book, i) => {
                if (book.display_order === i + 1) return null
                const { error } = await supabase
                    .from("books")
                    .update({ display_order: i + 1 })
                    .eq("id", book.id)
                return error
            }),
        )
        setBusy(false)

        const failed = results.find((error) => error !== null)
        if (failed) {
            toast.error(`Could not save the order: ${failed.message}`)
            load() // the optimistic order is now a lie
            return
        }
        onChanged?.()
    }

    function onDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const from = books.findIndex((b) => b.id === active.id)
        const to = books.findIndex((b) => b.id === over.id)
        if (from < 0 || to < 0) return

        const next = arrayMove(books, from, to)
        // Optimistic, so the row does not spring back while the writes land.
        setBooks(next.map((b, i) => ({ ...b, display_order: i + 1 })))
        persist(next)
    }

    /** Back to alphabetical: clearing the column is what "unarranged" means. */
    async function resetOrder() {
        setBusy(true)
        const { error } = await supabase
            .from("books")
            .update({ display_order: null })
            .in("id", books.map((b) => b.id))
        setBusy(false)
        if (error) return toast.error(`Could not reset: ${error.message}`)
        toast.success("Back to alphabetical order")
        await load()
        onChanged?.()
    }

    const arranged = books.some((b) => b.display_order !== null)
    const hiddenCount = Math.max(0, books.length - limit)

    return (
        <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">Free book picks</h3>
                {arranged && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 px-2 text-[10px]"
                        disabled={busy}
                        onClick={resetOrder}
                        title="Clear the manual order"
                    >
                        <RotateCcw className="mr-1 size-3" /> A–Z
                    </Button>
                )}
            </div>

            <p className="mb-1 mt-1 text-xs text-muted-foreground">
                Drag to set the order members see in the Free Books section. A book joins this list
                through the “eligible for the book club” switch on its own edit page — add or remove
                one from the{" "}
                <a href="/admin/books" className="text-secondary underline-offset-4 hover:underline">
                    catalogue
                </a>
                .
            </p>
            <p className="mb-4 text-xs text-yellow-500">
                The order is stored on the books, not in this page&apos;s draft — it goes live
                straight away, without Publish. How many are shown is the Display Count setting
                above, which does wait for Publish.
            </p>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : books.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No published book is marked eligible for the book club yet, so the Free Books
                    section renders nothing.
                </p>
            ) : (
                <DndContext
                    // Explicit and stable: dnd-kit otherwise derives its aria ids
                    // from a counter that advances differently on server and
                    // client, and React reports a hydration mismatch.
                    id="book-club-free-picks"
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={onDragEnd}
                >
                    <SortableContext items={books.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1.5">
                            {books.map((book, i) => (
                                <React.Fragment key={book.id}>
                                    {/* The cut-off, drawn between rows rather than
                                        stated in prose: the point is seeing which
                                        titles fall the wrong side of it. */}
                                    {i === limit && (
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-px flex-1 bg-border" />
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                Below is not shown on the page
                                            </span>
                                            <div className="h-px flex-1 bg-border" />
                                        </div>
                                    )}
                                    <SortablePick
                                        book={book}
                                        position={i + 1}
                                        shown={i < limit}
                                        disabled={busy}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {!loading && hiddenCount > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                    {books.length} eligible, {limit} shown. Raise Display Count above to show{" "}
                    {hiddenCount === 1 ? "the other one" : `all ${books.length}`}.
                </p>
            )}

            {busy && (
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Saving order…
                </p>
            )}
        </Card>
    )
}
