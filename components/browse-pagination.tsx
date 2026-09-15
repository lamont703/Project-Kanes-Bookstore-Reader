"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PER_PAGE_OPTIONS, DEFAULT_PER_PAGE } from "@/lib/browse-options"
import { pageWindow } from "@/lib/pagination"

/**
 * Shared pagination control. Used by /browse and the admin merchandise list —
 * basePath decides which route the links rewrite.
 */
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
        /**
         * Scroll to the top, which is Next's default — `scroll: false` used to
         * suppress it.
         *
         * Suppressing it meant clicking "Next" left the viewer exactly where
         * they were: at the bottom of the page, beside the pagination control,
         * looking at the end of a list they had not seen the start of. Every
         * page after the first began in the middle of nowhere.
         *
         * It applies to the per-page selector too, and should: changing the
         * page size restarts the list at page 1, so the top is where it begins.
         */
        startTransition(() => router.push(`${basePath}?${params.toString()}`))
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
