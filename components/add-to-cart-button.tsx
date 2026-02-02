"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { ShoppingCart } from "lucide-react"

interface AddToCartButtonProps {
    book: {
        id: string
        title: string
        price: number
        coverImage: string
    }
}

export function AddToCartButton({ book }: AddToCartButtonProps) {
    const { addToCart } = useCart()

    return (
        <Button
            size="lg"
            className="flex-1"
            onClick={() => addToCart({
                id: book.id,
                title: book.title,
                price: book.price,
                coverImage: book.coverImage
            })}
        >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
        </Button>
    )
}
