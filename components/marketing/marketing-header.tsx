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
 * These pages once lived on a host with no cookies, where this always resolved
 * to signed out. They are now part of the one site a member browses, so the
 * menu here matches the one on /browse rather than showing a signed-out header
 * to a signed-in member.
 *
 * The providers are mounted in the root layout, so both contexts are available
 * throughout this tree.
 */
export function MarketingHeader() {
    const { cartCount } = useCart()
    const { user, signOut, isAdmin, isStaff, isPremium, isReady } = useAuth()

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
            viewer={{ isLoggedIn: !!user, isPremium: !!isPremium, isAdmin: !!isAdmin, isStaff: !!isStaff }}
            viewerReady={isReady}
            cartCount={cartCount}
            onSignOut={user ? handleSignOut : undefined}
        />
    )
}
