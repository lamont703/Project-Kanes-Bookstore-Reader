"use client"

import * as React from "react"

import { SiteNav } from "@/components/nav/site-nav"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"

/**
 * Header for the app host (kometz).
 *
 * Thin wrapper: it wires the real session and cart into the shared SiteNav so
 * both hosts render one menu from one config (lib/navigation.ts). The export
 * signature is unchanged — every page that already imports SiteHeader keeps
 * working untouched.
 *
 * The marketing counterpart is components/marketing/marketing-header.tsx, which
 * mounts the same SiteNav with a signed-out viewer and no cart handler.
 */
export function SiteHeader() {
    const { cartCount } = useCart()
    const { user, signOut, isAdmin, isStaff, isPremium, isReady } = useAuth()

    const [isBouncing, setIsBouncing] = React.useState(false)
    const prevCartCount = React.useRef(cartCount)

    React.useEffect(() => {
        if (cartCount > prevCartCount.current) {
            setIsBouncing(true)
            const timer = setTimeout(() => setIsBouncing(false), 400)
            return () => clearTimeout(timer)
        }
        prevCartCount.current = cartCount
    }, [cartCount])

    const handleSignOut = async () => {
        try {
            await signOut()
            // Hard redirect so every context and cache is cleared, not just the route.
            window.location.href = "/"
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return (
        <SiteNav
            mode="app"
            viewer={{ isLoggedIn: !!user, isPremium: !!isPremium, isAdmin: !!isAdmin, isStaff: !!isStaff }}
            viewerReady={isReady}
            cartCount={cartCount}
            cartBounce={isBouncing}
            onSignOut={handleSignOut}
        />
    )
}
