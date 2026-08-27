"use client"

import { useEffect } from "react"
import { Eye, X, Crown, Loader2, ShieldAlert } from "lucide-react"
import { useViewAs } from "@/context/view-as-context"

/**
 * The persistent "you are not yourself right now" bar, and the way out of it.
 *
 * Mounted globally rather than per layout so it is present on the reader and
 * every other route that renders no site header of its own.
 *
 * It is a sticky element at the very top of <body>, not a floating overlay: in
 * normal flow it reserves its own height, so nothing has to be padded out of the
 * way and it can never be scrolled past or covered. The one element it would
 * have fought with is the site header, which is also sticky at top:0 — the
 * `view-as-active` class on <body> offsets that header by the bar's height (see
 * app/globals.css) and adds a border around the viewport for good measure.
 */
export function ViewAsBanner() {
    const { viewingAs, isSwitching, stopViewAs } = useViewAs()
    const isActive = !!viewingAs

    useEffect(() => {
        if (!isActive) return
        document.body.classList.add("view-as-active")
        return () => document.body.classList.remove("view-as-active")
    }, [isActive])

    if (!viewingAs) return null

    return (
        <div className="sticky top-0 z-[200] w-full border-b-2 border-yellow-400/60 bg-yellow-400 text-black shadow-lg">
            <div className="flex h-11 items-center justify-between gap-3 px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Viewing As</span>
                    </span>

                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{viewingAs.name}</span>
                        {viewingAs.isPremium && (
                            <Crown className="h-3 w-3 shrink-0" aria-label="Premium member" />
                        )}
                        {viewingAs.isBanned && (
                            <span className="shrink-0 rounded bg-black/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                                Banned
                            </span>
                        )}
                        <span className="hidden truncate text-xs opacity-70 md:inline">
                            {viewingAs.email}
                        </span>
                    </span>

                    <span className="hidden shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-widest opacity-70 lg:flex">
                        <ShieldAlert className="h-3 w-3" />
                        Read-only
                    </span>
                </div>

                <button
                    onClick={() => stopViewAs()}
                    disabled={isSwitching}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-3 py-1.5 font-display text-xs tracking-widest text-yellow-400 transition-colors hover:bg-black/80 disabled:opacity-60"
                >
                    {isSwitching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <X className="h-3.5 w-3.5" />
                    )}
                    EXIT VIEW AS
                </button>
            </div>
        </div>
    )
}
