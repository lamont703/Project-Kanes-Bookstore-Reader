"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookCard } from "@/components/book-card"
import { GENRES } from "@/lib/types/book"
import type { Book } from "@/lib/types/book"
import { Search, SlidersHorizontal, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"

export default function BrowsePage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"title" | "price-low" | "price-high">("title")
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // State tracking for debugging
  const lastFetchId = React.useRef(0)

  // RENDER LOGGING
  console.log(`🖼️ [BrowsePage Render] | isMounted: ${isMounted} | isAuthLoading: ${isAuthLoading} | isLoading: ${isLoading} | user: ${user?.id} | books: ${books.length}`)

  useEffect(() => {
    setIsMounted(true)
    const fetchId = ++lastFetchId.current
    console.log(`🧩 BrowsePage: Effect Run (Fetch #${fetchId})`)

    async function fetchBooks() {
      setIsLoading(true)
      console.log(`📦 BrowsePage: Starting Fetch #${fetchId}`)

      try {
        const { data, error, status, statusText } = await supabase
          .from('books')
          .select(`
            *,
            book_variants (*)
          `)
          .eq('status', 'published')

        // If a newer fetch has started, ignore this one
        if (fetchId !== lastFetchId.current) {
          console.warn(`🛑 BrowsePage: Ignoring Fetch #${fetchId} (Newer fetch in progress)`)
          return
        }

        console.log(`📊 Supabase Status for #${fetchId}: ${status} (${statusText})`)

        if (error) {
          console.error(`❌ Supabase Error #${fetchId}:`, error)
          throw error
        }

        if (data) {
          console.log(`✅ Received ${data.length} books for #${fetchId}`)

          const mappedBooks: Book[] = data.map((b: any) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            illustrator: b.illustrator,
            coverImage: b.cover_image_url || "/placeholder.webp",
            genre: b.genre,
            description: b.description || "",
            price: b.book_variants?.find((v: any) => v.format === 'ebook')?.price || b.book_variants?.[0]?.price || 0,
            variants: b.book_variants?.map((v: any) => ({
              id: v.id,
              format: v.format,
              price: v.price,
              available: v.is_in_stock
            })) || []
          }))

          setBooks(mappedBooks)
        }
      } catch (error) {
        console.error(`💥 BrowsePage #${fetchId} FAILED:`, error)
      } finally {
        if (fetchId === lastFetchId.current) {
          setIsLoading(false)
          console.log(`🏁 BrowsePage Fetch #${fetchId} - FINISHED`)
        }
      }
    }

    fetchBooks()
  }, [supabase])

  if (!isMounted) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>
          <div className="mb-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const filteredBooks = books
    .filter((book) => {
      const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
      const titleMatch = book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
      const authorMatch = book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
      const matchesSearch = searchQuery === "" || titleMatch || authorMatch
      return matchesGenre && matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return (a.title || "").localeCompare(b.title || "")
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        default:
          return 0
      }
    })

  console.log(`🖼️ [Browse Render] | Books: ${books.length} | Filtered: ${filteredBooks.length} | Genre: ${selectedGenre} | Search: "${searchQuery}"`)

  return (
    <div className="min-h-screen">
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

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
          </p>
        </div>

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
