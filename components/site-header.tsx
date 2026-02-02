"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, Rocket } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { ShoppingCart } from "lucide-react"
import { useCart } from "@/context/cart-context"

export function SiteHeader() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [isLoggedIn, setIsLoggedIn] = React.useState(false)
    const pathname = usePathname()
    const { cartCount } = useCart()

    // Check login status
    React.useEffect(() => {
        const checkLogin = () => {
            const active = localStorage.getItem("komet_subscription_active") === "true"
            setIsLoggedIn(active)
        }
        checkLogin()
        // Listen for storage events (optional, but good for multi-tab)
        window.addEventListener("storage", checkLogin)
        return () => window.removeEventListener("storage", checkLogin)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("komet_subscription_active")
        setIsLoggedIn(false)
        window.location.reload()
    }

    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    // Prevent scrolling when menu is open
    React.useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isMenuOpen])

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
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
                                alt="Kane's Komets Logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-lg object-contain"
                            />
                            <span className="font-display text-2xl tracking-wider text-primary">KANE'S KOMETS</span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link
                            href="/browse"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/browse" ? "text-primary" : "text-muted-foreground",
                            )}
                        >
                            Browse
                        </Link>
                        <Link
                            href="/book-club"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/book-club" ? "text-primary" : "text-muted-foreground",
                            )}
                        >
                            Book Club
                        </Link>
                        {isLoggedIn && (
                            <>
                                <Link
                                    href="/book-club/discussions"
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        pathname.startsWith("/book-club/discussions") ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    Discussions
                                </Link>
                                <Link
                                    href="/book-club/events"
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        pathname.startsWith("/book-club/events") ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    Events
                                </Link>
                            </>
                        )}
                        {isLoggedIn && (
                            <Link
                                href="/dashboard"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    pathname === "/dashboard" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                My Library
                            </Link>
                        )}
                        {isLoggedIn && (
                            <Link
                                href="/admin"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    pathname === "/admin" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                Admin
                            </Link>
                        )}

                        {/* Cart Icon */}
                        <Link href="/cart" className="relative group">
                            <Button variant="ghost" size="icon" className="relative">
                                <ShoppingCart className="h-5 w-5" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                                        {cartCount}
                                    </span>
                                )}
                            </Button>
                        </Link>

                        {isLoggedIn ? (
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                Sign Out
                            </Button>
                        ) : (
                            <Button variant="default" size="sm" asChild className="animate-pulse-glow">
                                <Link href="/login">
                                    <Rocket className="mr-2 h-4 w-4" />
                                    Sign In
                                </Link>
                            </Button>
                        )}
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 top-16 z-50 bg-background md:hidden animate-in slide-in-from-top-5 fade-in-0">
                    <div className="grid gap-6 p-6">
                        <nav className="grid gap-4">
                            <Link
                                href="/"
                                className={cn(
                                    "text-lg font-medium transition-colors hover:text-primary",
                                    pathname === "/" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                Home
                            </Link>
                            <Link
                                href="/browse"
                                className={cn(
                                    "text-lg font-medium transition-colors hover:text-primary",
                                    pathname === "/browse" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                Browse Books
                            </Link>
                            <Link
                                href="/book-club"
                                className={cn(
                                    "text-lg font-medium transition-colors hover:text-primary",
                                    pathname === "/book-club" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                Book Club
                            </Link>
                            {isLoggedIn && (
                                <>
                                    <Link
                                        href="/book-club/discussions"
                                        className={cn(
                                            "text-lg font-medium transition-colors hover:text-primary",
                                            pathname.startsWith("/book-club/discussions") ? "text-primary" : "text-muted-foreground",
                                        )}
                                    >
                                        Discussions
                                    </Link>
                                    <Link
                                        href="/book-club/events"
                                        className={cn(
                                            "text-lg font-medium transition-colors hover:text-primary",
                                            pathname.startsWith("/book-club/events") ? "text-primary" : "text-muted-foreground",
                                        )}
                                    >
                                        Events
                                    </Link>
                                </>
                            )}
                            {isLoggedIn && (
                                <Link
                                    href="/dashboard"
                                    className={cn(
                                        "text-lg font-medium transition-colors hover:text-primary",
                                        pathname === "/dashboard" ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    My Library
                                </Link>
                            )}
                            <Link
                                href="/cart"
                                className={cn(
                                    "text-lg font-medium transition-colors hover:text-primary flex items-center justify-between",
                                    pathname === "/cart" ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                Cart
                                {cartCount > 0 && (
                                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                        {cartCount} items
                                    </span>
                                )}
                            </Link>
                            {isLoggedIn && (
                                <Link
                                    href="/admin"
                                    className={cn(
                                        "text-lg font-medium transition-colors hover:text-primary",
                                        pathname === "/admin" ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    Admin Dashboard
                                </Link>
                            )}
                        </nav>
                        <div className="flex flex-col gap-4 pt-4 border-t border-border">
                            {isLoggedIn ? (
                                <Button size="lg" className="w-full" onClick={handleLogout}>
                                    Sign Out
                                </Button>
                            ) : (
                                <Button size="lg" className="w-full" asChild>
                                    <Link href="/login">
                                        <Rocket className="mr-2 h-4 w-4" />
                                        Sign In
                                    </Link>
                                </Button>
                            )}
                            {!isLoggedIn && (
                                <Button variant="outline" size="lg" className="w-full" asChild>
                                    <Link href="/book-club">View Plans</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
