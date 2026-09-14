"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

/**
 * Remembers the route the viewer was on before the current one.
 *
 * Needed because there is no built-in way to ask the App Router "where did this
 * person come from". document.referrer only answers it for full page loads — a
 * client-side <Link> transition leaves referrer pointing at whatever document
 * happened to load last, which can be several navigations stale. Tracking
 * pathname changes ourselves covers the client-side case; callers combine the
 * two signals (see components/back-link.tsx).
 *
 * Deliberately only a single step of history. Anything deeper would duplicate
 * what the browser's own back stack already does better, including scroll
 * restoration.
 */

interface NavigationHistory {
    /** The previous in-app route, or null if this is the first route this session. */
    previous: string | null
}

const NavigationHistoryContext = React.createContext<NavigationHistory>({ previous: null })

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [routes, setRoutes] = React.useState<{ previous: string | null; current: string | null }>({
        previous: null,
        current: null,
    })

    React.useEffect(() => {
        setRoutes((prev) => {
            // Ignore re-renders that are not an actual route change — a search
            // param change on the same page is not somewhere to go "back" to.
            if (prev.current === pathname) return prev
            return { previous: prev.current, current: pathname }
        })
    }, [pathname])

    const value = React.useMemo(() => ({ previous: routes.previous }), [routes.previous])

    return (
        <NavigationHistoryContext.Provider value={value}>
            {children}
        </NavigationHistoryContext.Provider>
    )
}

export function useNavigationHistory() {
    return React.useContext(NavigationHistoryContext)
}
