import { notFound } from "next/navigation"
import { mockBooks } from "@/lib/mock-books"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, ShoppingCart, BookOpen, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl tracking-wider text-primary">KOMET</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/browse" className="text-sm hover:text-primary transition-colors">
                Browse
              </Link>
              <Link href="/book-club" className="text-sm hover:text-primary transition-colors">
                Book Club
              </Link>
              <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">
                My Library
              </Link>
              <Button size="sm">Sign In</Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-[300px_1fr] lg:grid-cols-[400px_1fr] gap-12 max-w-6xl">
          {/* Book Cover */}
          <div>
            <Card className="overflow-hidden bg-card/50 backdrop-blur border-primary/30">
              <div className="relative aspect-[3/4]">
                <Image src={book.coverImage || "/placeholder.svg"} alt={book.title} fill className="object-cover" />
              </div>
            </Card>
          </div>

          {/* Book Details */}
          <div className="space-y-6">
            <div>
              <div className="inline-block bg-primary/20 text-primary px-3 py-1 rounded mb-4 text-sm font-medium">
                {book.genre}
              </div>
              <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2 text-balance">{book.title}</h1>
              <p className="text-2xl text-muted-foreground mb-4">by {book.author}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-secondary text-secondary" />
                  <span className="font-medium text-lg">{book.rating}</span>
                </div>
                <span className="text-muted-foreground">• {book.pageCount} pages</span>
                <span className="text-muted-foreground">• {book.publishedYear}</span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-5xl text-secondary">${book.price}</span>
                <span className="text-muted-foreground">one-time purchase</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="flex-1">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button size="lg" variant="outline" className="flex-1 bg-transparent">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Preview
                </Button>
              </div>
            </div>

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
