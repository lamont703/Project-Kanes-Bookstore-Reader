"use client"

import * as React from "react"
import { Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

/**
 * Manage the book categories used by the /browse filters and the upload form.
 *
 * Lives in the /browse editor because that is the page the categories appear on.
 * They are rows rather than a Postgres enum (migration 20260825000000), which is
 * what allows this to exist at all — adding one used to require ALTER TYPE.
 *
 * Deleting is offered but the database refuses it while books still carry the
 * category; that error is surfaced verbatim rather than swallowed, and hiding is
 * suggested instead. Hiding removes a category from the filters and the upload
 * form without invalidating the books already filed under it.
 */

interface Genre {
    name: string
    sort_order: number
    is_active: boolean
    bookCount: number
}

export function GenreManager() {
    const supabase = React.useMemo(() => createClient(), [])
    const [genres, setGenres] = React.useState<Genre[]>([])
    const [loading, setLoading] = React.useState(true)
    const [busy, setBusy] = React.useState<string | null>(null)
    const [newName, setNewName] = React.useState("")

    const load = React.useCallback(async () => {
        const [{ data: rows, error }, { data: books }] = await Promise.all([
            supabase.from("book_genres").select("name, sort_order, is_active").order("sort_order").order("name"),
            supabase.from("books").select("genre").not("genre", "is", null),
        ])
        if (error) {
            toast.error(`Could not load categories: ${error.message}`)
            setLoading(false)
            return
        }
        const counts = new Map<string, number>()
        for (const b of (books ?? []) as { genre: string }[]) {
            counts.set(b.genre, (counts.get(b.genre) ?? 0) + 1)
        }
        setGenres(
            (rows ?? []).map((r: any) => ({ ...r, bookCount: counts.get(r.name) ?? 0 })),
        )
        setLoading(false)
    }, [supabase])

    React.useEffect(() => {
        load()
    }, [load])

    async function add() {
        const name = newName.trim()
        if (!name) return
        if (genres.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
            return toast.error(`"${name}" already exists`)
        }
        setBusy(name)
        const nextOrder = Math.max(0, ...genres.map((g) => g.sort_order)) + 1
        const { error } = await supabase
            .from("book_genres")
            .insert({ name, sort_order: nextOrder })
        setBusy(null)
        if (error) return toast.error(`Could not add: ${error.message}`)
        setNewName("")
        toast.success(`Added "${name}" — it is now a filter on /browse and selectable when uploading a book`)
        load()
    }

    async function toggle(genre: Genre) {
        setBusy(genre.name)
        const { error } = await supabase
            .from("book_genres")
            .update({ is_active: !genre.is_active })
            .eq("name", genre.name)
        setBusy(null)
        if (error) return toast.error(`Could not update: ${error.message}`)
        load()
    }

    async function remove(genre: Genre) {
        setBusy(genre.name)
        const { error } = await supabase.from("book_genres").delete().eq("name", genre.name)
        setBusy(null)
        if (error) {
            // The foreign key is doing its job: books still reference this.
            toast.error(
                genre.bookCount > 0
                    ? `"${genre.name}" is used by ${genre.bookCount} book${genre.bookCount === 1 ? "" : "s"}. Hide it instead of deleting.`
                    : `Could not delete: ${error.message}`,
            )
            return
        }
        toast.success(`Deleted "${genre.name}"`)
        load()
    }

    return (
        <Card className="mb-4 p-4">
            <div className="mb-1 flex items-center gap-2">
                <h2 className="font-semibold">Book categories</h2>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    filters
                </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
                These are the filter buttons on /browse and the Category options when uploading a
                book. Hiding one keeps existing books valid but removes it from both.
            </p>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
                <div className="space-y-2">
                    {genres.map((genre) => (
                        <div
                            key={genre.name}
                            className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
                        >
                            <span className={`flex-1 text-sm ${genre.is_active ? "" : "text-muted-foreground line-through"}`}>
                                {genre.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {genre.bookCount} book{genre.bookCount === 1 ? "" : "s"}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy === genre.name}
                                onClick={() => toggle(genre)}
                                title={genre.is_active ? "Hide from filters" : "Show in filters"}
                            >
                                {genre.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy === genre.name}
                                onClick={() => remove(genre)}
                                title={
                                    genre.bookCount > 0
                                        ? "In use — hide it instead"
                                        : "Delete this category"
                                }
                            >
                                {busy === genre.name ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Trash2 className={`size-4 ${genre.bookCount > 0 ? "text-muted-foreground/40" : "text-destructive"}`} />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex gap-2">
                <Input
                    placeholder="New category name…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            add()
                        }
                    }}
                />
                <Button type="button" onClick={add} disabled={!newName.trim() || busy !== null}>
                    <Plus className="mr-1 size-4" /> Add
                </Button>
            </div>
        </Card>
    )
}
