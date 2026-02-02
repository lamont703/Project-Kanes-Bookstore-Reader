import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LibraryBookCard } from "@/components/library-book-card"
import { mockBooks } from "@/lib/mock-books"
import { mockUserLibrary } from "@/lib/mock-user-data"
import { BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DashboardPage() {
  // Get user's books
  const userBooks = mockUserLibrary.map((userBook) => {
    const book = mockBooks.find((b) => b.id === userBook.bookId)
    return { book, userBook }
  })

  const currentlyReading = userBooks.filter((ub) => ub.userBook.status === "reading")


  return (
    <div className="min-h-screen">
      {/* Header */}
      <SiteHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
            <span className="text-primary">MY</span> <span className="text-secondary">LIBRARY</span>
          </h1>
          <p className="text-lg text-muted-foreground">Track your reading journey across the cosmos</p>
        </div>



        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl tracking-wider">
                <span className="text-primary">CURRENTLY</span> READING
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentlyReading.map(
                ({ book, userBook }) => book && <LibraryBookCard key={book.id} book={book} userBook={userBook} />,
              )}
            </div>
          </section>
        )}





        {/* Discover More CTA */}
        <Card className="p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl tracking-wider">
              <span className="text-primary">DISCOVER</span> <span className="text-secondary">MORE</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore thousands of books across every genre and expand your Komet library
            </p>
            <Button size="lg" asChild>
              <Link href="/browse">
                <BookOpen className="w-5 h-5 mr-2" />
                Browse Books
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
