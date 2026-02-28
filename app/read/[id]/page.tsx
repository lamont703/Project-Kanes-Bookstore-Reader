"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
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
import type { Highlight, Bookmark } from "@/lib/types/reader"
import {
  saveSettings,
  getSettings,
  defaultSettings,
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
  book_file_url?: string
}

// ─── Main Reader Component ─────────────────────────────────────
export default function ReadPage() {
  const params = useParams()
  const bookId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  // Data state
  const [pages, setPages] = useState<BookPage[]>([])
  const [bookMeta, setBookMeta] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isPdf, setIsPdf] = useState(true)

  // Reader state
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings)
  const [isMounted, setIsMounted] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Page Navigation Scroll Logic
  useEffect(() => {
    if (pages.length === 0) return

    if (settings.viewMode === "original" && isPdf) {
      const pageEl = document.getElementById(`pdf-page-${pages[currentPageIndex].page_number}`)
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "auto", block: "start" })
      }
    } else {
      // For Reflowable text mode or non-PDFs
      contentRef.current?.scrollTo({ top: 0, behavior: "auto" })
    }
  }, [currentPageIndex, settings.viewMode, isPdf, pages])

  useEffect(() => {
    setIsMounted(true)
    const saved = getSettings()
    setSettings({ ...saved, viewMode: "text" })
  }, [])

  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [bookIllustrations, setBookIllustrations] = useState<any[]>([])

  // UI state
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState("")
  const [noteText, setNoteText] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  // ─── Fetch book pages from Supabase ──────────────────────────
  useEffect(() => {
    async function loadBook() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch book metadata
        const { data: book, error: bookErr } = await supabase
          .from("books")
          .select("id, title, author, book_file_url")
          .eq("id", bookId)
          .single()

        if (bookErr) throw new Error("Book not found")
        setBookMeta(book)

        const fileIsPdf = book.book_file_url?.toLowerCase().endsWith(".pdf")
        setIsPdf(!!fileIsPdf)

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

        // Fetch book illustrations
        const { data: illustData } = await supabase
          .from("book_illustrations")
          .select("*")
          .eq("book_id", bookId)

        if (illustData) setBookIllustrations(illustData)

        // Fetch user progress
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: progress } = await supabase
            .from("reading_progress")
            .select("current_page")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .maybeSingle()

          if (progress?.current_page) {
            const resumeIndex = pageData.findIndex((p: BookPage) => p.page_number === progress.current_page)
            if (resumeIndex >= 0) setCurrentPageIndex(resumeIndex)
          }

          const { data: userBookmarks } = await supabase.from("bookmarks").select("*").eq("user_id", user.id).eq("book_id", bookId)
          if (userBookmarks) setBookmarks(userBookmarks.map((b: any) => ({ ...b, createdAt: new Date(b.created_at) })))

          const { data: userHighlights } = await supabase.from("highlights").select("*").eq("user_id", user.id).eq("book_id", bookId)
          if (userHighlights) setHighlights(userHighlights.map((h: any) => ({ ...h, createdAt: new Date(h.created_at) })))
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


  // ─── Sync settings & Progress ────────────────────────────────
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const syncProgress = useCallback(async (pageIndex: number) => {
    if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current)
    progressDebounceRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || pages.length === 0) return
      const currentPage = pages[pageIndex]
      await supabase.from("reading_progress").upsert({
        user_id: user.id,
        book_id: bookId,
        current_page: currentPage.page_number,
        progress_percent: Math.round(((pageIndex + 1) / pages.length) * 10000) / 100,
        last_read_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" })
    }, 5000)
  }, [bookId, pages])

  useEffect(() => {
    syncProgress(currentPageIndex)
  }, [currentPageIndex, syncProgress])

  const currentPage = pages[currentPageIndex]

  const goToPage = (pageNumber: number) => {
    const index = pages.findIndex((p) => p.page_number === pageNumber)
    if (index >= 0) {
      setCurrentPageIndex(index)
      setShowSidebar(false)
    }
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPageIndex > 0) setCurrentPageIndex((prev) => prev - 1)
    else if (direction === "next" && currentPageIndex < pages.length - 1) setCurrentPageIndex((prev) => prev + 1)
  }

  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null)

  const minSwipeDistance = 100

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const diffX = touchStart.x - touchEnd.x
    const diffY = touchStart.y - touchEnd.y

    const isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY)
    const isLeftSwipe = diffX > minSwipeDistance
    const isRightSwipe = diffX < -minSwipeDistance

    if (isHorizontalSwipe) {
      if (isLeftSwipe) navigatePage("next")
      if (isRightSwipe) navigatePage("prev")
    }
  }

  // Panel Swipe to Close (Right swipe to dismiss)
  const [panelTouchStart, setPanelTouchStart] = useState<number | null>(null)

  const onPanelTouchStart = (e: React.TouchEvent) => {
    setPanelTouchStart(e.targetTouches[0].clientX)
  }

  const onPanelTouchEnd = (e: React.TouchEvent, closeFn: () => void) => {
    if (panelTouchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const distance = panelTouchStart - touchEnd

    // If swiped right (towards edge) by more than 50px
    if (distance < -50) {
      closeFn()
    }
    setPanelTouchStart(null)
  }

  const [selectedText, setSelectedText] = useState("")
  const [highlightColor, setHighlightColor] = useState("yellow")

  const handleMouseUp = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString())
      setNoteText("")
      setShowNoteDialog(true)
    }
  }

  const handleSaveNote = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("highlights")
      .insert({
        user_id: user.id,
        book_id: bookId,
        page_number: currentPage.page_number,
        paragraph_index: 0,
        text: selectedText,
        note: noteText,
        color: highlightColor,
      })
      .select()
      .single()

    if (error) {
      console.error("[reader] Failed to save highlight:", error)
      return
    }

    if (data) {
      setHighlights([...highlights, {
        id: data.id,
        bookId: data.book_id,
        pageNumber: data.page_number,
        paragraphIndex: data.paragraph_index,
        text: data.text,
        note: data.note,
        color: data.color,
        createdAt: new Date(data.created_at)
      }])
      setShowNoteDialog(false)
      setSelectedText("")
      setNoteText("")
    }
  }

  const handleToggleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const existing = bookmarks.find(b => b.pageNumber === currentPage.page_number)

    if (existing) {
      const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id)
      if (!error) {
        setBookmarks(bookmarks.filter(b => b.id !== existing.id))
      }
    } else {
      setShowBookmarkDialog(true)
    }
  }

  const handleSaveBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        book_id: bookId,
        page_number: currentPage.page_number,
        label: bookmarkLabel || `Bookmark on Page ${currentPage.page_number}`
      })
      .select()
      .single()

    if (data) {
      setBookmarks([...bookmarks, {
        id: data.id,
        bookId: data.book_id,
        pageNumber: data.page_number,
        label: data.label,
        createdAt: new Date(data.created_at)
      }])
      setShowBookmarkDialog(false)
      setBookmarkLabel("")
    }
  }

  const deleteHighlight = async (id: string) => {
    const { error } = await supabase.from("highlights").delete().eq("id", id)
    if (!error) setHighlights(highlights.filter(h => h.id !== id))
  }

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id)
    if (!error) setBookmarks(bookmarks.filter(b => b.id !== id))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBookmarkDialog || showNoteDialog) return
      if (e.key === "ArrowLeft" || e.key === "a") navigatePage("prev")
      if (e.key === "ArrowRight" || e.key === "d") navigatePage("next")
      if (e.key === "s") setShowSettings((prev) => !prev)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPageIndex, pages.length, showBookmarkDialog, showNoteDialog])

  const themeClasses = {
    dark: "bg-[oklch(0.12_0.08_270)]",
    light: "bg-white",
    sepia: "bg-[#f4ecd8]",
  }

  const textClasses = {
    dark: "text-white",
    light: "text-slate-900",
    sepia: "text-[#433422]",
  }

  const renderTextWithHighlights = (text: string) => {
    if (!currentPage) return text
    const pageHighlights = highlights.filter(h => h.pageNumber === currentPage.page_number)
    if (pageHighlights.length === 0) return text

    let parts: (string | React.ReactNode | (string | React.ReactNode)[])[] = [text]

    const colors: Record<string, string> = {
      yellow: "bg-yellow-500/40 border-b border-yellow-500/50",
      green: "bg-green-500/40 border-green-500/50",
      blue: "bg-blue-500/40 border-blue-500/50",
      pink: "bg-pink-500/40 border-pink-500/50",
    }

    pageHighlights.forEach(h => {
      const newParts: (string | React.ReactNode | (string | React.ReactNode)[])[] = []
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part)
          return
        }

        const subParts = part.split(h.text)
        subParts.forEach((subPart, i) => {
          if (subPart) newParts.push(subPart)
          if (i < subParts.length - 1) {
            newParts.push(
              <span
                key={`${h.id}-${i}`}
                className={`${colors[h.color] || colors.yellow} rounded-sm px-0.5 mx-0.5 cursor-help transition-all hover:brightness-110`}
                title={h.note}
              >
                {h.text}
              </span>
            )
          }
        })
      })
      parts = newParts
    })

    return parts
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="font-display text-xl tracking-wider text-muted-foreground uppercase">Syncing volume...</p>
        </div>
      </div>
    )
  }

  if (error || !currentPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-display text-2xl tracking-wider">ERROR</h2>
          <p className="text-muted-foreground">{error || "No content found."}</p>
          <Button asChild><Link href="/browse">Return to Library</Link></Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur z-50 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/browse" className="flex items-center gap-2">
              <Image src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png" width={24} height={24} alt="log" className="w-6 h-6 rounded" />
              <span className="font-display text-xl tracking-wider text-primary">KANE&apos;S KOMETS</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={bookmarks.find(b => b.pageNumber === currentPage?.page_number) ? "text-primary hover:text-primary/80" : ""}
                onClick={handleToggleBookmark}
              >
                <BookmarkIcon className={`w-4 h-4 ${bookmarks.find(b => b.pageNumber === currentPage?.page_number) ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}><Settings className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>{showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area Container: flex-col to keep footer at bottom */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div
            className={`flex-1 overflow-y-auto ${settings.viewMode === "text" ? textClasses[settings.theme] : ""}`}
            ref={contentRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseUp={handleMouseUp}
          >
            <div className={`${settings.viewMode === "original" ? "bg-muted/30" : themeClasses[settings.theme]} min-h-full transition-colors`}>
              <div className={`container mx-auto px-4 py-8 ${settings.viewMode === "original" ? "max-w-6xl" : "max-w-4xl"}`}>

                {/* Original View (DOCX or PDF Images) */}
                {settings.viewMode === "original" && (
                  <div className="animate-fade-in mb-8 relative">
                    <div className="space-y-4 flex flex-col items-center">
                      {pages.map((page) => (
                        <Card key={page.id} id={`pdf-page-${page.page_number}`} className="bg-white shadow-2xl overflow-hidden w-full max-w-[800px] border-none">
                          <Image
                            src={page.page_image_url}
                            alt={`Page ${page.page_number}`}
                            width={800}
                            height={1100}
                            className="w-full h-auto"
                            unoptimized
                            priority={page.page_number === pages[currentPageIndex].page_number}
                          />
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reflowable View */}
                {settings.viewMode === "text" && (
                  <div key={currentPageIndex} className="animate-fade-up">
                    <div className={`mx-auto p-8 md:p-12 rounded-lg shadow-xl border border-border/10 transition-all duration-300 ${settings.theme === 'dark' ? 'bg-black/20' : 'bg-white/40'}`} style={{ textAlign: 'center', fontSize: `${settings.fontSize}px`, fontFamily: settings.fontFamily === 'serif' ? 'Georgia, serif' : settings.fontFamily === 'mono' ? 'monospace' : 'system-ui, sans-serif', lineHeight: '1.6' }}>
                      {(() => {
                        const content = currentPage.content || "";

                        // 1. Handle HTML Content (Legacy/DOCX)
                        if (content.trim().startsWith('<')) {
                          return <div className={`prose ${settings.theme === 'dark' ? 'prose-invert' : ''} max-w-none docx-content`} dangerouslySetInnerHTML={{ __html: content }} />;
                        }

                        // 2. Handle JSON Blocks
                        try {
                          const blocks = JSON.parse(content);
                          if (Array.isArray(blocks)) {
                            return blocks.map((block: any, idx: number) => {
                              if (block.type === 'text') return <p key={idx} className="mb-1">{renderTextWithHighlights(block.content)}</p>;
                              if (block.type === 'image') {
                                const illust = bookIllustrations.find(img => img.page_number === currentPage.page_number && img.position_index === block.imageIndex);
                                if (illust) return (
                                  <div key={idx} className="my-0 flex justify-center">
                                    <Image src={illust.image_url} alt="ill" width={600} height={400} className="rounded-lg shadow-lg" unoptimized />
                                  </div>
                                );
                              }
                              return null;
                            });
                          }
                        } catch (e) {
                          // Ignore parse error and fall through to text parsing
                        }

                        // 3. Handle Plain Text with Markdown-style Image Tags
                        const parts = content.split(/(!\[Illustration\]\(.*?\))/g);
                        return parts.map((part, i) => {
                          const match = part.match(/!\[Illustration\]\((.*?)\)/);
                          if (match) {
                            const url = match[1];
                            return (
                              <div key={i} className="my-0 flex justify-center group relative">
                                <img
                                  src={url}
                                  alt="Illustration"
                                  className="rounded-lg shadow-2xl max-w-full h-auto border border-white/10 hover:scale-[1.02] transition-transform duration-300"
                                />
                              </div>
                            );
                          }
                          if (!part.trim()) return null;
                          return <p key={i} className="whitespace-pre-wrap mb-1">{renderTextWithHighlights(part)}</p>;
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Navigation Footer for Reflowable Mode */}
          {settings.viewMode === "text" && (
            <footer className={`h-20 border-t border-border/50 ${themeClasses[settings.theme]} ${textClasses[settings.theme]} bg-opacity-80 backdrop-blur-xl flex-shrink-0 z-40`}>
              <div className="container mx-auto h-full px-6 flex items-center justify-between max-w-4xl">
                <Button
                  variant="ghost"
                  size="lg"
                  className={`font-display tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all active:scale-95 ${textClasses[settings.theme]}`}
                  disabled={currentPageIndex === 0}
                  onClick={() => navigatePage("prev")}
                >
                  <ChevronLeft className="w-5 h-5" />
                  PREV
                </Button>

                <div className="flex flex-col items-center">
                  <span className="font-mono text-sm font-bold tracking-widest">
                    {currentPage.page_number} / {pages.length}
                  </span>
                  <div className="w-32 h-1 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentPageIndex + 1) / pages.length) * 100}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="lg"
                  className={`font-display tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all active:scale-95 ${textClasses[settings.theme]}`}
                  disabled={currentPageIndex === pages.length - 1}
                  onClick={() => navigatePage("next")}
                >
                  NEXT
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </footer>
          )}
        </div>

        {showSettings && (
          <div
            className="w-80 border-l bg-background p-4 animate-in slide-in-from-right overflow-y-auto z-50 shadow-2xl"
            onTouchStart={onPanelTouchStart}
            onTouchEnd={(e) => onPanelTouchEnd(e, () => setShowSettings(false))}
          >
            <ReadingSettingsPanel settings={settings} onSettingsChange={setSettings} />
          </div>
        )}
        {showSidebar && (
          <div
            className="w-80 border-l bg-background p-4 animate-in slide-in-from-right overflow-y-auto z-50 shadow-2xl"
            onTouchStart={onPanelTouchStart}
            onTouchEnd={(e) => onPanelTouchEnd(e, () => setShowSidebar(false))}
          >
            <ReadingSidebar
              bookId={bookId}
              highlights={highlights}
              bookmarks={bookmarks}
              currentPage={currentPage.page_number}
              onHighlightClick={goToPage}
              onBookmarkClick={goToPage}
              onDeleteHighlight={deleteHighlight}
              onDeleteBookmark={deleteBookmark}
            />
          </div>
        )}
      </div>

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm p-6 space-y-4 bg-background border-primary/20 shadow-2xl">
            <div className="flex items-center gap-2">
              <BookmarkIcon className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg tracking-wider">SAVE BOOKMARK</h3>
            </div>
            <Input
              placeholder="Bookmark Label (optional)"
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
              className="bg-muted/50"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowBookmarkDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveBookmark}>Save Bookmark</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Note/Highlight Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md p-6 space-y-4 bg-background border-primary/20 shadow-2xl">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-secondary" />
              <h3 className="font-display text-lg tracking-wider">ADD NOTE</h3>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-sm italic line-clamp-3 opacity-80 border-l-4 border-primary">
              &ldquo;{selectedText}&rdquo;
            </div>

            <div className="flex items-center gap-2 py-2">
              {['yellow', 'green', 'blue', 'pink'].map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${highlightColor === c ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c === 'yellow' ? '#EAB30880' : c === 'green' ? '#22C55E80' : c === 'blue' ? '#3B82F680' : '#EC489980' }}
                  onClick={() => setHighlightColor(c)}
                />
              ))}
            </div>

            <textarea
              placeholder="Enter your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full min-h-[100px] bg-muted/50 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowNoteDialog(false); setSelectedText(""); }}>Cancel</Button>
              <Button onClick={handleSaveNote}>Save Note</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
