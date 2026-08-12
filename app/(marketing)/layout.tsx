import Link from "next/link"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { kometzUrl } from "@/lib/hosts"

/**
 * Layout for the marketing routes served from kanesbookstore.com.
 *
 * These pages are public and session-free by design — no auth or cart context
 * is mounted anywhere in this tree. See lib/hosts.ts for the host topology.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <MarketingHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border">
                <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <h2 className="font-bold text-orange-500">Get In Touch</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Mon – Sat 9:00am – 8:00pm</p>
                        <p className="text-sm text-muted-foreground">Sunday – CLOSED</p>
                        <p className="mt-2 text-sm text-muted-foreground">Atlanta, GA, USA</p>
                    </div>
                    <div>
                        <h2 className="font-bold text-orange-500">Explore</h2>
                        <ul className="mt-2 space-y-1 text-sm">
                            <li><Link href="/" className="text-muted-foreground hover:text-orange-500">Home</Link></li>
                            <li><Link href="/about" className="text-muted-foreground hover:text-orange-500">About</Link></li>
                            <li><Link href="/contact" className="text-muted-foreground hover:text-orange-500">Contact</Link></li>
                            <li><Link href="/privacy-policy" className="text-muted-foreground hover:text-orange-500">Privacy Policy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-bold text-orange-500">Read &amp; Shop</h2>
                        <ul className="mt-2 space-y-1 text-sm">
                            <li><a href={kometzUrl("/browse")} className="text-muted-foreground hover:text-orange-500">Browse the Store</a></li>
                            <li><a href={kometzUrl("/book-club")} className="text-muted-foreground hover:text-orange-500">Komet Book Club</a></li>
                            <li><a href={kometzUrl("/dashboard")} className="text-muted-foreground hover:text-orange-500">Komet Book Library</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
                    &ldquo;Have A Kane Day&rdquo; — © {new Date().getFullYear()} Kane&apos;s Komet Bookstore
                </div>
            </footer>
        </div>
    )
}
