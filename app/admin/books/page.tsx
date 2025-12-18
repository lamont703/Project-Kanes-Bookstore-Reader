"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockBooks, GENRES } from "@/lib/mock-books"
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react"
import Image from "next/image"

export default function AdminBooksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")

  const filteredBooks = mockBooks.filter((book) => {
    const matchesSearch =
      searchQuery === "" ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
    return matchesSearch && matchesGenre
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-5xl tracking-wider mb-2">
            <span className="text-primary">MANAGE</span> BOOKS
          </h1>
          <p className="text-lg text-muted-foreground">{mockBooks.length} books in catalog</p>
        </div>
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add New Book
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search books or authors..."
            className="pl-10 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

      {/* Books Table */}
      <Card className="overflow-hidden bg-card/50 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left text-sm font-medium">Cover</th>
                <th className="p-4 text-left text-sm font-medium">Title</th>
                <th className="p-4 text-left text-sm font-medium">Author</th>
                <th className="p-4 text-left text-sm font-medium">Genre</th>
                <th className="p-4 text-left text-sm font-medium">Price</th>
                <th className="p-4 text-left text-sm font-medium">Rating</th>
                <th className="p-4 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="relative w-12 h-16 rounded overflow-hidden">
                      <Image
                        src={book.coverImage || "/placeholder.svg"}
                        alt={book.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{book.title}</p>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{book.author}</td>
                  <td className="p-4">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{book.genre}</span>
                  </td>
                  <td className="p-4 text-sm">${book.price}</td>
                  <td className="p-4 text-sm">{book.rating}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
