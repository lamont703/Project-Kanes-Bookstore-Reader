"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GENRES } from "@/lib/types/book"
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    Filter,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
    Loader
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface AdminBooksContentProps {
    initialBooks: any[]
}

export function AdminBooksContent({ initialBooks }: AdminBooksContentProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedGenre, setSelectedGenre] = useState("All")
    const [sortOrder, setSortOrder] = useState<"title" | "price">("title")
    const [books, setBooks] = useState<any[]>(initialBooks)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [bookToDelete, setBookToDelete] = useState<any | null>(null)
    const [isPurging, setIsPurging] = useState(false)

    const supabase = useMemo(() => createClient(), [])

    const handleDeleteClick = (book: any) => {
        setBookToDelete(book)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!bookToDelete || isPurging) return

        setIsPurging(true)
        const loadingToast = toast.loading(`Commencing cosmic purge for "${bookToDelete.title}"...`)

        try {
            // Storage Cleanup
            const bookId = bookToDelete.id
            const buckets = ["book-pdfs", "book-covers", "book-pages", "book-illustrations"]

            for (const bucket of buckets) {
                const { data: files } = await supabase.storage.from(bucket).list(bookId)
                if (files?.length) {
                    await supabase.storage.from(bucket).remove(files.map(f => `${bookId}/${f.name}`))
                }
            }

            // Database Purge
            const { error: deleteError } = await supabase
                .from("books")
                .delete()
                .eq("id", bookToDelete.id)

            if (deleteError) {
                if (deleteError.code === '23503' || deleteError.message.includes('Conflict')) {
                    await supabase.from("book_club_selections").delete().eq("book_id", bookToDelete.id)
                    await supabase.from("user_library").delete().eq("book_id", bookToDelete.id)
                    await supabase.from("order_items").delete().eq("book_id", bookToDelete.id)

                    const { error: secondTryError } = await supabase.from("books").delete().eq("id", bookToDelete.id)
                    if (secondTryError) throw secondTryError
                } else {
                    throw deleteError
                }
            }

            toast.dismiss(loadingToast)
            toast.success(`${bookToDelete.title} has been purged from reality`)
            setBooks(currentBooks => currentBooks.filter(b => b.id !== bookToDelete.id))
        } catch (err: any) {
            toast.dismiss(loadingToast)
            toast.error(`Purge protocol failed: ${err.message || "Unknown error"}`)
        } finally {
            setIsPurging(false)
            setIsDeleteDialogOpen(false)
            setBookToDelete(null)
        }
    }

    const filteredBooks = books.filter((book) => {
        const matchesSearch =
            searchQuery === "" ||
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
        return matchesSearch && matchesGenre
    }).sort((a: any, b: any) => {
        if (sortOrder === "title") return a.title.localeCompare(b.title)
        if (sortOrder === "price") {
            const aPrice = a.book_variants?.[0]?.price || 0
            const bPrice = b.book_variants?.[0]?.price || 0
            return aPrice - bPrice
        }
        return 0
    })

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
                        <span className="text-primary">CATALOG</span> <span className="text-secondary">MANAGEMENT</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground">{books.length} Komet volumes in the library</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button size="lg" className="font-display tracking-wider text-lg w-full sm:w-auto order-1 sm:order-2" asChild>
                        <Link href="/admin/books/new">
                            <Plus className="w-5 h-5 mr-2" />
                            ADD NEW BOOK
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <Card className="p-4 mb-8 bg-card/30 backdrop-blur border-border/50 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title or author..."
                        className="pl-10 bg-background/50 border-border/50 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
                    <div className="relative">
                        <select
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="appearance-none bg-background/50 border border-border/50 rounded-md px-3 py-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-primary w-full lg:w-48 h-10"
                        >
                            <option value="All">All Categories</option>
                            {GENRES.filter(g => g !== "All").map(genre => (
                                <option key={genre} value={genre}>{genre}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="appearance-none bg-background/50 border border-border/50 rounded-md px-3 py-2 pr-8 text-xs outline-none focus:ring-1 focus:ring-primary w-full lg:w-40 h-10"
                        >
                            <option value="title">Sort by Title</option>
                            <option value="price">Sort by Price</option>
                        </select>
                        <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </Card>

            {/* Table Section */}
            <Card className="overflow-hidden bg-card/50 backdrop-blur border-border/50">
                <div className="overflow-x-auto">
                    {books.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30 text-left">
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Volume</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Details</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Category</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Inventory</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Status</th>
                                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredBooks.map((book) => (
                                    <tr
                                        key={book.id}
                                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4">
                                            <div className="relative w-14 h-20 rounded shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                                <Image
                                                    src={book.coverImage || "/placeholder.svg"}
                                                    alt={book.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-display text-lg md:text-xl tracking-wide group-hover:text-primary transition-colors leading-tight">{book.title}</p>
                                            <p className="text-xs text-muted-foreground">By {book.author}</p>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded">
                                                {book.genre}
                                            </span>
                                        </td>
                                        <td className="p-4 hidden sm:table-cell">
                                            <span className="text-sm md:text-lg font-medium">${book.price}</span>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className={`flex items-center gap-1.5 ${book.catalogStatus === "Published" ? "text-primary" : "text-muted-foreground"}`}>
                                                {book.catalogStatus === "Published" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                <span className="text-[10px] font-semibold uppercase">{book.catalogStatus}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" asChild>
                                                    <Link href={`/book/${book.id}`} target="_blank">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-secondary hover:bg-secondary/10" asChild>
                                                    <Link href={`/admin/books/${book.id}/edit`}>
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteClick(book)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-70">
                            <h3 className="font-display text-3xl tracking-wide mb-2">NO DATA FOUND</h3>
                        </div>
                    )}
                </div>
            </Card>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md border-primary/20 bg-card/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl tracking-wider text-primary">DELETION CONFIRMATION</DialogTitle>
                        <DialogDescription className="text-lg">
                            Are you sure you want to purge <span className="text-foreground font-bold italic">"{bookToDelete?.title}"</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={isPurging}>Abort Mission</Button>
                        <Button
                            variant="destructive"
                            className="font-display tracking-widest min-w-[140px]"
                            onClick={confirmDelete}
                            disabled={isPurging}
                        >
                            {isPurging ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : "PURGE VOLUME"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
