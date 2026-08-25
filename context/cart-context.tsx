"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import type { BookFormat } from "@/lib/types/book"

export interface CartItem {
    id: string        // book_id (UUID from Supabase) — also the merch product id
    variantId: string  // book_variants.id (UUID from Supabase)
    title: string
    price: number
    coverImage: string
    quantity: number
    format: BookFormat
    /** Apparel sizing. Undefined for books and unsized merch. */
    size?: string | null
}

interface CartContextType {
    items: CartItem[]
    addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void
    /** Keyed by variant, not by (book, format) — see the note on addToCart. */
    removeFromCart: (variantId: string) => void
    clearCart: () => void
    cartCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isMounted, setIsMounted] = useState(false)

    // Load cart from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("komet_cart")
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart))
            } catch (e) {
                console.error("Failed to parse cart", e)
            }
        }
        setIsMounted(true)
    }, [])

    // Save cart to local storage whenever it changes (after mount)
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("komet_cart", JSON.stringify(items))
        }
    }, [items, isMounted])

    /**
     * Line items are keyed by variantId, NOT by (id, format).
     *
     * For books those are equivalent — book_variants is unique per
     * (book_id, format). For merchandise they are not: a T-shirt's sizes are
     * separate variants that all share one product id and format 'merch', so
     * keying on (id, format) would silently collapse a Small and a Large into
     * a single line. variantId is the real SKU and matches
     * cart_items.variant_id.
     */
    const addToCart = (newItem: Omit<CartItem, "quantity">, quantity = 1) => {
        // Clamped to the same range process-checkout enforces, so the cart can
        // never hold a quantity that checkout will reject.
        const wanted = Math.min(99, Math.max(1, Math.floor(Number(quantity) || 1)))

        setItems((prev) => {
            const existing = prev.find((item) => item.variantId === newItem.variantId)
            if (existing) {
                // Ebooks: cap at 1; physical formats allow multiple
                if (newItem.format === "ebook") return prev
                return prev.map((item) =>
                    item.variantId === newItem.variantId
                        ? { ...item, quantity: Math.min(99, item.quantity + wanted) }
                        : item
                )
            }
            return [...prev, { ...newItem, quantity: newItem.format === "ebook" ? 1 : wanted }]
        })
    }

    const removeFromCart = (variantId: string) => {
        setItems((prev) => prev.filter((item) => item.variantId !== variantId))
    }

    const clearCart = () => {
        setItems([])
    }

    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, cartCount }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider")
    }
    return context
}
