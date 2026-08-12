"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { kometzUrl } from "@/lib/hosts"
import {
    PRIMARY_NAV,
    resolveNavItem,
    visibleAccountNav,
    type NavMode,
    type ResolvedLink,
    type Viewer,
} from "@/lib/navigation"

/**
 * The site navigation, shared by both hosts.
 *
 * Presentational on purpose: it takes the viewer and cart state as props rather
 * than calling useAuth/useCart itself. That is what lets the marketing host
 * mount the same menu without ever touching a Supabase session — the apex is
 * session-free by design, so it passes a signed-out viewer and no cart handler.
 *
 * Wrappers: components/site-header.tsx (app host, wires the real contexts) and
 * components/marketing/marketing-header.tsx (apex, static).
 */

const LOGO = "/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"

export interface SiteNavProps {
    mode: NavMode
    viewer: Viewer
    /** Live cart count. Undefined on the apex, which cannot read the app's cart. */
    cartCount?: number
    /** Provided only by the app host, where signing out is possible. */
    onSignOut?: () => void
    /** Bounce the cart badge when an item is added (app host only). */
    cartBounce?: boolean
}

function NavAnchor({
    link,
    className,
    onClick,
}: {
    link: ResolvedLink
    className?: string
    onClick?: () => void
}) {
    if (link.external) {
        return (
            <a href={link.href} className={className} onClick={onClick}>
                {link.label}
            </a>
        )
    }
    return (
        <Link href={link.href} className={className} onClick={onClick}>
            {link.label}
        </Link>
    )
}

export function SiteNav({ mode, viewer, cartCount, onSignOut, cartBounce }: SiteNavProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const pathname = usePathname()

    React.useEffect(() => setIsMenuOpen(false), [pathname])

    const primary = PRIMARY_NAV.map((item) => resolveNavItem(item, mode))
    const account = visibleAccountNav(mode, viewer).map((item) => resolveNavItem(item, mode))

    // The apex has no session, so it links to sign-in rather than offering to
    // sign out. Home is the logo, and resolves per host.
    const homeHref = mode === "marketing" ? "/" : "/"
    const cartHref = mode === "marketing" ? kometzUrl("/cart") : "/cart"
    const signInHref = mode === "marketing" ? kometzUrl("/login") : "/login"

    const linkClass = (href: string) =>
        cn(
            "whitespace-nowrap text-sm font-medium transition-colors hover:text-primary",
            pathname === href ? "text-primary" : "text-muted-foreground",
        )

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full border-b border-border/40 transition-all",
                isMenuOpen
                    ? "bg-background"
                    : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            )}
        >
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href={homeHref} className="flex items-center gap-2">
                        <Image
                            src={LOGO}
                            alt="Kane's Komets Logo"
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-lg object-contain"
                        />
                        <span className="font-display text-2xl tracking-wider text-primary">
                            KANE&apos;S KOMETS
                        </span>
                    </Link>

                    <nav className="hidden flex-1 items-center justify-center gap-6 px-8 md:flex">
                        {primary.map((link) => (
                            <NavAnchor key={link.label} link={link} className={linkClass(link.href)} />
                        ))}
                        {account.map((link) => (
                            <NavAnchor key={link.label} link={link} className={linkClass(link.href)} />
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link href={cartHref} className="group relative" aria-label="Cart">
                            <div
                                className={cn(
                                    "relative text-muted-foreground transition-colors group-hover:text-primary",
                                    cartBounce && "animate-cart-bounce",
                                )}
                            >
                                <ShoppingCart className="h-5 w-5" />
                                {typeof cartCount === "number" && cartCount > 0 && (
                                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                        </Link>

                        {viewer.isLoggedIn && onSignOut ? (
                            <Button variant="outline" size="sm" onClick={onSignOut}>
                                Sign Out
                            </Button>
                        ) : mode === "marketing" ? (
                            <>
                                {/* The apex cannot sign anyone in itself, but it must
                                    still offer the affordance — otherwise a returning
                                    member landing here has no way back in. */}
                                <a
                                    href={signInHref}
                                    className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline"
                                >
                                    Sign In
                                </a>
                                <Button asChild size="sm" className="hidden sm:inline-flex">
                                    <a href={kometzUrl("/book-club")}>Join The Club</a>
                                </Button>
                            </>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <Link href={signInHref}>Sign In</Link>
                            </Button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((v) => !v)}
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMenuOpen}
                            className="p-1 md:hidden"
                        >
                            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {isMenuOpen && (
                <div className="border-t border-border md:hidden">
                    <nav className="container mx-auto grid gap-4 px-4 py-4">
                        {primary.map((link) => (
                            <NavAnchor
                                key={link.label}
                                link={link}
                                className={linkClass(link.href)}
                                onClick={() => setIsMenuOpen(false)}
                            />
                        ))}
                        <div className="grid gap-4 border-t border-border pt-4">
                            {account.map((link) => (
                                <NavAnchor
                                    key={link.label}
                                    link={link}
                                    className={linkClass(link.href)}
                                    onClick={() => setIsMenuOpen(false)}
                                />
                            ))}
                            {mode === "marketing" && (
                                <a
                                    href={kometzUrl("/login")}
                                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                                >
                                    Sign In
                                </a>
                            )}
                            {mode === "marketing" ? (
                                <Button asChild>
                                    <a href={kometzUrl("/book-club")}>Join The Club</a>
                                </Button>
                            ) : viewer.isLoggedIn && onSignOut ? (
                                <Button variant="outline" onClick={onSignOut}>
                                    Sign Out
                                </Button>
                            ) : (
                                <Button asChild variant="outline">
                                    <Link href="/login">Sign In</Link>
                                </Button>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
