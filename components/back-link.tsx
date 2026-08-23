"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigationHistory } from "@/context/navigation-history"

/**
 * A back control that returns the viewer wherever they actually came from.
 *
 * Renders a real <Link> to `fallbackHref` rather than a bare button, so it still
 * works before hydration, survives middle-click and "open in new tab", and shows
 * a real destination on hover. When we can prove the previous entry belongs to
 * this site, the click is intercepted and handed to the browser's back stack
 * instead — which also restores the viewer's scroll position in the listing they
 * came from, something pushing a URL cannot do.
 *
 * Two independent signals, because neither covers every case:
 *
 *   - A same-origin document.referrer. Set on full page loads, which is how the
 *     marketing tiles link into product pages (they are plain anchors, since
 *     they may cross to the app host).
 *   - A previous in-app route from NavigationHistoryProvider. Client-side <Link>
 *     transitions never touch document.referrer, so without this a viewer who
 *     arrived by client navigation would be sent to the fallback instead of
 *     back.
 *
 * If neither holds — someone opened the product link directly, or followed it
 * from another site — going "back" would leave the site entirely, so the link is
 * left alone and the fallback is used.
 */
export function BackLink({
    fallbackHref,
    label = "Continue Shopping",
    className,
}: {
    /** Where to go when there is no in-app history to return to. */
    fallbackHref: string
    label?: string
    className?: string
}) {
    const router = useRouter()
    const { previous } = useNavigationHistory()
    const [refererIsOurs, setRefererIsOurs] = React.useState(false)

    React.useEffect(() => {
        // document is not available during render, and this cannot change for
        // the life of the document, so read it once on mount.
        try {
            setRefererIsOurs(
                !!document.referrer &&
                    new URL(document.referrer).origin === window.location.origin,
            )
        } catch {
            // A malformed referrer is not worth failing over.
            setRefererIsOurs(false)
        }
    }, [])

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        // Never hijack a modified click — the viewer is asking for a new tab or
        // window, and history.back() would ignore that intent.
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return
        }

        // history.length === 1 means this tab has nothing behind it, which
        // happens when a product is opened in a new tab: the referrer is set,
        // but back() would do nothing at all.
        const hasSomethingBehind = typeof window !== "undefined" && window.history.length > 1
        if (!hasSomethingBehind) return
        if (previous === null && !refererIsOurs) return

        event.preventDefault()
        router.back()
    }

    return (
        <Button variant="ghost" asChild className={cn("mb-6", className)}>
            <Link href={fallbackHref} onClick={handleClick}>
                <ArrowLeft className="mr-2 size-4" />
                {label}
            </Link>
        </Button>
    )
}
