import Link from "next/link"
import { FOOTER_NAV, resolveNavItem, type NavMode } from "@/lib/navigation"

/**
 * Site footer, shared by both hosts.
 *
 * Driven by the same lib/navigation.ts config as the header, so the two can't
 * drift. Links resolve per host: relative when this host owns the destination,
 * absolute when it belongs to the other one.
 */
export function SiteFooter({ mode }: { mode: NavMode }) {
    const columns = [
        { title: "EXPLORE", items: FOOTER_NAV.explore },
        { title: "READ & SHOP", items: FOOTER_NAV.shop },
    ]

    return (
        <footer className="border-t border-border">
            <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <h2 className="font-display text-xl tracking-wider text-primary">GET IN TOUCH</h2>
                    <p className="mt-3 text-sm text-muted-foreground">Mon – Sat 9:00am – 8:00pm</p>
                    <p className="text-sm text-muted-foreground">Sunday – CLOSED</p>
                    <p className="mt-2 text-sm text-muted-foreground">Atlanta, GA, USA</p>
                </div>

                {columns.map((column) => (
                    <div key={column.title}>
                        <h2 className="font-display text-xl tracking-wider text-secondary">
                            {column.title}
                        </h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {column.items.map((item) => {
                                const link = resolveNavItem(item, mode)
                                const className =
                                    "text-muted-foreground transition-colors hover:text-primary"
                                return (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a href={link.href} className={className}>
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link href={link.href} className={className}>
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
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
    )
}
