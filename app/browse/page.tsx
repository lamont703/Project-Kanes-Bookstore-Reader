"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookCard } from "@/components/book-card"
import { mockBooks, GENRES } from "@/lib/mock-books"
import { Search, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function BrowsePage() {
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "price-low" | "price-high">("newest")

  const filteredBooks = mockBooks
    .filter((book) => {
      const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
      const matchesSearch =
        searchQuery === "" ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesGenre && matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.publishedYear - a.publishedYear
        case "rating":
          return b.rating - a.rating
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
                alt="Kane's Komets Logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="font-display text-2xl tracking-wider text-primary">KANE'S KOMETS</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/browse" className="text-sm font-medium text-primary">
                Browse
              </Link>
              <Link href="/book-club" className="text-sm hover:text-primary transition-colors">
                Book Club
              </Link>
              <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">
                My Library
              </Link>
              <Link href="/admin" className="text-sm hover:text-primary transition-colors">
                Admin
              </Link>
              <Button size="sm">Sign In</Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
            <span className="text-primary">KOMET</span> <span className="text-secondary">LIBRARY</span>
          </h1>
          <p className="text-lg text-muted-foreground">Discover your next great read from across the galaxy</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search books or authors..."
                className="pl-10 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
              <select
                className="bg-card border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Genre Filters */}
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGenre(genre)}
                className={selectedGenre === genre ? "" : "bg-transparent"}
              >
                {genre}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
          </p>
        </div>

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">No books found matching your criteria</p>
            <Button
              onClick={() => {
                setSelectedGenre("All")
                setSearchQuery("")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
