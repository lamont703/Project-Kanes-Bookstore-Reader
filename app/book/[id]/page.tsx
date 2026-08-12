import { notFound } from "next/navigation"
import type { Book } from "@/lib/types/book"
import { notFound as nextNotFound } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { BookPurchaseSection } from "@/components/book-purchase-section"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import Image from "next/image"
import { createClient, createStaticClient } from "@/lib/supabase/server"

// Book detail page is now fully dynamic to support user-specific state
// caching is handled via Next.js fetch cache where applicable

export async function generateStaticParams() {
  // Prevent build crash if env vars are missing during CI/CD or Vercel build
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("⚠️ NEXT_PUBLIC_SUPABASE_URL is missing. Skipping generateStaticParams.")
    return []
  }

  try {
    const supabase = createStaticClient()
    // Books only — `books` also holds merchandise since the catalog migration,
    // and merch has no book detail page.
    const { data: books } = await supabase.from('books').select('id').eq('product_type', 'book')

    return books?.map((book) => ({
      id: book.id,
    })) || []
  } catch (err) {
    console.error("❌ Error in generateStaticParams:", err)
    return []
  }
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: b, error } = await supabase
    .from('books')
    .select(`
      *,
      book_variants (*)
    `)
    .eq('id', id)
    .eq('product_type', 'book')
    .single()

  if (error || !b) {
    notFound()
  }

  const book: Book = {
    id: b.id,
    title: b.title,
    author: b.author,
    illustrator: b.illustrator,
    coverImage: b.cover_image_url || "/placeholder.webp",
    genre: b.genre,
    description: b.description || "",
    // Use ebook price as default, or first variant
    price: b.book_variants?.find((v: any) => v.format === 'ebook')?.price || b.book_variants?.[0]?.price || 0,
    variants: b.book_variants?.map((v: any) => ({
      id: v.id,
      format: v.format,
      price: v.price,
      available: v.is_in_stock
    })) || []
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
              <p className="text-3xl text-muted-foreground font-light mb-2">By {book.author}</p>
              {book.illustrator && (
                <p className="text-lg text-muted-foreground/80 italic mb-6">Illustrated by {book.illustrator}</p>
              )}
              {!book.illustrator && <div className="mb-6" />}
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
