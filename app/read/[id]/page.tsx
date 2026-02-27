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
import type { Highlight, Bookmark } from "@/lib/types/reader"
import {
  saveSettings,
  getSettings,
  defaultSettings,
  type ReadingSettings,
} from "@/lib/reading-storage"
import * as docx from "docx-preview"
import jszip from "jszip"

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
  const supabase = createClient()

  // Data state
  const [pages, setPages] = useState<BookPage[]>([])
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null)
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null)
  const [docxError, setDocxError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reader state
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings)
  const [isMounted, setIsMounted] = useState(false)

  const docxContainerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsMounted(true)
    setSettings(getSettings())
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
      setDocxError(null)

      try {
        // Fetch book metadata
        const { data: book, error: bookErr } = await supabase
          .from("books")
          .select("id, title, author, book_file_url")
          .eq("id", bookId)
          .single()

        if (bookErr) throw new Error("Book not found")
        setBookMeta(book)

        // Fetch docx blob for original view
        if (book.book_file_url) {
          try {
            // Use absolute fetch but catch errors specifically
            const resp = await fetch(book.book_file_url, { mode: 'cors' })
            if (resp.ok) {
              const blob = await resp.blob()
              setDocxBlob(blob)
            } else {
              setDocxError(`Failed to download file (Status: ${resp.status})`)
            }
          } catch (e: any) {
            console.error("[reader] DOCX Fetch Error:", e)
            setDocxError("CORS or Connection Error. Make sure to deploy to Vercel and re-upload.")
          }
        } else {
          setDocxError("No original Word file associated with this book.")
        }

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

  // ─── Render Original DOCX ───────────────────────────────────
  // We use a small timeout to ensure the DOM node is ready
  useEffect(() => {
    if (settings.viewMode === "original" && docxBlob) {
      const render = async () => {
        // Wait a tick for the container ref to become available
        await new Promise(resolve => setTimeout(resolve, 100))

        if (docxContainerRef.current) {
          try {
            docxContainerRef.current.innerHTML = "" // Clear previous
            await docx.renderAsync(docxBlob, docxContainerRef.current, undefined, {
              ignoreWidth: false,
              ignoreHeight: false,
              debug: false,
              className: "docx-rendered-content"
            })
          } catch (err) {
            console.error("[reader] DOCX rendering failed:", err)
            setDocxError("Could not render the document structure.")
          }
        }
      }
      render()
    }
  }, [settings.viewMode, docxBlob])

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
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPageIndex > 0) setCurrentPageIndex((prev) => prev - 1)
    else if (direction === "next" && currentPageIndex < pages.length - 1) setCurrentPageIndex((prev) => prev + 1)
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
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
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="border-b border-border bg-background/80 backdrop-blur z-50 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/browse" className="flex items-center gap-2">
              <Image src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png" width={24} height={24} alt="log" className="w-6 h-6 rounded" />
              <span className="font-display text-xl tracking-wider text-primary">KANE&apos;S KOMETS</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}><Settings className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>{showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className={`${settings.viewMode === "original" ? "bg-muted/30" : themeClasses[settings.theme]} min-h-full transition-colors`}>
            <div className={`container mx-auto px-4 py-8 ${settings.viewMode === "original" ? "max-w-6xl" : "max-w-4xl"}`}>

              {/* Original View */}
              {settings.viewMode === "original" && (
                <div className="animate-fade-in mb-8">
                  {docxError ? (
                    <Card className="p-12 text-center bg-white border-destructive/20 shadow-xl">
                      <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Original View Unavailable</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">{docxError}</p>
                      <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Retry Sync</Button>
                    </Card>
                  ) : !docxBlob ? (
                    <Card className="p-20 text-center bg-white shadow-xl">
                      <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground font-mono">DOWNLOADING ORIGINAL LAYOUT...</p>
                    </Card>
                  ) : (
                    <Card className="bg-white shadow-2xl overflow-hidden mx-auto min-h-[80vh] border-none">
                      <div ref={docxContainerRef} className="docx-viewer-container" />
                    </Card>
                  )}
                </div>
              )}

              {/* Reflowable View */}
              {settings.viewMode === "text" && (
                <div key={currentPageIndex} className="animate-fade-up">
                  <div className={`mx-auto p-8 md:p-12 rounded-lg shadow-xl border border-border/10 transition-all duration-300 ${settings.theme === 'dark' ? 'bg-black/20' : 'bg-white/40'}`} style={{ fontSize: `${settings.fontSize}px`, fontFamily: settings.fontFamily === 'serif' ? 'Georgia, serif' : settings.fontFamily === 'mono' ? 'monospace' : 'system-ui, sans-serif', lineHeight: '1.6' }}>
                    {(() => {
                      const content = currentPage.content || "";
                      if (content.trim().startsWith('<')) return <div className="prose prose-invert max-w-none docx-content" dangerouslySetInnerHTML={{ __html: content }} />;
                      try {
                        const blocks = JSON.parse(content || "[]");
                        return blocks.map((block: any, idx: number) => {
                          if (block.type === 'text') return <p key={idx} className="mb-6">{block.content}</p>;
                          if (block.type === 'image') {
                            const illust = bookIllustrations.find(img => img.page_number === currentPage.page_number && img.position_index === block.imageIndex);
                            if (illust) return <div key={idx} className="my-8 flex justify-center"><Image src={illust.image_url} alt="ill" width={600} height={400} className="rounded-lg shadow-lg" unoptimized /></div>;
                          }
                          return null;
                        });
                      } catch { return <p className="whitespace-pre-wrap">{content}</p>; }
                    })()}
                  </div>
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
                    <Button variant="outline" disabled={currentPageIndex === 0} onClick={() => navigatePage("prev")}>Prev</Button>
                    <span className="font-mono text-sm">{currentPage.page_number} / {pages.length}</span>
                    <Button variant="outline" disabled={currentPageIndex === pages.length - 1} onClick={() => navigatePage("next")}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showSettings && <div className="w-80 border-l bg-background p-4 animate-in slide-in-from-right"><ReadingSettingsPanel settings={settings} onSettingsChange={setSettings} /></div>}
        {showSidebar && <div className="w-80 border-l bg-background p-4 animate-in slide-in-from-right"><ReadingSidebar bookId={bookId} highlights={highlights} bookmarks={bookmarks} currentPage={currentPage.page_number} onHighlightClick={goToPage} onBookmarkClick={goToPage} onDeleteHighlight={() => { }} onDeleteBookmark={() => { }} /></div>}
      </div>
    </div>
  )
}
