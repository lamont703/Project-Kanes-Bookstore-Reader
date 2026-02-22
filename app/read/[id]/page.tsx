"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Settings, BookmarkIcon, Menu, X, StickyNote, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { ReadingSettingsPanel } from "@/components/reading-settings-panel"
import { ReadingSidebar } from "@/components/reading-sidebar"
import { useParams } from "next/navigation"
import type { Highlight, Bookmark } from "@/lib/mock-book-content"
import {
  saveSettings,
  getSettings,
  type ReadingSettings,
} from "@/lib/reading-storage"

// ─── Types ─────────────────────────────────────────────────────
interface BookPage {
  id: string
  book_id: string
  page_number: number
  page_image_url: string
  content: string | null
  word_count: number
}

interface BookMeta {
  id: string
  title: string
  author: string
}

// ─── Main Reader Component ─────────────────────────────────────
export default function ReadPage() {
  const params = useParams()
  const bookId = params.id as string
  const supabase = createClient()

  // Data state
  const [pages, setPages] = useState<BookPage[]>([])
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reader state
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [settings, setSettings] = useState<ReadingSettings>(getSettings())
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // UI state
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState("")
  const [noteText, setNoteText] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Fetch book pages from Supabase ──────────────────────────
  useEffect(() => {
    async function loadBook() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch book metadata
        const { data: book, error: bookErr } = await supabase
          .from("books")
          .select("id, title, author")
          .eq("id", bookId)
          .single()

        if (bookErr) throw new Error("Book not found")
        setBookMeta(book)

        // Fetch all pages ordered by page_number
        const { data: pageData, error: pageErr } = await supabase
          .from("book_pages")
          .select("*")
          .eq("book_id", bookId)
          .order("page_number", { ascending: true })

        if (pageErr) throw pageErr
        if (!pageData || pageData.length === 0) {
          throw new Error("No pages available for this book")
        }

        setPages(pageData)

        // Fetch user's reading progress
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Resume from saved progress
          const { data: progress } = await supabase
            .from("reading_progress")
            .select("current_page")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .single()

          if (progress?.current_page) {
            const resumeIndex = pageData.findIndex(
              (p: BookPage) => p.page_number === progress.current_page
            )
            if (resumeIndex >= 0) setCurrentPageIndex(resumeIndex)
          }

          // Load bookmarks
          const { data: userBookmarks } = await supabase
            .from("bookmarks")
            .select("*")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .order("created_at", { ascending: false })

          if (userBookmarks) {
            setBookmarks(userBookmarks.map((b: any) => ({
              id: b.id,
              bookId: b.book_id,
              pageNumber: b.page_number,
              label: b.label,
              createdAt: new Date(b.created_at),
            })))
          }

          // Load highlights/notes
          const { data: userHighlights } = await supabase
            .from("highlights")
            .select("*")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .order("created_at", { ascending: false })

          if (userHighlights) {
            setHighlights(userHighlights.map((h: any) => ({
              id: h.id,
              bookId: h.book_id,
              pageNumber: h.page_number,
              paragraphIndex: h.paragraph_index,
              text: h.text,
              color: h.color,
              note: h.note,
              createdAt: new Date(h.created_at),
            })))
          }

          // Load reading settings
          const { data: userSettings } = await supabase
            .from("reading_settings")
            .select("zoom, theme")
            .eq("user_id", user.id)
            .single()

          if (userSettings) {
            setSettings({
              zoom: userSettings.zoom,
              theme: userSettings.theme as "dark" | "light" | "sepia",
            })
          }
        }
      } catch (err: any) {
        console.error("[reader] Failed to load book:", err)
        setError(err.message || "Failed to load book")
      } finally {
        setIsLoading(false)
      }
    }

    loadBook()
  }, [bookId])

  // ─── Sync settings to localStorage + DB ──────────────────────
  useEffect(() => {
    saveSettings(settings)

    // Debounced DB sync
    const timeout = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("reading_settings").upsert({
          user_id: user.id,
          zoom: settings.zoom,
          theme: settings.theme,
        }, { onConflict: "user_id" })
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [settings])

  // ─── Sync reading progress (debounced 5s) ────────────────────
  const syncProgress = useCallback(async (pageIndex: number) => {
    if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current)

    progressDebounceRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || pages.length === 0) return

      const currentPage = pages[pageIndex]
      const progressPercent = ((pageIndex + 1) / pages.length) * 100

      await supabase.from("reading_progress").upsert({
        user_id: user.id,
        book_id: bookId,
        current_page: currentPage.page_number,
        progress_percent: Math.round(progressPercent * 100) / 100,
        last_read_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" })
    }, 5000) // 5-second debounce
  }, [bookId, pages])

  useEffect(() => {
    syncProgress(currentPageIndex)
  }, [currentPageIndex, syncProgress])

  // ─── Current page ────────────────────────────────────────────
  const currentPage = pages[currentPageIndex]

  // ─── Add bookmark ────────────────────────────────────────────
  const addBookmark = async () => {
    if (!currentPage) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newBookmark, error: bmErr } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        book_id: bookId,
        page_number: currentPage.page_number,
        label: bookmarkLabel || null,
      })
      .select()
      .single()

    if (bmErr) {
      console.error("[reader] Failed to save bookmark:", bmErr)
      return
    }

    setBookmarks([
      {
        id: newBookmark.id,
        bookId,
        pageNumber: currentPage.page_number,
        label: bookmarkLabel || undefined,
        createdAt: new Date(),
      },
      ...bookmarks,
    ])
    setShowBookmarkDialog(false)
    setBookmarkLabel("")
  }

  // ─── Add note ────────────────────────────────────────────────
  const addNote = async () => {
    if (!noteText.trim() || !currentPage) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newHighlight, error: hlErr } = await supabase
      .from("highlights")
      .insert({
        user_id: user.id,
        book_id: bookId,
        page_number: currentPage.page_number,
        paragraph_index: 0,
        text: noteText,
        color: "yellow",
      })
      .select()
      .single()

    if (hlErr) {
      console.error("[reader] Failed to save note:", hlErr)
      return
    }

    setHighlights([
      {
        id: newHighlight.id,
        bookId,
        pageNumber: currentPage.page_number,
        paragraphIndex: 0,
        text: noteText,
        color: "yellow",
        createdAt: new Date(),
      },
      ...highlights,
    ])
    setShowNoteDialog(false)
    setNoteText("")
  }

  // ─── Delete handlers ────────────────────────────────────────
  const handleDeleteHighlight = async (id: string) => {
    await supabase.from("highlights").delete().eq("id", id)
    setHighlights(highlights.filter((h) => h.id !== id))
  }

  const handleDeleteBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id)
    setBookmarks(bookmarks.filter((b) => b.id !== id))
  }

  // ─── Navigation ──────────────────────────────────────────────
  const goToPage = (pageNumber: number) => {
    const index = pages.findIndex((p) => p.page_number === pageNumber)
    if (index >= 0) {
      setCurrentPageIndex(index)
      setShowSidebar(false)
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1)
    } else if (direction === "next" && currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1)
    }
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ─── Keyboard navigation ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBookmarkDialog || showNoteDialog) return
      if (e.key === "ArrowLeft" || e.key === "a") navigatePage("prev")
      if (e.key === "ArrowRight" || e.key === "d") navigatePage("next")
      if (e.key === "b") setShowBookmarkDialog(true)
      if (e.key === "s") setShowSettings((prev) => !prev)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPageIndex, pages.length, showBookmarkDialog, showNoteDialog])

  // ─── Theme classes ───────────────────────────────────────────
  const themeClasses = {
    dark: "bg-[oklch(0.12_0.08_270)]",
    light: "bg-white",
    sepia: "bg-[#f4ecd8]",
  }

  // ─── Loading State ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="font-display text-xl tracking-wider text-muted-foreground">LOADING VOLUME...</p>
        </div>
      </div>
    )
  }

  // ─── Error State ─────────────────────────────────────────────
  if (error || !currentPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-display text-2xl tracking-wider">TRANSMISSION LOST</h2>
          <p className="text-muted-foreground">{error || "This volume has no pages yet."}</p>
          <Button asChild>
            <Link href="/browse">Return to Library</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Check bookmark status
  const isCurrentPageBookmarked = bookmarks.some(
    (b) => b.pageNumber === currentPage.page_number
  )

  // ─── Render ──────────────────────────────────────────────────
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
                <span className="font-display text-xl tracking-wider text-primary">KANE&apos;S KOMETS</span>
              </Link>
              <div className="hidden md:block text-sm text-muted-foreground">
                Page {currentPage.page_number} of {pages.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBookmarkDialog(true)}
                className={isCurrentPageBookmarked ? "text-primary" : ""}
                title="Add Bookmark (B)"
              >
                <BookmarkIcon className={`w-4 h-4 ${isCurrentPageBookmarked ? "fill-primary" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNoteDialog(true)} title="Add Note">
                <StickyNote className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} title="Settings (S)">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)} title="Sidebar">
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
            <div className="container max-w-4xl mx-auto px-4 py-8">
              {/* Page Image */}
              <div key={currentPageIndex} className="animate-fade-up">
                <div
                  className="relative mx-auto rounded-lg overflow-hidden shadow-2xl shadow-black/30 border border-border/20"
                  style={{
                    maxWidth: `${(settings.zoom / 100) * 600}px`,
                  }}
                >
                  {/* Page Image — preserves exact PDF layout */}
                  <Image
                    src={currentPage.page_image_url}
                    alt={`Page ${currentPage.page_number}`}
                    width={600}
                    height={800}
                    className="w-full h-auto block"
                    priority
                    unoptimized
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
                <Button
                  variant="outline"
                  disabled={currentPageIndex === 0}
                  onClick={() => navigatePage("prev")}
                  className="bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Page
                </Button>

                <span className="text-sm text-muted-foreground font-mono">
                  {currentPage.page_number} / {pages.length}
                </span>

                <Button
                  variant="outline"
                  disabled={currentPageIndex === pages.length - 1}
                  onClick={() => navigatePage("next")}
                  className="bg-transparent"
                >
                  Next Page
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentPageIndex + 1) / pages.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {Math.round(((currentPageIndex + 1) / pages.length) * 100)}% complete
                </p>
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
              currentPage={currentPage.page_number}
              onHighlightClick={goToPage}
              onBookmarkClick={goToPage}
              onDeleteHighlight={handleDeleteHighlight}
              onDeleteBookmark={handleDeleteBookmark}
            />
          </div>
        )}
      </div>

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-2 mb-4">
              <BookmarkIcon className="w-5 h-5 text-primary" />
              <h2 className="font-display text-2xl tracking-wide">BOOKMARK PAGE</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Page {currentPage.page_number}
                </label>
                <Input
                  placeholder="Add a label (optional)"
                  value={bookmarkLabel}
                  onChange={(e) => setBookmarkLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addBookmark()
                  }}
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

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-secondary" />
              <h2 className="font-display text-2xl tracking-wide">ADD NOTE</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Note for Page {currentPage.page_number}
                </label>
                <Input
                  placeholder="Write your note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNote()
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={addNote}>
                  Save Note
                </Button>
                <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
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
