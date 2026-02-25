import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MessageCircle, BookOpen } from "lucide-react"
import type { BookClubSelection } from "@/lib/types/book-club"
import type { Book } from "@/lib/types/book"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface BookClubSelectionCardProps {
  selection: BookClubSelection
  book: Book
  isMember?: boolean
  isCompact?: boolean
}

export function BookClubSelectionCard({
  selection,
  book,
  isMember = false,
  isCompact = false
}: BookClubSelectionCardProps) {
  const statusConfig = {
    current: {
      label: "CURRENT",
      color: "bg-primary/20 text-primary border-primary/30",
    },
    upcoming: {
      label: "COMING SOON",
      color: "bg-secondary/20 text-secondary border-secondary/30",
    },
    past: {
      label: "PAST",
      color: "bg-muted/20 text-muted-foreground border-muted/30",
    },
  }

  const status = statusConfig[selection.status]

  return (
    <Card className={cn(
      "h-full overflow-hidden bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all",
      isCompact ? "flex flex-col" : "w-full"
    )}>
      <div className={cn(
        "grid gap-6 p-6",
        isCompact ? "grid-cols-1 p-4" : "md:grid-cols-[200px_1fr] p-8"
      )}>
        {/* Book Cover */}
        <div className={cn(
          "relative aspect-[3/4] overflow-hidden rounded shadow-xl",
          isCompact ? "w-full" : "md:w-[200px] mx-auto md:mx-0"
        )}>
          <Image src={book.coverImage || "/placeholder.svg"} alt={book.title} fill className="object-cover" />
        </div>

        {/* Selection Details */}
        <div className="space-y-4 flex flex-col">
          <div className="flex-1">
            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-widest mb-3 border ${status.color}`}>
              {status.label}
            </div>
            <h3 className={cn(
              "font-display tracking-wide mb-1",
              isCompact ? "text-xl" : "text-4xl"
            )}>
              {selection.month} {selection.year}
            </h3>
            <p className={cn(
              "text-primary font-medium tracking-wide uppercase italic",
              isCompact ? "text-xs" : "text-lg"
            )}>{selection.theme}</p>

            {!isCompact && (
              <p className="text-muted-foreground leading-relaxed mt-4 line-clamp-3">{selection.description}</p>
            )}
          </div>

          <div className={cn(
            "border-t border-border/50",
            isCompact ? "pt-3" : "pt-6"
          )}>
            <h4 className={cn(
              "font-display tracking-wide mb-1",
              isCompact ? "text-lg" : "text-2xl"
            )}>{book.title}</h4>
            <p className="text-xs text-muted-foreground italic">by {book.author}</p>
          </div>

          {!isCompact && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4 text-secondary" />
              <span>
                Discussion:{" "}
                {selection.discussionDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}

          {isMember && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selection.status !== "upcoming" && (
                <Button variant="default" size={isCompact ? "xs" : "sm"} asChild className="font-display tracking-widest">
                  <Link href={`/read/${book.id}`}>
                    <BookOpen className="w-3 h-3 mr-2" />
                    READ
                  </Link>
                </Button>
              )}
              <Button variant="outline" size={isCompact ? "xs" : "sm"} className="bg-transparent border-primary/30 hover:bg-primary/10">
                <MessageCircle className="w-3 h-3 mr-2" />
                CHAT
              </Button>
            </div>
          )}

          {!isMember && selection.status === "past" && (
            <div className="pt-2">
              <Button variant="default" size={isCompact ? "xs" : "sm"} asChild className="w-full font-display tracking-widest">
                <Link href={`/book/${book.id}`}>BUY NOW</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
