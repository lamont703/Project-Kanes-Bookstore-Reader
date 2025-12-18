"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Highlighter, Trash2, BookmarkCheck } from "lucide-react"
import type { Highlight, Bookmark as BookmarkType } from "@/lib/mock-book-content"

interface ReadingSidebarProps {
  bookId: string
  highlights: Highlight[]
  bookmarks: BookmarkType[]
  currentChapter: number
  onHighlightClick: (chapterIndex: number, paragraphIndex: number) => void
  onBookmarkClick: (chapterIndex: number, paragraphIndex: number) => void
  onDeleteHighlight: (id: string) => void
  onDeleteBookmark: (id: string) => void
}

export function ReadingSidebar({
  highlights,
  bookmarks,
  currentChapter,
  onHighlightClick,
  onBookmarkClick,
  onDeleteHighlight,
  onDeleteBookmark,
}: ReadingSidebarProps) {
  const highlightColors: Record<string, string> = {
    yellow: "bg-yellow-500/30 border-yellow-500",
    green: "bg-green-500/30 border-green-500",
    blue: "bg-blue-500/30 border-blue-500",
    pink: "bg-pink-500/30 border-pink-500",
  }

  return (
    <div className="space-y-6">
      {/* Bookmarks */}
      <Card className="p-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 mb-4">
          <BookmarkCheck className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg tracking-wide">BOOKMARKS</h3>
        </div>

        {bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookmarks yet</p>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="p-3 bg-background/50 rounded border border-border hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => onBookmarkClick(bookmark.chapterIndex, bookmark.paragraphIndex)}
                  >
                    <div className="text-sm font-medium mb-1">
                      Chapter {bookmark.chapterIndex + 1}
                      {bookmark.chapterIndex === currentChapter && (
                        <span className="ml-2 text-xs text-primary">(current)</span>
                      )}
                    </div>
                    {bookmark.note && <p className="text-xs text-muted-foreground line-clamp-2">{bookmark.note}</p>}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteBookmark(bookmark.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Highlights */}
      <Card className="p-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 mb-4">
          <Highlighter className="w-5 h-5 text-secondary" />
          <h3 className="font-display text-lg tracking-wide">HIGHLIGHTS</h3>
        </div>

        {highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No highlights yet</p>
        ) : (
          <div className="space-y-2">
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="p-3 bg-background/50 rounded border group hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => onHighlightClick(highlight.chapterIndex, highlight.paragraphIndex)}
                  >
                    <div className="text-xs text-muted-foreground mb-2">
                      Chapter {highlight.chapterIndex + 1}
                      {highlight.chapterIndex === currentChapter && (
                        <span className="ml-2 text-primary">(current)</span>
                      )}
                    </div>
                    <div className={`text-sm p-2 rounded border ${highlightColors[highlight.color]}`}>
                      {highlight.text}
                    </div>
                    {highlight.note && <p className="text-xs text-muted-foreground mt-2">{highlight.note}</p>}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteHighlight(highlight.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
