"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockBooks, GENRES } from "@/lib/mock-books"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  FileDown
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Mocked status mapping since the base interface doesn't have it
const booksWithStatus = mockBooks.map((book, index) => ({
  ...book,
  status: index % 4 === 0 ? "Draft" : "Published",
  createdAt: new Date(2024, 0, 1 + index).toLocaleDateString()
}))

export default function AdminBooksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<"title" | "price" | "newest">("title")

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const filteredBooks = booksWithStatus.filter((book) => {
    const matchesSearch =
      searchQuery === "" ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
    return matchesSearch && matchesGenre
  }).sort((a, b) => {
    if (sortOrder === "title") return a.title.localeCompare(b.title)
    if (sortOrder === "price") return a.price - b.price
    return 0
  })

  // Loading Skeleton Component
  const TableSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50 animate-pulse">
          <div className="w-12 h-16 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted w-1/4 rounded" />
            <div className="h-3 bg-muted w-1/6 rounded" />
          </div>
          <div className="w-24 h-4 bg-muted rounded" />
          <div className="w-20 h-4 bg-muted rounded" />
          <div className="w-24 h-8 bg-muted rounded" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider mb-2">
            <span className="text-primary">CATALOG</span> <span className="text-secondary">MANAGEMENT</span>
          </h1>
          <p className="text-lg text-muted-foreground">{booksWithStatus.length} cosmic volumes in the library</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent border-border">
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="lg" className="font-display tracking-wider text-lg" asChild>
            <Link href="/admin/upload">
              <Plus className="w-5 h-5 mr-2" />
              ADD NEW BOOK
            </Link>
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-8 bg-card/30 backdrop-blur border-border/50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author or ISBN..."
            className="pl-10 bg-background/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="appearance-none bg-background/50 border border-border/50 rounded-md px-4 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-primary w-full md:w-48"
            >
              <option value="All">All Categories</option>
              {GENRES.filter(g => g !== "All").map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="appearance-none bg-background/50 border border-border/50 rounded-md px-4 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-primary w-full md:w-40"
            >
              <option value="title">Sort by Title</option>
              <option value="price">Sort by Price</option>
              <option value="newest">Sort by Newest</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="overflow-hidden bg-card/50 backdrop-blur border-border/50">
        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : filteredBooks.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Volume</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Details</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Inventory</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="hover:bg-primary/5 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="relative w-14 h-20 rounded shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                        <Image
                          src={book.coverImage || "/placeholder.svg"}
                          alt={book.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-display text-xl tracking-wide group-hover:text-primary transition-colors">{book.title}</p>
                      <p className="text-sm text-muted-foreground">By {book.author}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-50 uppercase">{book.isbn}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded">
                        {book.genre}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-medium">${book.price}</span>
                        <span className="text-xs text-muted-foreground">In Stock</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {book.status === "Published" ? (
                        <div className="flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase">Published</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase">Draft</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-secondary hover:bg-secondary/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-70">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-3xl tracking-wide mb-2">NO DATA FOUND</h3>
              <p className="text-muted-foreground max-w-sm">
                No cosmic volumes match your current search or filter criteria.
              </p>
              <Button
                variant="outline"
                className="mt-6 bg-transparent"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedGenre("All")
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Footer Info */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-4">
        <p>Showing {filteredBooks.length} of {booksWithStatus.length} total books</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled className="bg-transparent border-border/30">Previous</Button>
          <Button variant="outline" size="sm" disabled className="bg-transparent border-border/30">Next</Button>
        </div>
      </div>
    </div>
  )
}

