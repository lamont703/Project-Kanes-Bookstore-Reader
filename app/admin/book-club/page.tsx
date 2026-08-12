"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Search,
  Check,
  Star,
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { getCurrentStatus, MONTHS, sortSelections } from "@/lib/book-club-utils"

// ─── Types ─────────────────────────────────────────────────────
interface Book {
  id: string
  title: string
  author: string
  cover_image_url: string
}

interface Selection {
  id: string
  book_id: string
  month: string
  year: number
  theme: string
  description: string
  status: "current" | "past" | "upcoming"
  books: Book
}

// ─── Component ─────────────────────────────────────────────────
export default function AdminBookClubPage() {
  const [isMounted, setIsMounted] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const [selections, setSelections] = useState<Selection[]>([])
  const [availableBooks, setAvailableBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Form State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectionMonth, setSelectionMonth] = useState(new Date().toLocaleString('default', { month: 'long' }))
  const [selectionYear, setSelectionYear] = useState(new Date().getFullYear())
  const [selectionTheme, setSelectionTheme] = useState("")
  const [selectionDesc, setSelectionDesc] = useState("")
  const [isEditing, setIsEditing] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      // 1. Fetch Selections
      const res = await fetch("/api/admin/book-club")
      const { selections: data } = await res.json()
      setSelections(data || [])

      // 2. Fetch Books for picker
      const { data: books } = await supabase
        .from('books')
        .select('id, title, author, cover_image_url')
        .eq('status', 'published')
        .eq('product_type', 'book')
        .order('title')

      setAvailableBooks(books || [])
    } catch (err) {
      toast.error("Failed to fetch cosmic data")
    } finally {
      setIsLoading(false)
    }
  }

  const currentSelection = selections.find(s => s.status === "current")
  const currentBook = currentSelection?.books

  const filteredBooks = availableBooks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (s: Selection) => {
    setIsEditing(s.id)
    setSelectedBook(s.books)
    setSelectionMonth(s.month)
    setSelectionYear(s.year)
    setSelectionTheme(s.theme)
    setSelectionDesc(s.description)
    setIsModalOpen(true)
  }

  const handleSaveSelection = async () => {
    if (!selectedBook) {
      toast.error("Please select a volume for the mission")
      return
    }

    setIsSaving(true)
    try {
      const status = getCurrentStatus(selectionMonth, selectionYear)

      const res = await fetch("/api/admin/book-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: selectedBook.id,
          month: selectionMonth,
          year: selectionYear,
          theme: selectionTheme,
          description: selectionDesc,
          status: status
        })
      })

      if (!res.ok) throw new Error("Save failed")

      toast.success(`${selectedBook.title} selection saved successfully`)
      setIsModalOpen(false)
      fetchData() // Refresh
      resetForm()
    } catch (err) {
      toast.error("Vortex interference: Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to purge this record from historical archives?")) return

    try {
      const res = await fetch(`/api/admin/book-club?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")

      toast.success("Selection purged")
      setSelections(selections.filter(s => s.id !== id))
    } catch (err) {
      toast.error("Failed to delete record")
    }
  }

  const resetForm = () => {
    setIsEditing(null)
    setSelectedBook(null)
    setSelectionTheme("")
    setSelectionDesc("")
    setSelectionMonth(new Date().toLocaleString('default', { month: 'long' }))
    setSelectionYear(new Date().getFullYear())
  }

  const statusPreview = getCurrentStatus(selectionMonth, selectionYear)

  if (!isMounted) return null

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="text-center md:text-left">
          <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
            <span className="text-primary">MONTHLY</span> <span className="text-secondary">SELECTION</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">Curate the featured reading experience for the community</p>
        </div>
        <Button size="lg" className="font-display tracking-wider text-lg w-full md:w-auto" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          NEW FEATURED VOLUME
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Active Selection Highlight */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-secondary fill-secondary" />
              <h2 className="font-display text-2xl tracking-wide uppercase">Active Galactic Mission</h2>
            </div>

            {currentSelection && currentBook ? (
              <Card className="overflow-hidden border-secondary/30 bg-secondary/5 backdrop-blur-md relative transform hover:scale-[1.01] transition-all duration-300">
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-secondary text-secondary-foreground px-4 py-1 font-display tracking-widest text-sm rounded-bl-lg">
                    CURRENT
                  </div>
                </div>

                <div className="grid md:grid-cols-[250px_1fr] gap-6 md:gap-8 p-6 md:p-8">
                  <div className="relative aspect-[3/4] shadow-2xl rounded-lg overflow-hidden border border-white/10 max-w-[200px] mx-auto md:max-w-none w-full">
                    <Image
                      src={currentBook.cover_image_url || "/placeholder.webp"}
                      alt={currentBook.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col justify-center space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                      <p className="text-[10px] md:text-sm font-bold text-secondary uppercase tracking-[0.2em]">
                        {currentSelection.month} {currentSelection.year} Selection
                      </p>
                      <h3 className="font-display text-3xl md:text-4xl lg:text-6xl tracking-wider text-white leading-tight">
                        {currentBook.title}
                      </h3>
                      <p className="text-xl md:text-2xl text-muted-foreground">by {currentBook.author}</p>
                    </div>

                    <div className="space-y-2 max-w-2xl mx-auto md:mx-0">
                      <p className="text-secondary font-display text-lg md:text-xl tracking-wide uppercase italic">
                        Theme: {currentSelection.theme}
                      </p>
                      <p className="text-base md:text-lg text-muted-foreground leading-relaxed line-clamp-4 md:line-clamp-none">
                        {currentSelection.description}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button variant="outline" className="border-border/50 hover:bg-white/5 w-full sm:w-auto" onClick={() => handleEdit(currentSelection)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modify Payload
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 border-dashed border-2 border-border/50 bg-card/10 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-display text-3xl tracking-wide mb-2 uppercase">Vortex Empty</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  No featured volume has been assigned to the current cycle.
                </p>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>Initialize Selection</Button>
              </Card>
            )}
          </section>

          {/* History List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl tracking-wide uppercase">Mission Logs</h2>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Showing all past and upcoming</span>
            </div>

            <div className="grid gap-4">
              {selections.filter(s => s.status !== "current").map((selection) => {
                const book = selection.books
                if (!book) return null

                return (
                  <Card key={selection.id} className="p-3 md:p-4 bg-background border-border/50 hover:border-primary/30 transition-colors group">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-10 h-14 md:w-12 md:h-18 relative rounded overflow-hidden flex-shrink-0 shadow-lg bg-muted/20">
                        <Image
                          src={book.cover_image_url || "/placeholder.webp"}
                          alt={book.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {selection.month} {selection.year}
                          </span>
                          <span className={`text-[8px] font-black tracking-tighter px-1.5 py-0.5 rounded border ${selection.status === "upcoming" ? "border-secondary/30 text-secondary" :
                            selection.status === "past" ? "border-muted/30 text-muted-foreground" : "border-primary/30 text-primary"
                            }`}>
                            {selection.status.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-display text-lg md:text-xl tracking-wide truncate group-hover:text-primary transition-colors">
                          {book.title}
                        </h4>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{selection.theme}</p>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(selection)}>
                          <Edit className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(selection.id)}>
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
              {selections.filter(s => s.status !== "current").length === 0 && (
                <div className="text-center py-8 text-muted-foreground italic">No historical archives found</div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Change Selection Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-primary/20 bg-background/95 backdrop-blur-xl pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-4xl tracking-wider uppercase text-primary">Deploy Featured Volume</DialogTitle>
            <DialogDescription className="text-lg">Set the reading target for the next cosmic cycle.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-8 py-6">
            {/* Left: Book Picker */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-primary uppercase tracking-widest text-xs font-bold">1. Select Volume</Label>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Search catalog..."
                    className="h-8 pl-8 text-xs bg-muted/20 border-border/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredBooks.length === 0 ? (
                  <div className="col-span-2 text-center py-20 text-muted-foreground italic">No volumes found in catalog</div>
                ) : filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => setSelectedBook(book)}
                    className={`relative p-2 rounded-lg cursor-pointer transition-all border-2 ${selectedBook?.id === book.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/10 hover:bg-muted/30"
                      }`}
                  >
                    <div className="aspect-[3/4] relative rounded overflow-hidden mb-2 bg-muted/20">
                      <Image src={book.cover_image_url || "/placeholder.webp"} alt={book.title} fill className="object-cover" />
                      {selectedBook?.id === book.id && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase truncate">{book.title}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{book.author}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Metadata */}
            <div className="space-y-6">
              <Label className="text-primary uppercase tracking-widest text-xs font-bold">2. Mission Details</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month" className="text-xs">Target Month</Label>
                  <select
                    id="month"
                    className="w-full bg-muted/20 border border-border/30 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary h-9"
                    value={selectionMonth}
                    onChange={(e) => setSelectionMonth(e.target.value)}
                  >
                    {MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-xs">Target Year</Label>
                  <Input
                    id="year"
                    type="number"
                    className="h-9 bg-muted/20 border-border/30"
                    value={selectionYear}
                    onChange={(e) => setSelectionYear(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="text-xs">Mission Theme</Label>
                <Input
                  id="theme"
                  placeholder="e.g., Cyberpunk Dystopias"
                  className="bg-muted/20 border-border/30"
                  value={selectionTheme}
                  onChange={(e) => setSelectionTheme(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs">Mission Brief</Label>
                <Textarea
                  id="desc"
                  placeholder="Tell the readers why this volume was chosen..."
                  className="h-32 bg-muted/20 border-border/30"
                  value={selectionDesc}
                  onChange={(e) => setSelectionDesc(e.target.value)}
                />
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Preview Summary</span>
                </div>
                <div className="flex flex-col gap-1">
                  {selectedBook ? (
                    <div className="text-xs text-muted-foreground italic">
                      "{selectedBook.title}" will be deployed for {selectionMonth} {selectionYear}.
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No volume selected...</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Calculated Status:</span>
                    <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${statusPreview === 'current' ? 'bg-primary text-primary-foreground' :
                      statusPreview === 'upcoming' ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                      {statusPreview.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Abort Mission</Button>
            <Button className="font-display tracking-widest px-8" onClick={handleSaveSelection} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              SAVE SELECTION <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
