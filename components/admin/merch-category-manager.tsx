"use client"

import * as React from "react"
import { Plus, Trash2, Loader2, Eye, EyeOff, Shirt } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { slugifyCategory, type MerchCategoryRow } from "@/lib/merch-categories"

/**
 * Manage the merchandise categories used by the product form and the shop.
 *
 * The sibling of components/admin/genre-manager.tsx, which does the same job for
 * books. Categories are rows rather than a Postgres enum (migration
 * 20260827000000), which is what allows this to exist at all — adding one used
 * to require ALTER TYPE.
 *
 * Deleting is offered but the database refuses it while products still carry the
 * category; that is surfaced rather than swallowed, and hiding is suggested
 * instead. Hiding removes a category from the pickers without invalidating the
 * products already filed under it.
 */
export function MerchCategoryManager({ onChanged }: { onChanged?: () => void }) {
    const supabase = React.useMemo(() => createClient(), [])
    const [rows, setRows] = React.useState<(MerchCategoryRow & { productCount: number })[]>([])
    const [loading, setLoading] = React.useState(true)
    const [busy, setBusy] = React.useState<string | null>(null)
    const [newLabel, setNewLabel] = React.useState("")
    const [newSized, setNewSized] = React.useState(false)

    const load = React.useCallback(async () => {
        const [{ data: cats, error }, { data: products }] = await Promise.all([
            supabase
                .from("merch_categories")
                .select("name, label, sort_order, is_active, is_sized")
                .order("sort_order")
                .order("label"),
            supabase
                .from("books")
                .select("merch_category")
                .eq("product_type", "merch")
                .not("merch_category", "is", null),
        ])
        if (error) {
            toast.error(`Could not load categories: ${error.message}`)
            setLoading(false)
            return
        }
        const counts = new Map<string, number>()
        for (const p of (products ?? []) as { merch_category: string }[]) {
            counts.set(p.merch_category, (counts.get(p.merch_category) ?? 0) + 1)
        }
        setRows((cats ?? []).map((c: any) => ({ ...c, productCount: counts.get(c.name) ?? 0 })))
        setLoading(false)
    }, [supabase])

    React.useEffect(() => {
        load()
    }, [load])

    const refresh = () => {
        load()
        onChanged?.()
    }

    async function add() {
        const label = newLabel.trim()
        if (!label) return

        // The admin types a display label; the stored key is a slug of it. The
        // four seeded categories keep their original keys ('candle'), so nothing
        // already on a product has to change.
        const name = slugifyCategory(label)
        if (!name) return toast.error("Give the category a name using letters or numbers")
        if (rows.some((r) => r.name === name)) return toast.error(`"${label}" already exists`)

        setBusy(name)
        const nextOrder = Math.max(0, ...rows.map((r) => r.sort_order)) + 1
        const { error } = await supabase
            .from("merch_categories")
            .insert({ name, label, sort_order: nextOrder, is_sized: newSized })
        setBusy(null)
        if (error) return toast.error(`Could not add: ${error.message}`)

        setNewLabel("")
        setNewSized(false)
        toast.success(`Added "${label}" — it is now selectable on any product`)
        refresh()
    }

    async function patch(row: MerchCategoryRow, changes: Partial<MerchCategoryRow>) {
        setBusy(row.name)
        const { error } = await supabase
            .from("merch_categories")
            .update(changes)
            .eq("name", row.name)
        setBusy(null)
        if (error) return toast.error(`Could not update: ${error.message}`)
        refresh()
    }

    async function remove(row: MerchCategoryRow & { productCount: number }) {
        setBusy(row.name)
        const { error } = await supabase.from("merch_categories").delete().eq("name", row.name)
        setBusy(null)
        if (error) {
            // The foreign key is doing its job: products still reference this.
            toast.error(
                row.productCount > 0
                    ? `"${row.label}" is used by ${row.productCount} product${row.productCount === 1 ? "" : "s"}. Hide it instead of deleting.`
                    : `Could not delete: ${error.message}`,
            )
            return
        }
        toast.success(`Deleted "${row.label}"`)
        refresh()
    }

    return (
        <Card className="p-4">
            <h3 className="font-semibold">Merchandise categories</h3>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                These are the Category options here and the filters on the shop. Mark a category
                sized when its products are sold per size, like apparel. Hiding one keeps existing
                products valid but removes it from both.
            </p>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
                <div className="space-y-2">
                    {rows.map((row) => (
                        <div
                            key={row.name}
                            className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2"
                        >
                            <span
                                className={`flex-1 truncate text-sm ${row.is_active ? "" : "text-muted-foreground line-through"}`}
                            >
                                {row.label}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {row.productCount} item{row.productCount === 1 ? "" : "s"}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy === row.name}
                                onClick={() => patch(row, { is_sized: !row.is_sized })}
                                title={row.is_sized ? "Sold per size — click to make it one SKU" : "One SKU — click to sell per size"}
                            >
                                <Shirt
                                    className={`size-4 ${row.is_sized ? "text-primary" : "text-muted-foreground/40"}`}
                                />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy === row.name}
                                onClick={() => patch(row, { is_active: !row.is_active })}
                                title={row.is_active ? "Hide from the pickers" : "Show in the pickers"}
                            >
                                {row.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy === row.name}
                                onClick={() => remove(row)}
                                title={row.productCount > 0 ? "In use — hide it instead" : "Delete this category"}
                            >
                                {busy === row.name ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Trash2
                                        className={`size-4 ${row.productCount > 0 ? "text-muted-foreground/40" : "text-destructive"}`}
                                    />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="New category name…"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            add()
                        }
                    }}
                    className="min-w-[10rem] flex-1"
                />
                <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={newSized}
                        onChange={(e) => setNewSized(e.target.checked)}
                        className="size-3.5 accent-[var(--primary)]"
                    />
                    Sold per size
                </label>
                <Button type="button" onClick={add} disabled={!newLabel.trim() || busy !== null}>
                    <Plus className="mr-1 size-4" /> Add
                </Button>
            </div>
        </Card>
    )
}
