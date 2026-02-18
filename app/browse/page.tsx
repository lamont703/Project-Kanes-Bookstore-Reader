"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookCard } from "@/components/book-card"
import { mockBooks, GENRES } from "@/lib/mock-books"
import { Search, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import * as React from "react"

export default function BrowsePage() {
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"title" | "price-low" | "price-high">("title")
  const [isLoading, setIsLoading] = useState(true)

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [selectedGenre, sortBy]) // Re-trigger on filter change for better UX feel

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
        case "title":
          return a.title.localeCompare(b.title)

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
      <SiteHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2 uppercase">
            <span className="text-primary">THE KOMET</span> <span className="text-secondary">BOOK LIBRARY</span>
          </h1>
          <p className="text-lg text-muted-foreground">Explore original stories from the World of Kane: Crime Saga, Kosmic Myths, Street Legends, and Everything In Between.</p>
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
                <option value="title">Title: A-Z</option>

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
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
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
