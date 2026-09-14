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
 * Renders the same homepage the marketing host serves — HomeSections is shared
 * — but wrapped in the app chrome, so a signed-in member keeps their session,
 * cart and account menu instead of being shown a signed-out header.
 *
 * The apex reaches the identical body through a rewrite of "/" to /kanes-home
 * (see proxy.ts), which uses the session-free marketing layout. One homepage,
 * two sets of chrome, no host branching inside any component.
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
