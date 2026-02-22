import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Check } from "lucide-react"
import type { Book, BookFormat } from "@/lib/types/book"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/context/cart-context"
import { Tablet, Book as BookIcon, CreditCard } from "lucide-react"

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const { addToCart } = useCart()
  const [isAdded, setIsAdded] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>("ebook")

  const currentVariant = book.variants.find(v => v.format === selectedFormat) || book.variants[0]

  const handleAddToCart = () => {
    addToCart({
      id: book.id,
      variantId: currentVariant.id || "",
      title: book.title,
      price: currentVariant.price,
      coverImage: book.coverImage,
      format: selectedFormat
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
            ${currentVariant.price}
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

        <div className="flex items-center justify-between">
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{book.genre}</span>
        </div>

        {/* Variant Selection */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {book.variants.map((v) => (
            <button
              key={v.format}
              onClick={() => setSelectedFormat(v.format)}
              disabled={!v.available}
              className={`flex-1 flex flex-col items-center py-1.5 rounded transition-all ${selectedFormat === v.format
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-background/50 text-muted-foreground"
                } ${!v.available ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {v.format === "ebook" && <Tablet className="w-3.5 h-3.5" />}
              {v.format === "paper_book" && <BookIcon className="w-3.5 h-3.5" />}
              {v.format === "komet_card" && <CreditCard className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold uppercase mt-0.5">
                {v.format === "ebook" ? "E-Book" : v.format === "paper_book" ? "Paper" : "Komet Card"}
              </span>
            </button>
          ))}
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
