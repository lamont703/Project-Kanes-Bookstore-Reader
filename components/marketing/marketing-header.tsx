"use client"

import * as React from "react"

import { SiteNav } from "@/components/nav/site-nav"
import { useAuth } from "@/context/auth-context"
import { useCart } from "@/context/cart-context"

/**
 * Header for the marketing routes.
 *
 * Reads the real session so the menu is state-aware: My Library, Discussions,
 * Events and Admin appear only when the viewer is entitled to them.
 *
 * Reading auth does NOT create a session, so the apex stays session-free — it
 * has no cookies, so this resolves to signed out and the gated entries are
 * hidden. On the app host, where the marketing routes also render, the same
 * header now matches the one on /browse instead of showing a signed-out menu to
 * a signed-in member.
 *
 * The providers are mounted in the root layout, so both contexts are available
 * throughout this tree.
 */
export function MarketingHeader() {
    const { cartCount } = useCart()
    const { user, signOut, isAdmin, isPremium, isReady } = useAuth()

    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = "/"
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return (
        <SiteNav
            mode="marketing"
            viewer={{ isLoggedIn: !!user, isPremium: !!isPremium, isAdmin: !!isAdmin }}
            viewerReady={isReady}
            cartCount={cartCount}
            onSignOut={user ? handleSignOut : undefined}
        />
    )
}
