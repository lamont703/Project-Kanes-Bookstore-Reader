"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import type { BookFormat } from "@/lib/mock-books"

export interface CartItem {
    id: string        // book_id (UUID from Supabase)
    variantId: string  // book_variants.id (UUID from Supabase)
    title: string
    price: number
    coverImage: string
    quantity: number
    format: BookFormat
}

interface CartContextType {
    items: CartItem[]
    addToCart: (item: Omit<CartItem, "quantity">) => void
    removeFromCart: (id: string, format: BookFormat) => void
    clearCart: () => void
    cartCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])

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
    }, [])

    // Save cart to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem("komet_cart", JSON.stringify(items))
    }, [items])

    const addToCart = (newItem: Omit<CartItem, "quantity">) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.id === newItem.id && item.format === newItem.format)
            if (existing) {
                // Ebooks: cap at 1; physical formats allow multiple
                if (newItem.format === "ebook") return prev
                return prev.map((item) =>
                    (item.id === newItem.id && item.format === newItem.format)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { ...newItem, quantity: 1 }]
        })
    }

    const removeFromCart = (id: string, format: BookFormat) => {
        setItems((prev) => prev.filter((item) => !(item.id === id && item.format === format)))
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
