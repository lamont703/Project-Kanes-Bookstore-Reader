import { notFound } from "next/navigation"
import { mockBooks } from "@/lib/mock-books"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, ShoppingCart, BookOpen, Sparkles } from "lucide-react"
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

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card/30 p-4 rounded-xl border border-border">
                <div className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-1">Length</div>
                <div className="text-xl font-display uppercase">{book.pageCount} Pages</div>
              </div>
              <div className="bg-card/30 p-4 rounded-xl border border-border">
                <div className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-1">Year</div>
                <div className="text-xl font-display uppercase">{book.publishedYear}</div>
              </div>
            </div>
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

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 py-2 px-4 bg-secondary/10 rounded-full border border-secondary/20">
                  <Star className="w-5 h-5 fill-secondary text-secondary" />
                  <span className="font-bold text-xl leading-none">{book.rating}</span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${book.id}${i}`} alt="User" width={32} height={32} />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                    +1.2k
                  </div>
                </div>
              </div>
            </div>

            <BookPurchaseSection book={book} />

            <div className="border-t border-border pt-6">
              <h2 className="font-display text-2xl tracking-wide mb-3">ABOUT THIS BOOK</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">{book.description}</p>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="font-display text-2xl tracking-wide mb-4">BOOK DETAILS</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">ISBN</dt>
                  <dd className="font-medium">{book.isbn}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Pages</dt>
                  <dd className="font-medium">{book.pageCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Published</dt>
                  <dd className="font-medium">{book.publishedYear}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Genre</dt>
                  <dd className="font-medium">{book.genre}</dd>
                </div>
              </dl>
            </div>

            {/* Book Club CTA */}
            <Card className="p-6 bg-primary/10 border-primary/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl tracking-wide mb-2">GET THIS FREE WITH BOOK CLUB</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Subscribe to our monthly book club and get access to this book plus hundreds more for just
                    $12/month.
                  </p>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Learn More
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
