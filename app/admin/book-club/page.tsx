"use client"

import { useState } from "react"
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
  ArrowRight
} from "lucide-react"
import Image from "next/image"
import { mockBookClubSelections, type BookClubSelection } from "@/lib/mock-book-club-data"
import { mockBooks, type Book } from "@/lib/mock-books"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function AdminBookClubPage() {
  const [selections, setSelections] = useState(mockBookClubSelections)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // State for the "New Selection" form
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectionMonth, setSelectionMonth] = useState("February")
  const [selectionYear, setSelectionYear] = useState(2025)
  const [selectionTheme, setSelectionTheme] = useState("")
  const [selectionDesc, setSelectionDesc] = useState("")

  const currentSelection = selections.find(s => s.status === "current")
  const currentBook = mockBooks.find(b => b.id === currentSelection?.bookId)

  const filteredBooks = mockBooks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveSelection = () => {
    if (!selectedBook) {
      toast.error("Please select a volume for the mission")
      return
    }

    toast.success(`${selectedBook.title} is now the featured volume for ${selectionMonth} ${selectionYear}`)
    setIsModalOpen(false)

    // Reset form
    setSelectedBook(null)
    setSelectionTheme("")
    setSelectionDesc("")
  }

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
        <Button size="lg" className="font-display tracking-wider text-lg w-full md:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          NEW FEATURED VOLUME
        </Button>
      </div>

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
                  src={currentBook.coverImage || "/placeholder.svg"}
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
                  <Button variant="outline" className="border-border/50 hover:bg-white/5 w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
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
            <Button onClick={() => setIsModalOpen(true)}>Initialize Selection</Button>
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
            const book = mockBooks.find((b) => b.id === selection.bookId)
            if (!book) return null

            return (
              <Card key={selection.id} className="p-3 md:p-4 bg-background border-border/50 hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-10 h-14 md:w-12 md:h-18 relative rounded overflow-hidden flex-shrink-0 shadow-lg">
                    <Image
                      src={book.coverImage || "/placeholder.svg"}
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
                      <span className={`text-[8px] font-black tracking-tighter px-1.5 py-0.5 rounded border ${selection.status === "upcoming" ? "border-secondary/30 text-secondary" : "border-muted/30 text-muted-foreground"
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Change Selection Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-primary/20 bg-background/95 backdrop-blur-xl">
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
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs bg-muted/20 border-border/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => setSelectedBook(book)}
                    className={`relative p-2 rounded-lg cursor-pointer transition-all border-2 ${selectedBook?.id === book.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/10 hover:bg-muted/30"
                      }`}
                  >
                    <div className="aspect-[3/4] relative rounded overflow-hidden mb-2">
                      <Image src={book.coverImage} alt={book.title} fill className="object-cover" />
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
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
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
                {selectedBook ? (
                  <div className="text-xs text-muted-foreground italic">
                    "{selectedBook.title}" will be deployed as the {selectionMonth} flagship.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No volume selected...</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Abort Mission</Button>
            <Button className="font-display tracking-widest px-8" onClick={handleSaveSelection}>
              SAVE SELECTION <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

