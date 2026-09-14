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
            {/* Columns are sized to their content and the group is centred, rather
                than three equal thirds of a fixed width. Equal thirds left the
                short third column ending well before the grid did, so the visible
                block sat left of centre even though the grid itself was centred.
                Straight from stacked to three across — an intermediate two-column
                step always orphans the third block. */}
            <div className="mx-auto flex w-fit max-w-6xl flex-col gap-10 px-4 py-12 text-center md:flex-row md:justify-center md:gap-x-24 md:text-left">
                <div>
                    <h2 className="font-display text-xl tracking-wider text-secondary">GET IN TOUCH</h2>
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

            <div className="border-t border-border">
                <div className="container mx-auto max-w-6xl px-4 py-6 text-center">
                    <p className="font-display text-lg tracking-wider text-secondary">
                        &ldquo;HAVE A KANE DAY&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Kane&apos;s Komet Bookstore
                    </p>
                </div>
            </div>
        </footer>
    )
}
