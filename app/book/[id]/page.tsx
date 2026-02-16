import { notFound } from "next/navigation"
import { mockBooks } from "@/lib/mock-books"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShoppingCart, BookOpen, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BookPurchaseSection } from "@/components/book-purchase-section"
import { SiteHeader } from "@/components/site-header"

export function generateStaticParams() {
  return mockBooks.map((book) => ({
    id: book.id,
  }))
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = mockBooks.find((b) => b.id === id)

  if (!book) {
    notFound()
  }

  return (
    <div className="min-h-screen font-body">
      {/* Header */}
      <SiteHeader />

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-[300px_1fr] lg:grid-cols-[400px_1fr] gap-12 max-w-6xl">
          {/* Book Cover */}
          <div className="space-y-6">
            <Card className="overflow-hidden bg-card/50 backdrop-blur border-primary/30 shadow-2xl">
              <div className="relative aspect-[3/4]">
                <Image src={book.coverImage || "/placeholder.svg"} alt={book.title} fill className="object-cover" />
              </div>
            </Card>


          </div>

          {/* Book Details */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full mb-6 text-sm font-bold uppercase tracking-tighter">
                <Sparkles className="w-4 h-4" />
                {book.genre}
              </div>
              <h1 className="font-display text-6xl md:text-7xl lg:text-8xl tracking-tighter mb-4 leading-[0.85] text-balance">
                {book.title}
              </h1>
              <p className="text-3xl text-muted-foreground font-light mb-6">By {book.author}</p>
            </div>

            <BookPurchaseSection book={book} />

            <div className="border-t border-border pt-6">
              <h2 className="font-display text-2xl tracking-wide mb-3">ABOUT THIS BOOK</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">{book.description}</p>
            </div>




          </div>
        </div>
      </div>
    </div>
  )
}
