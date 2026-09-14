import type { Metadata } from "next"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/nav/site-footer"
import { HomeSections } from "@/components/marketing/home-sections"

// Content is editable at runtime, so this cannot be baked in permanently at
// build time. Five minutes matches the other content-driven marketing pages;
// publishing revalidates explicitly rather than waiting for it.
export const revalidate = 300

/**
 * The application entry point.
 *
 * The single homepage. HomeSections holds the body; this file supplies the app
 * chrome around it.
 *
 * There used to be a second one: the apex rewrote "/" to /kanes-home so the
 * homepage could render in the marketing layout. The consolidation left one
 * host, so that route is gone and /kanes-home now 308s here (proxy.ts).
 *
 * The previous landing page lives on in git history; it was replaced when the
 * imported kanesbookstore.com homepage became the entry point.
 */
export const metadata: Metadata = {
    title: "Kane's Komet Bookstore — The Funkiest Bookstore in the Universe",
    description:
        "Kane's Komet Bookstore sells creative literature and art through Komet books and merch. Join the Komet Book Club for bundles, a membership tee, and 35% off as a Kane Dealer.",
}

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="flex-1">
                <HomeSections />
            </main>
            <SiteFooter mode="app" />
        </div>
    )
}
