import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MessageCircle, BookOpen } from "lucide-react"
import type { BookClubSelection } from "@/lib/mock-book-club-data"
import type { Book } from "@/lib/mock-books"
import Link from "next/link"
import Image from "next/image"

interface BookClubSelectionCardProps {
  selection: BookClubSelection
  book: Book
  isMember?: boolean
}

export function BookClubSelectionCard({ selection, book, isMember = false }: BookClubSelectionCardProps) {
  const statusConfig = {
    current: {
      label: "CURRENT SELECTION",
      color: "bg-primary/20 text-primary border-primary/30",
    },
    upcoming: {
      label: "COMING SOON",
      color: "bg-secondary/20 text-secondary border-secondary/30",
    },
    past: {
      label: "PAST SELECTION",
      color: "bg-muted/20 text-muted-foreground border-muted/30",
    },
  }

  const status = statusConfig[selection.status]

  return (
    <Card className="h-full overflow-hidden bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all">
      <div className="grid md:grid-cols-[200px_1fr] gap-6 p-6">
        {/* Book Cover */}
        <div className="relative aspect-[3/4] md:w-[200px] mx-auto md:mx-0">
          <Image src={book.coverImage || "/placeholder.svg"} alt={book.title} fill className="object-cover rounded" />
        </div>

        {/* Selection Details */}
        <div className="space-y-4">
          <div>
            <div className={`inline-block px-3 py-1 rounded text-xs font-medium mb-3 border ${status.color}`}>
              {status.label}
            </div>
            <h3 className="font-display text-3xl tracking-wide mb-2">
              {selection.month} {selection.year}
            </h3>
            <p className="text-lg text-primary font-medium mb-2">{selection.theme}</p>
            <p className="text-muted-foreground leading-relaxed">{selection.description}</p>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-display text-xl tracking-wide mb-2">{book.title}</h4>
            <p className="text-sm text-muted-foreground mb-1">by {book.author}</p>
            <p className="text-sm text-muted-foreground">{book.pageCount} pages</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Discussion:{" "}
              {selection.discussionDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {isMember && (
            <div className="flex flex-wrap gap-3 pt-2">
              {selection.status !== "upcoming" && (
                <Button variant="default" size="sm" asChild>
                  <Link href={`/read/${book.id}`}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read Now
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" className="bg-transparent">
                <MessageCircle className="w-4 h-4 mr-2" />
                Join Discussion
              </Button>
            </div>
          )}

          {!isMember && selection.status === "past" && (
            <div className="pt-2">
              <Button variant="default" size="sm" asChild>
                <Link href={`/book/${book.id}`}>Purchase Now</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
