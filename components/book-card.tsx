import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart, Check } from "lucide-react"
import type { Book } from "@/lib/mock-books"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/context/cart-context"

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const { addToCart } = useCart()
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = () => {
    addToCart({
      id: book.id,
      title: book.title,
      price: book.price,
      coverImage: book.coverImage
    })
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <Card className="overflow-hidden bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all group">
      <Link href={`/book/${book.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={book.coverImage || "/placeholder.svg"}
            alt={book.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute top-2 right-2 bg-secondary/90 backdrop-blur-sm text-secondary-foreground px-2 py-1 rounded text-sm font-bold">
            ${book.price}
          </div>
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <div>
          <Link href={`/book/${book.id}`}>
            <h3 className="font-display text-xl tracking-wide text-foreground hover:text-primary transition-colors line-clamp-1">
              {book.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{book.author}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-secondary text-secondary" />
            <span className="text-sm font-medium">{book.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">• {book.pageCount} pages</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{book.genre}</span>
        </div>

        <Button
          className={`w-full transition-all ${isAdded ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          size="sm"
          onClick={handleAddToCart}
          disabled={isAdded}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
