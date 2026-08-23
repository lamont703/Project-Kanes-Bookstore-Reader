"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Filter bar for the merchandise admin.
 *
 * State lives in the URL rather than component state, so a filtered view can be
 * bookmarked, shared, and survives the redirect back from editing a product.
 * That is the same approach /browse uses.
 *
 * Categories are passed in rather than hardcoded from the enum: the list shows
 * what actually exists with live counts, so it does not offer "Apparel (0)" for
 * a shop that sells only candles.
 */

const SORTS = [
    { value: "title", label: "Title A–Z" },
    { value: "title-desc", label: "Title Z–A" },
    { value: "newest", label: "Newest first" },
    { value: "price-high", label: "Price: high to low" },
    { value: "price-low", label: "Price: low to high" },
    { value: "stock-low", label: "Stock: lowest first" },
]

export interface CategoryOption {
    value: string
    label: string
    count: number
}

export function AdminProductFilters({
    categories,
    counts,
}: {
    categories: CategoryOption[]
    counts: { all: number; published: number; draft: number }
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const q = searchParams.get("q") ?? ""
    const category = searchParams.get("category") ?? "all"
    const status = searchParams.get("status") ?? "all"
    const sort = searchParams.get("sort") ?? "title"
    const isFiltered = q !== "" || category !== "all" || status !== "all" || sort !== "title"

    function update(changes: Record<string, string | null>) {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(changes).forEach(([k, v]) => {
            if (v === null || v === "" || v === "all") params.delete(k)
            else params.set(k, v)
        })
        // Any change to the result set invalidates the current offset.
        params.delete("page")
        startTransition(() =>
            router.push(`/admin/products${params.toString() ? `?${params}` : ""}`, { scroll: false }),
        )
    }

    const selectClass =
        "rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"

    return (
        <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search merchandise by name…"
                        defaultValue={q}
                        disabled={isPending}
                        className="pl-9"
                        // Search on Enter rather than per keystroke: each change is
                        // a server round trip, and a debounce here would fire one
                        // for every pause in typing.
                        onKeyDown={(e) => {
                            if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value.trim() })
                        }}
                        onBlur={(e) => {
                            if (e.target.value.trim() !== q) update({ q: e.target.value.trim() })
                        }}
                    />
                </div>

                <select
                    className={selectClass}
                    value={status}
                    disabled={isPending}
                    onChange={(e) => update({ status: e.target.value })}
                    aria-label="Filter by status"
                >
                    <option value="all">All statuses ({counts.all})</option>
                    <option value="published">Published ({counts.published})</option>
                    <option value="draft">Draft ({counts.draft})</option>
                </select>

                <select
                    className={selectClass}
                    value={sort}
                    disabled={isPending}
                    onChange={(e) => update({ sort: e.target.value })}
                    aria-label="Sort products"
                >
                    {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                {isFiltered && (
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                            startTransition(() => router.push("/admin/products", { scroll: false }))
                        }
                    >
                        <X className="mr-1 size-4" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Category pills. Hidden entirely when everything is one category —
                a single "Candles (10)" button next to "All (10)" is noise. */}
            {categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    <CategoryPill
                        label="All"
                        count={counts.all}
                        active={category === "all"}
                        disabled={isPending}
                        onClick={() => update({ category: "all" })}
                    />
                    {categories.map((c) => (
                        <CategoryPill
                            key={c.value}
                            label={c.label}
                            count={c.count}
                            active={category === c.value}
                            disabled={isPending}
                            onClick={() => update({ category: c.value })}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function CategoryPill({
    label,
    count,
    active,
    disabled,
    onClick,
}: {
    label: string
    count: number
    active: boolean
    disabled: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition-colors disabled:opacity-60 ${
                active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
        >
            {label} <span className="opacity-60">({count})</span>
        </button>
    )
}
