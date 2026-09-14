"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { VIEW_AS_LABEL_COOKIE } from "@/lib/view-as/constants"
import type { ViewAsTarget } from "@/lib/view-as/types"

interface ViewAsContextType {
    /** The member currently being viewed, or null. */
    viewingAs: ViewAsTarget | null
    isViewingAs: boolean
    /** False until the cookie has been read, so nothing flashes the wrong identity. */
    isReady: boolean
    /** True while a start/stop request is in flight. */
    isSwitching: boolean
    startViewAs: (userId: string) => Promise<{ ok: boolean; error?: string }>
    stopViewAs: (destination?: string) => Promise<void>
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined)

/**
 * Reads the display-only companion cookie written by /api/admin/view-as.
 *
 * The httpOnly cookie beside it is the one every server decision is made from;
 * this half exists purely so the banner and the header can paint the borrowed
 * identity on the first client render instead of after a round trip. A tampered
 * value changes what the banner says and nothing else.
 */
function readLabelCookie(): ViewAsTarget | null {
    if (typeof document === "undefined") return null

    const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${VIEW_AS_LABEL_COOKIE}=`))
        ?.slice(VIEW_AS_LABEL_COOKIE.length + 1)

    if (!raw) return null

    try {
        const b64 = decodeURIComponent(raw).replace(/-/g, "+").replace(/_/g, "/")
        const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")
        const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0))
        return JSON.parse(new TextDecoder().decode(bytes)) as ViewAsTarget
    } catch {
        return null
    }
}

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
    const [viewingAs, setViewingAs] = useState<ViewAsTarget | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)

    useEffect(() => {
        setViewingAs(readLabelCookie())
        setIsReady(true)
    }, [])

    const startViewAs = useCallback(async (userId: string) => {
        setIsSwitching(true)
        try {
            const res = await fetch("/api/admin/view-as", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            })

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: null }))
                setIsSwitching(false)
                return { ok: false, error: error ?? "Could not start the view." }
            }

            // A hard navigation, not router.push: every Server Component payload
            // and client cache in memory was rendered for the admin, and the
            // point of the feature is to see the member's page rather than a
            // half-refreshed blend of the two.
            window.location.href = "/dashboard"
            return { ok: true }
        } catch {
            setIsSwitching(false)
            return { ok: false, error: "Network error. Please try again." }
        }
    }, [])

    const stopViewAs = useCallback(async (destination = "/admin/users") => {
        setIsSwitching(true)
        try {
            await fetch("/api/admin/view-as", { method: "DELETE" })
        } catch {
            // Fall through — the reload below re-reads the cookie either way, and
            // leaving the admin stuck inside the view is the worse failure.
        }
        window.location.href = destination
    }, [])

    return (
        <ViewAsContext.Provider
            value={{
                viewingAs,
                isViewingAs: !!viewingAs,
                isReady,
                isSwitching,
                startViewAs,
                stopViewAs,
            }}
        >
            {children}
        </ViewAsContext.Provider>
    )
}

export const useViewAs = () => {
    const context = useContext(ViewAsContext)
    if (context === undefined) {
        throw new Error("useViewAs must be used within a ViewAsProvider")
    }
    return context
}
