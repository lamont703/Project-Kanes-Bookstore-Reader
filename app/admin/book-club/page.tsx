import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockBookClubSelections } from "@/lib/mock-book-club-data"
import { mockBooks } from "@/lib/mock-books"
import { Plus, Edit, Trash2, Calendar } from "lucide-react"
import Image from "next/image"

export default function AdminBookClubPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-5xl tracking-wider mb-2">
            <span className="text-primary">BOOK CLUB</span> MANAGEMENT
          </h1>
          <p className="text-lg text-muted-foreground">Manage monthly selections and discussions</p>
        </div>
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Selection
        </Button>
      </div>

      {/* Selections List */}
      <div className="space-y-6">
        {mockBookClubSelections.map((selection) => {
          const book = mockBooks.find((b) => b.id === selection.bookId)
          if (!book) return null

          const statusConfig = {
            current: { label: "CURRENT", color: "bg-primary/20 text-primary border-primary/30" },
            upcoming: { label: "UPCOMING", color: "bg-secondary/20 text-secondary border-secondary/30" },
            past: { label: "PAST", color: "bg-muted/20 text-muted-foreground border-muted/30" },
          }

          const status = statusConfig[selection.status]

          return (
            <Card key={selection.id} className="overflow-hidden bg-card/50 backdrop-blur">
              <div className="grid md:grid-cols-[150px_1fr_auto] gap-6 p-6">
                {/* Book Cover */}
                <div className="relative aspect-[3/4] w-full max-w-[150px]">
                  <Image
                    src={book.coverImage || "/placeholder.svg"}
                    alt={book.title}
                    fill
                    className="object-cover rounded"
                  />
                </div>

                {/* Selection Info */}
                <div className="space-y-3">
                  <div>
                    <div className={`inline-block px-3 py-1 rounded text-xs font-medium mb-2 border ${status.color}`}>
                      {status.label}
                    </div>
                    <h3 className="font-display text-2xl tracking-wide">
                      {selection.month} {selection.year}
                    </h3>
                    <p className="text-lg text-primary font-medium">{selection.theme}</p>
                  </div>

                  <div>
                    <p className="font-medium mb-1">{book.title}</p>
                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{selection.description}</p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Discussion:{" "}
                      {selection.discussionDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2">
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
