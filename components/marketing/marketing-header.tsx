"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { kometzUrl } from "@/lib/hosts"

/**
 * Header for the marketing host.
 *
 * Mirrors components/site-header.tsx visually — same shell, same font-display
 * wordmark, same nav link treatment — so the two hosts read as one site. It
 * deliberately does NOT use useAuth() or useCart(): the apex must never create
 * a Supabase session or a cart. Anything account- or commerce-shaped links out
 * to the app host as an absolute URL.
 */

const LOGO = "/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"

const NAV = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Komet Books", href: "/kometbooks" },
    { label: "Book Club", href: "/komet-book-club" },
    { label: "Characters", href: "/characters" },
    { label: "More Funk", href: "/morefunk" },
    { label: "Contact", href: "/contact" },
]

export function MarketingHeader() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const pathname = usePathname()

    React.useEffect(() => setIsMenuOpen(false), [pathname])

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
                    <Link href="/" className="flex items-center gap-2">
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

                    <nav className="hidden flex-1 items-center justify-center gap-6 px-8 lg:flex">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "whitespace-nowrap text-sm font-medium transition-colors hover:text-primary",
                                    pathname === item.href ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {/* The library is the app itself — always the app host. */}
                        <a
                            href={kometzUrl("/dashboard")}
                            className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                            Library
                        </a>
                    </nav>

                    <div className="flex items-center gap-2">
                        <Button asChild className="hidden sm:inline-flex">
                            <a href={kometzUrl("/book-club")}>Join The Club</a>
                        </Button>
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((v) => !v)}
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMenuOpen}
                            className="p-2 lg:hidden"
                        >
                            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {isMenuOpen && (
                <div className="border-t border-border lg:hidden">
                    <nav className="container mx-auto grid gap-4 px-4 py-4">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    pathname === item.href ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-4 border-t border-border pt-4">
                            <a
                                href={kometzUrl("/dashboard")}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                Komet Book Library
                            </a>
                            <Button asChild>
                                <a href={kometzUrl("/book-club")}>Join The Club</a>
                            </Button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
