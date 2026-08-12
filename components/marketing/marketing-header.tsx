"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { kometzUrl } from "@/lib/hosts"

/**
 * Header for the marketing host.
 *
 * Deliberately does NOT use useAuth() or useCart(): the apex must never create
 * a Supabase session or a cart. Anything account- or commerce-shaped links out
 * to the app host as an absolute URL. Compare components/site-header.tsx, which
 * is the app-host header and does use both contexts.
 */

const NAV = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Komet Books", href: "/kometbooks" },
    { label: "Komet Book Club", href: "/komet-book-club" },
    { label: "Characters", href: "/characters" },
    { label: "More Funk", href: "/morefunk" },
    { label: "Contact", href: "/contact" },
]

export function MarketingHeader() {
    const [open, setOpen] = React.useState(false)
    const pathname = usePathname()

    React.useEffect(() => setOpen(false), [pathname])

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="font-bold tracking-tight text-orange-500">
                    Kane&apos;s Komet Bookstore
                </Link>

                <nav className="hidden items-center gap-6 lg:flex">
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-sm transition-colors hover:text-orange-500",
                                pathname === item.href ? "text-orange-500" : "text-muted-foreground",
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                    {/* The library is the app itself — always the app host. */}
                    <a
                        href={kometzUrl("/dashboard")}
                        className="text-sm text-muted-foreground transition-colors hover:text-orange-500"
                    >
                        Komet Book Library
                    </a>
                </nav>

                <div className="flex items-center gap-2">
                    <Button asChild className="hidden bg-orange-600 hover:bg-orange-700 sm:inline-flex">
                        <a href={kometzUrl("/book-club")}>Enter the Book Club</a>
                    </Button>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-label={open ? "Close menu" : "Open menu"}
                        aria-expanded={open}
                        className="p-2 lg:hidden"
                    >
                        {open ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
            </div>

            {open && (
                <nav className="border-t border-border bg-background lg:hidden">
                    <div className="container mx-auto flex flex-col px-4 py-2">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="py-3 text-sm text-muted-foreground hover:text-orange-500"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <a
                            href={kometzUrl("/dashboard")}
                            className="py-3 text-sm text-muted-foreground hover:text-orange-500"
                        >
                            Komet Book Library
                        </a>
                        <a
                            href={kometzUrl("/book-club")}
                            className="py-3 text-sm font-semibold text-orange-500"
                        >
                            Enter the Book Club
                        </a>
                    </div>
                </nav>
            )}
        </header>
    )
}
