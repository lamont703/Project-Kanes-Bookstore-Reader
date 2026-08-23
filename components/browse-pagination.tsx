"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PER_PAGE_OPTIONS, DEFAULT_PER_PAGE } from "@/lib/browse-options"

/**
 * Shared pagination control. Used by /browse and the admin merchandise list —
 * basePath decides which route the links rewrite.
 *
 * Page numbers to render, collapsing long runs to ellipses.
 *
 * 435 books at 10 a page is 44 pages, so every number will not fit. Always show
 * the first and last, plus a window around the current page.
 */
function pageWindow(current: number, total: number): (number | "gap")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages = new Set<number>([1, total, current, current - 1, current + 1])
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
    if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p))

    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const out: (number | "gap")[] = []
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("gap")
        out.push(p)
    })
    return out
}

export function BrowsePagination({
    page,
    totalPages,
    perPage,
    total,
    rangeStart,
    rangeEnd,
    basePath = "/browse",
    noun = "book",
}: {
    page: number
    totalPages: number
    perPage: number
    total: number
    rangeStart: number
    rangeEnd: number
    /** Route the page links point at. Defaults to /browse. */
    basePath?: string
    /** Singular noun for the "Showing 1–12 of 40 …" summary. */
    noun?: string
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    function go(updates: Record<string, string | null>) {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null) params.delete(k)
            else params.set(k, v)
        })
        startTransition(() => router.push(`${basePath}?${params.toString()}`, { scroll: false }))
    }

    return (
        <div className="mt-10 flex flex-col items-center gap-6 border-t border-border pt-8">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:self-stretch">
                <p className="text-sm text-muted-foreground">
                    {total === 0
                        ? `No ${noun}s`
                        : `Showing ${rangeStart}–${rangeEnd} of ${total} ${total === 1 ? noun : `${noun}s`}`}
                </p>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    {noun === "book" ? "Books" : "Items"} per page
                    <select
                        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={perPage}
                        disabled={isPending}
                        // Changing page size invalidates the current offset, so
                        // drop back to page 1 rather than landing past the end.
                        onChange={(e) =>
                            go({
                                perPage:
                                    Number(e.target.value) === DEFAULT_PER_PAGE ? null : e.target.value,
                                page: null,
                            })
                        }
                    >
                        {PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || isPending}
                        onClick={() => go({ page: page - 1 === 1 ? null : String(page - 1) })}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="size-4" />
                        <span className="hidden sm:inline">Prev</span>
                    </Button>

                    {pageWindow(page, totalPages).map((p, i) =>
                        p === "gap" ? (
                            <span key={`gap-${i}`} className="px-2 text-muted-foreground">
                                …
                            </span>
                        ) : (
                            <Button
                                key={p}
                                variant={p === page ? "default" : "outline"}
                                size="sm"
                                disabled={isPending}
                                aria-current={p === page ? "page" : undefined}
                                className={p === page ? "" : "bg-transparent"}
                                onClick={() => go({ page: p === 1 ? null : String(p) })}
                            >
                                {p}
                            </Button>
                        ),
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || isPending}
                        onClick={() => go({ page: String(page + 1) })}
                        aria-label="Next page"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="size-4" />
                    </Button>
                </nav>
            )}
        </div>
    )
}
