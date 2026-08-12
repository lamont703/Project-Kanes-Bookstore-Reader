import Link from "next/link"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { FOOTER_NAV, resolveNavItem } from "@/lib/navigation"

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

            <footer className="border-t border-border">
                <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <h2 className="font-display text-xl tracking-wider text-primary">GET IN TOUCH</h2>
                        <p className="mt-3 text-sm text-muted-foreground">Mon – Sat 9:00am – 8:00pm</p>
                        <p className="text-sm text-muted-foreground">Sunday – CLOSED</p>
                        <p className="mt-2 text-sm text-muted-foreground">Atlanta, GA, USA</p>
                    </div>
                    <div>
                        <h2 className="font-display text-xl tracking-wider text-secondary">EXPLORE</h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {FOOTER_NAV.explore.map((item) => {
                                const link = resolveNavItem(item, "marketing")
                                return (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-muted-foreground transition-colors hover:text-primary">
                                            {link.label}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-display text-xl tracking-wider text-secondary">READ &amp; SHOP</h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {FOOTER_NAV.shop.map((item) => {
                                const link = resolveNavItem(item, "marketing")
                                return (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a href={link.href} className="text-muted-foreground transition-colors hover:text-primary">
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link href={link.href} className="text-muted-foreground transition-colors hover:text-primary">
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border py-6 text-center">
                    <p className="font-display text-lg tracking-wider text-secondary">
                        &ldquo;HAVE A KANE DAY&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Kane&apos;s Komet Bookstore
                    </p>
                </div>
            </footer>
        </div>
    )
}
