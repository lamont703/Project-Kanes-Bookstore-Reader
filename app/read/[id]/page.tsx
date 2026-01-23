"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Settings, BookmarkIcon, Menu, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { mockChapters, type Highlight, type Bookmark } from "@/lib/mock-book-content"
import {
  saveHighlight,
  getHighlights,
  deleteHighlight,
  saveBookmark,
  getBookmarks,
  deleteBookmark,
  saveProgress,
  getProgress,
  saveSettings,
  getSettings,
  type ReadingSettings,
} from "@/lib/reading-storage"
import { ReadingSettingsPanel } from "@/components/reading-settings-panel"
import { ReadingSidebar } from "@/components/reading-sidebar"
import { useParams } from "next/navigation"

export default function ReadPage() {
  const params = useParams()
  const bookId = params.id as string

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [settings, setSettings] = useState<ReadingSettings>(getSettings())
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false)
  const [bookmarkNote, setBookmarkNote] = useState("")
  const [highlightNote, setHighlightNote] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 })

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHighlights(getHighlights(bookId))
    setBookmarks(getBookmarks(bookId))
    const progress = getProgress(bookId)
    if (progress) {
      setCurrentChapterIndex(progress.currentChapter)
    }
  }, [bookId])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveProgress({
      bookId,
      currentChapter: currentChapterIndex,
      currentParagraph: 0,
      percentage: (currentChapterIndex / mockChapters.length) * 100,
      lastRead: new Date(),
    })
  }, [currentChapterIndex, bookId])

  const currentChapter = mockChapters[currentChapterIndex]

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length > 0) {
      setSelectedText(text)
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      if (rect) {
        setSelectionPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
        setShowHighlightMenu(true)
      }
    } else {
      setShowHighlightMenu(false)
    }
  }

  const addHighlight = (color: string) => {
    if (!selectedText) return

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      bookId,
      chapterIndex: currentChapterIndex,
      paragraphIndex: 0,
      text: selectedText,
      color,
      note: highlightNote,
      createdAt: new Date(),
    }

    saveHighlight(newHighlight)
    setHighlights([...highlights, newHighlight])
    setShowHighlightMenu(false)
    setHighlightNote("")
    window.getSelection()?.removeAllRanges()
  }

  const addBookmark = () => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      bookId,
      chapterIndex: currentChapterIndex,
      paragraphIndex: 0,
      note: bookmarkNote,
      createdAt: new Date(),
    }

    saveBookmark(newBookmark)
    setBookmarks([...bookmarks, newBookmark])
    setShowBookmarkDialog(false)
    setBookmarkNote("")
  }

  const handleDeleteHighlight = (id: string) => {
    deleteHighlight(id)
    setHighlights(highlights.filter((h) => h.id !== id))
  }

  const handleDeleteBookmark = (id: string) => {
    deleteBookmark(id)
    setBookmarks(bookmarks.filter((b) => b.id !== id))
  }

  const goToLocation = (chapterIndex: number, _paragraphIndex: number) => {
    setCurrentChapterIndex(chapterIndex)
    setShowSidebar(false)
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const themeClasses = {
    dark: "bg-[oklch(0.12_0.08_270)] text-foreground",
    light: "bg-white text-gray-900",
    sepia: "bg-[#f4ecd8] text-[#5c4a3a]",
  }

  const fontFamilyClasses = {
    serif: "font-serif",
    sans: "font-sans",
    mono: "font-mono",
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur z-50 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/browse" className="flex items-center gap-2">
                <Image
                  src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
                  alt="Kane's Komets Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded object-contain"
                />
                <span className="font-display text-xl tracking-wider text-primary">KANE'S KOMETS</span>
              </Link>
              <div className="hidden md:block text-sm text-muted-foreground">
                Chapter {currentChapterIndex + 1} of {mockChapters.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowBookmarkDialog(true)}>
                <BookmarkIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
                {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Reading Area */}
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className={`min-h-full ${themeClasses[settings.theme]} transition-colors`}>
            <div className="container max-w-3xl mx-auto px-4 py-12">
              {/* Chapter Title */}
              <h1 className="font-display text-4xl tracking-wide mb-8 text-balance">{currentChapter.title}</h1>

              {/* Chapter Content */}
              <div
                className={`space-y-6 ${fontFamilyClasses[settings.fontFamily]}`}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  textAlign: settings.textAlign,
                }}
                onMouseUp={handleTextSelection}
              >
                {currentChapter.content.map((paragraph, index) => (
                  <p key={index} className="text-pretty">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-16 pt-8 border-t border-border">
                <Button
                  variant="outline"
                  disabled={currentChapterIndex === 0}
                  onClick={() => setCurrentChapterIndex((prev) => Math.max(0, prev - 1))}
                  className="bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  {currentChapterIndex + 1} / {mockChapters.length}
                </span>

                <Button
                  variant="outline"
                  disabled={currentChapterIndex === mockChapters.length - 1}
                  onClick={() => setCurrentChapterIndex((prev) => Math.min(mockChapters.length - 1, prev + 1))}
                  className="bg-transparent"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l border-border overflow-y-auto flex-shrink-0 bg-background p-4">
            <ReadingSettingsPanel settings={settings} onSettingsChange={setSettings} />
          </div>
        )}

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-border overflow-y-auto flex-shrink-0 bg-background p-4">
            <ReadingSidebar
              bookId={bookId}
              highlights={highlights}
              bookmarks={bookmarks}
              currentChapter={currentChapterIndex}
              onHighlightClick={goToLocation}
              onBookmarkClick={goToLocation}
              onDeleteHighlight={handleDeleteHighlight}
              onDeleteBookmark={handleDeleteBookmark}
            />
          </div>
        )}
      </div>

      {/* Highlight Menu */}
      {showHighlightMenu && (
        <div
          className="fixed z-50"
          style={{
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Card className="p-2 bg-card/95 backdrop-blur-lg border-primary/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 bg-yellow-500/30 hover:bg-yellow-500/50"
                onClick={() => addHighlight("yellow")}
              >
                <div className="w-4 h-4 bg-yellow-500 rounded" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 bg-green-500/30 hover:bg-green-500/50"
                onClick={() => addHighlight("green")}
              >
                <div className="w-4 h-4 bg-green-500 rounded" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 bg-blue-500/30 hover:bg-blue-500/50"
                onClick={() => addHighlight("blue")}
              >
                <div className="w-4 h-4 bg-blue-500 rounded" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 bg-pink-500/30 hover:bg-pink-500/50"
                onClick={() => addHighlight("pink")}
              >
                <div className="w-4 h-4 bg-pink-500 rounded" />
              </Button>
            </div>
            <Input
              type="text"
              placeholder="Add note (optional)"
              className="text-xs h-8"
              value={highlightNote}
              onChange={(e) => setHighlightNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addHighlight("yellow")
              }}
            />
          </Card>
        </div>
      )}

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-2 mb-4">
              <BookmarkIcon className="w-5 h-5 text-primary" />
              <h2 className="font-display text-2xl tracking-wide">ADD BOOKMARK</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Chapter {currentChapterIndex + 1}: {currentChapter.title}
                </label>
                <Textarea
                  placeholder="Add a note (optional)"
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={addBookmark}>
                  Save Bookmark
                </Button>
                <Button variant="outline" onClick={() => setShowBookmarkDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
