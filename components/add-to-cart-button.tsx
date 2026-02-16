"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { ShoppingCart, Check } from "lucide-react"

import { BookFormat } from "@/lib/mock-books"

interface AddToCartButtonProps {
    book: {
        id: string
        title: string
        price: number
        coverImage: string
        format: BookFormat
    }
    disabled?: boolean
}

export function AddToCartButton({ book, disabled }: AddToCartButtonProps) {
    const { addToCart } = useCart()
    const [isAdded, setIsAdded] = useState(false)

    const handleAddToCart = () => {
        addToCart({
            id: book.id,
            title: book.title,
            price: book.price,
            coverImage: book.coverImage,
            format: book.format
        })
        setIsAdded(true)
        setTimeout(() => setIsAdded(false), 2000)
    }

    return (
        <Button
            size="lg"
            className={`flex-1 transition-all ${isAdded ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            disabled={disabled || isAdded}
            onClick={handleAddToCart}
        >
            {isAdded ? (
                <>
                    <Check className="w-5 h-5 mr-2" />
                    Added to Cart
                </>
            ) : (
                <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                </>
            )}
        </Button>
    )
}
