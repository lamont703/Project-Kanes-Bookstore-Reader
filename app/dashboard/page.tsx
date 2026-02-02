import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LibraryBookCard } from "@/components/library-book-card"
import { mockBooks } from "@/lib/mock-books"
import { mockUserLibrary, mockUserStats } from "@/lib/mock-user-data"
import { BookOpen, TrendingUp, Flame } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DashboardPage() {
  // Get user's books
  const userBooks = mockUserLibrary.map((userBook) => {
    const book = mockBooks.find((b) => b.id === userBook.bookId)
    return { book, userBook }
  })

  const currentlyReading = userBooks.filter((ub) => ub.userBook.status === "reading")
  const finishedBooks = userBooks.filter((ub) => ub.userBook.status === "finished")

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

        {/* Finished Books */}
        {finishedBooks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl tracking-wider">
                <span className="text-secondary">FINISHED</span> BOOKS
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {finishedBooks.map(
                ({ book, userBook }) => book && <LibraryBookCard key={book.id} book={book} userBook={userBook} />,
              )}
            </div>
          </section>
        )}

        {/* Reading Insights */}
        <section className="mb-12">
          <h2 className="font-display text-3xl tracking-wider mb-6">
            <span className="text-primary">READING</span> INSIGHTS
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl tracking-wide mb-2">FAVORITE GENRE</h3>
                  <p className="text-2xl font-medium mb-1">{mockUserStats.favoriteGenre}</p>
                  <p className="text-sm text-muted-foreground">Based on your reading history</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-secondary/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Flame className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display text-xl tracking-wide mb-2">KEEP IT UP!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {"You're on a "}
                    {mockUserStats.currentStreak}-day reading streak. Read today to maintain your momentum and unlock
                    achievements!
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

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
