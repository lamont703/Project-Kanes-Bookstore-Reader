import { MarketingHeader } from "@/components/marketing/marketing-header"
import { SiteFooter } from "@/components/nav/site-footer"

/**
 * Layout for the marketing routes served from kanesbookstore.com.
 *
 * These pages are public and session-free by design — no auth or cart context
 * is mounted anywhere in this tree. See lib/hosts.ts for the host topology.
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
