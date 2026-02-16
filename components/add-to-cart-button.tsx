"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { ShoppingCart } from "lucide-react"

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

    return (
        <Button
            size="lg"
            className="flex-1"
            disabled={disabled}
            onClick={() => addToCart({
                id: book.id,
                title: book.title,
                price: book.price,
                coverImage: book.coverImage,
                format: book.format
            })}
        >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
        </Button>
    )
}
