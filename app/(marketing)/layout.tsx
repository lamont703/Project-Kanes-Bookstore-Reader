import { MarketingHeader } from "@/components/marketing/marketing-header"
import { SiteFooter } from "@/components/nav/site-footer"

/**
 * Layout for the marketing routes.
 *
 * These pages are public, but NOT session-free: the providers are mounted in
 * the root layout, and MarketingHeader reads the real session and cart. It once
 * was session-free, when these routes only ever rendered on an apex that had no
 * cookies. They now render on the one host a signed-in member browses, so the
 * header has to know who is looking at it. See lib/hosts.ts.
 * Visual language follows app/globals.css: font-display headings in
 * tracking-wider uppercase, primary (red) and secondary (yellow) accents.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <MarketingHeader />
            <main className="flex-1">{children}</main>

            <SiteFooter mode="marketing" />
        </div>
    )
}
