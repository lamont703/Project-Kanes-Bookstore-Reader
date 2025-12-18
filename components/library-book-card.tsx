import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Check, Clock } from "lucide-react"
import type { Book } from "@/lib/mock-books"
import type { UserLibraryBook } from "@/lib/mock-user-data"
import Link from "next/link"
import Image from "next/image"

interface LibraryBookCardProps {
  book: Book
  userBook: UserLibraryBook
}

export function LibraryBookCard({ book, userBook }: LibraryBookCardProps) {
  const statusConfig = {
    "not-started": {
      label: "Not Started",
      icon: Clock,
      color: "text-muted-foreground",
    },
    reading: {
      label: "Reading",
      icon: BookOpen,
      color: "text-primary",
    },
    finished: {
      label: "Finished",
      icon: Check,
      color: "text-secondary",
    },
  }

  const status = statusConfig[userBook.status]
  const StatusIcon = status.icon

  return (
    <Card className="overflow-hidden bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all group">
      <Link href={`/read/${book.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={book.coverImage || "/placeholder.svg"}
            alt={book.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          {userBook.progress > 0 && userBook.progress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm">
              <div className="h-1 bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${userBook.progress}%` }} />
              </div>
              <div className="px-2 py-1 text-xs text-center">{userBook.progress}% complete</div>
            </div>
          )}
          {userBook.status === "finished" && (
            <div className="absolute top-2 right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-secondary-foreground" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <div>
          <Link href={`/read/${book.id}`}>
            <h3 className="font-display text-xl tracking-wide text-foreground hover:text-primary transition-colors line-clamp-1">
              {book.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{book.author}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${status.color}`} />
          <span className={`text-sm ${status.color}`}>{status.label}</span>
        </div>

        <Button className="w-full" size="sm" asChild>
          <Link href={`/read/${book.id}`}>
            {userBook.status === "not-started" ? "Start Reading" : "Continue Reading"}
          </Link>
        </Button>
      </div>
    </Card>
  )
}
