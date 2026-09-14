"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GENRES } from "@/lib/types/book"
import type { Book } from "@/lib/types/book"
import { UploadCloud, FileText, ImageIcon, Loader, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

interface BookFormProps {
    initialData?: any
    isEdit?: boolean
    /** Whether this viewer may delete the book. False for employees — see lib/roles.ts. */
    canDelete?: boolean
}

export function BookForm({ initialData, isEdit, canDelete = true }: BookFormProps) {
    // Categories are rows now, not a constant, so a category added from the
    // browse editor is immediately selectable here. Seeded with the old
    // constant so the field is never empty while the request is in flight.
    const [genres, setGenres] = useState<string[]>(
        [...GENRES].filter((g) => g !== "All"),
    )
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from("book_genres")
                .select("name")
                .eq("is_active", true)
                .order("sort_order")
                .order("name")
            if (cancelled) return
            if (error) return console.error("Could not load categories:", error.message)
            if (data?.length) setGenres(data.map((row: { name: string }) => row.name))
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Memoize supabase client to avoid recreation on every render
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Form State
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        author: initialData?.author || "",
        illustrator: initialData?.illustrator || "",
        description: initialData?.description || "",
        genre: initialData?.genre || "Crime",
        price: initialData?.price || 0,
        status: initialData?.status || "Draft",
        is_book_club_eligible: initialData?.is_book_club_eligible || false,
        is_age_restricted: initialData?.is_age_restricted || false,
        variants: initialData?.book_variants || [
            { format: "ebook" as const, price: 0, available: true },
            { format: "paper_book" as const, price: 0, available: true },
            { format: "komet_card" as const, price: 0, available: true },
        ]
    })

    const [files, setFiles] = useState<{
        cover: File | null
        bookFile: File | null
    }>({
        cover: null,
        bookFile: null
    })

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.title) newErrors.title = "Title is required"
        if (!formData.author) newErrors.author = "Author is required"
        if (!formData.description) newErrors.description = "Description is required"

        formData.variants.forEach((v: any) => {
            if ((formData.status === "Published" || v.available) && v.price <= 0) {
                newErrors[`price_${v.format}`] = `${v.format.replace('_', ' ')} price must be greater than 0`
            }
        })

        if (!isEdit) {
            if (!files.cover) newErrors.cover = "Cover image is required"
            if (!files.bookFile) newErrors.bookFile = "Book PDF file is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "bookFile") => {
        const file = e.target.files?.[0]
        if (file) {
            // Basic type validation
            if (type === "cover" && !file.type.startsWith("image/")) {
                toast.error("Please upload an image file (PNG/JPG)")
                return
            }
            if (type === "bookFile") {
                const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

                if (!isPdf) {
                    toast.error("Please upload a .pdf file")
                    return
                }
            }

            setFiles(prev => ({ ...prev, [type]: file }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log("[BookForm] Starting submit...")

        const isValid = validate()
        console.log("[BookForm] Validation result:", isValid, errors)
        if (!isValid) {
            toast.error("Please fix the errors in the form")
            return
        }

        setIsUploading(true)
        console.log("[BookForm] isUploading set to true, preparing FormData...")

        let bookId: string | null = null

        try {
            // 1. Prepare FormData for the Edge Function
            const uploadData = new FormData()
            if (files.bookFile) uploadData.append("book_file", files.bookFile)
            if (files.cover) uploadData.append("cover_file", files.cover)

            if (isEdit && initialData?.id) {
                uploadData.append("id", initialData.id)
            }

            uploadData.append("title", formData.title)
            uploadData.append("author", formData.author)
            uploadData.append("illustrator", formData.illustrator || "")
            uploadData.append("description", formData.description)
            uploadData.append("genre", formData.genre)
            uploadData.append("status", formData.status === "Published" ? "published" : "draft")
            uploadData.append("is_book_club_eligible", String(formData.is_book_club_eligible))
            uploadData.append("is_age_restricted", String(formData.is_age_restricted))

            // Pricing
            const ebook = formData.variants.find((v: any) => v.format === "ebook")
            const paper = formData.variants.find((v: any) => v.format === "paper_book")
            const card = formData.variants.find((v: any) => v.format === "komet_card")

            uploadData.append("ebook_price", String(ebook?.price || 0))
            uploadData.append("ebook_available", String(ebook?.available ?? true))
            uploadData.append("paper_price", String(paper?.price || 0))
            uploadData.append("paper_available", String(paper?.available ?? true))
            uploadData.append("komet_card_price", String(card?.price || 0))
            uploadData.append("komet_card_available", String(card?.available ?? true))

            // 2. Invoke the 'upload-book' Edge Function
            console.log("[BookForm] Preparing to invoke Edge Function...")

            const supabaseUrl = SUPABASE_URL
            if (!supabaseUrl) {
                console.error("[BookForm] CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing!")
            }

            console.log("[BookForm] Verifying user...")

            const { data: { user }, error: authErr } = await supabase.auth.getUser()

            if (authErr) {
                console.error("[BookForm] Auth error:", authErr)
                throw new Error(`Authentication failed: ${authErr.message}`)
            }

            if (!user) {
                console.error("[BookForm] No user returned!")
                throw new Error("No active session found. Please refresh and log in again.")
            }

            // Still need the session for the raw token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error("User verified but session token missing.")
            }

            console.log("[BookForm] Auth verified! User:", user.email)

            console.log("[BookForm] Session found! Token length:", session.access_token.length)
            console.log("[BookForm] Invoking Edge Function at:", `${supabaseUrl}/functions/v1/upload-book`)

            const functionUrl = `${SUPABASE_URL}/functions/v1/upload-book`
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: SUPABASE_ANON_KEY,
                },
                body: uploadData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: `Status ${response.status}` } }))
                throw new Error(errorData.error?.message || "Cosmic processing failed")
            }

            toast.success(isEdit ? "Volume updated successfully" : "New volume added to the cosmic library!")
            router.push("/admin/books")
        } catch (err: any) {
            console.error("Upload error:", err)
            toast.error(err.message || "Failed to upload volume")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!canDelete) return
        if (!initialData?.id) return

        const loadingToast = toast.loading(`Commencing cosmic purge for "${formData.title}"...`)

        try {
            const bookId = initialData.id

            // 1. Storage Cleanup
            try {
                // PDFs
                const { data: pdfFiles } = await supabase.storage.from("book-pdfs").list(bookId)
                if (pdfFiles?.length) {
                    await supabase.storage.from("book-pdfs").remove(pdfFiles.map(f => `${bookId}/${f.name}`))
                }

                // Cover
                const { data: coverFiles } = await supabase.storage.from("book-covers").list(bookId)
                if (coverFiles?.length) {
                    await supabase.storage.from("book-covers").remove(coverFiles.map(f => `${bookId}/${f.name}`))
                }

                // Pages
                const { data: pageFiles } = await supabase.storage.from("book-pages").list(bookId)
                if (pageFiles?.length) {
                    await supabase.storage.from("book-pages").remove(pageFiles.map(f => `${bookId}/${f.name}`))
                }

                // Illustrations
                const { data: illustrationFiles } = await supabase.storage.from("book-illustrations").list(bookId)
                if (illustrationFiles?.length) {
                    await supabase.storage.from("book-illustrations").remove(illustrationFiles.map(f => `${bookId}/${f.name}`))
                }
            } catch (storageErr) {
                console.warn("Partial storage cleanup", storageErr)
            }

            // 2. Database Purge
            const { error: deleteError } = await supabase
                .from("books")
                .delete()
                .eq("id", bookId)

            if (deleteError) {
                if (deleteError.code === '23503' || deleteError.message.includes('Conflict')) {
                    console.log("RESTRICT violation detected. Attempting manual dependency cleanup...")
                    await supabase.from("book_club_selections").delete().eq("book_id", bookId)
                    await supabase.from("user_library").delete().eq("book_id", bookId)
                    await supabase.from("order_items").delete().eq("book_id", bookId)

                    const { error: secondTryError } = await supabase
                        .from("books")
                        .delete()
                        .eq("id", bookId)

                    if (secondTryError) throw secondTryError
                } else {
                    throw deleteError
                }
            }

            toast.dismiss(loadingToast)
            toast.success("Volume purged from the cosmic records")
            router.push("/admin/books")
        } catch (err: any) {
            toast.dismiss(loadingToast)
            console.error("Purge failure:", err)
            toast.error(`Purge protocol failed: ${err.message || "Unknown error"}`)
        } finally {
            setIsDeleteDialogOpen(false)
        }
    }

    if (!isMounted) return null

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Metadata */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-5 md:p-8 bg-card/50 backdrop-blur border-border/50">
                        <h2 className="font-display text-2xl tracking-wide mb-6">BASIC INFORMATION</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Book Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., The Martian Chronicles"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className={errors.title ? "border-destructive" : ""}
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="author">Author</Label>
                                    <Input
                                        id="author"
                                        placeholder="Ray Bradbury"
                                        value={formData.author}
                                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                                        className={errors.author ? "border-destructive" : ""}
                                    />
                                    {errors.author && <p className="text-xs text-destructive">{errors.author}</p>}
                                </div>

                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="genre">Category</Label>
                                    <select
                                        id="genre"
                                        className="w-full bg-background/50 border border-border/50 rounded-md px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary h-10"
                                        value={formData.genre}
                                        onChange={e => setFormData({ ...formData, genre: e.target.value })}
                                    >
                                        {genres.map(genre => (
                                            <option key={genre} value={genre}>{genre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Base Reference Price ($)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price || ""}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">This price serves as a general reference for internal logging.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="A brief summary of the cosmic journey..."
                                    className={`h-32 ${errors.description ? "border-destructive" : ""}`}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 md:p-8 bg-card/50 backdrop-blur border-border/50">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-display text-2xl tracking-wide">VARIANT PRICING & INVENTORY</h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20">
                                <AlertCircle className="w-4 h-4 text-secondary" />
                                <span className="text-[10px] font-bold uppercase text-secondary">Prices specific to format</span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {formData.variants.map((variant: any, index: number) => (
                                <div key={variant.format} className="flex flex-col md:flex-row md:items-end gap-6 p-6 rounded-2xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-all group">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Label className="uppercase tracking-widest text-[10px] font-black text-muted-foreground">
                                                {variant.format === "ebook" ? "Digital Edition" : variant.format === "paper_book" ? "Physical Copy" : "Komet Card"}
                                            </Label>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-display text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={variant.price || ""}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants]
                                                    newVariants[index].price = parseFloat(e.target.value) || 0
                                                    setFormData({ ...formData, variants: newVariants })
                                                }}
                                                className={`pl-9 h-14 text-xl font-display bg-background/50 ${errors[`price_${variant.format}`] ? "border-destructive shadow-[0_0_10px_rgba(239,68,68,0.1)]" : "focus:border-primary"}`}
                                            />
                                        </div>
                                        {errors[`price_${variant.format}`] && (
                                            <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{errors[`price_${variant.format}`]}</p>
                                        )}
                                    </div>
                                    <div className={`flex items-center gap-4 h-14 px-5 rounded-xl border transition-all ${variant.available ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20 opacity-60"}`}>
                                        <div className="space-y-0.5">
                                            <Label htmlFor={`available-${variant.format}`} className="text-[10px] font-black uppercase tracking-widest cursor-pointer block leading-none">
                                                Availability
                                            </Label>
                                            <span className={`text-xs font-medium ${variant.available ? "text-primary" : "text-destructive"}`}>
                                                {variant.available ? "IN STOCK" : "OUT OF STOCK"}
                                            </span>
                                        </div>
                                        <Switch
                                            id={`available-${variant.format}`}
                                            checked={variant.available}
                                            onCheckedChange={(checked) => {
                                                const newVariants = [...formData.variants]
                                                newVariants[index].available = checked
                                                setFormData({ ...formData, variants: newVariants })
                                            }}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-5 md:p-8 bg-card/50 backdrop-blur border-border/50">
                        <h2 className="font-display text-2xl tracking-wide mb-6">FILE ASSETS</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>{isEdit ? "Update Cover Image (Optional)" : "Cover Image (PNG/JPG)"}</Label>
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileChange(e, "cover")}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${files.cover ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/30"}`}>
                                        {files.cover ? (
                                            <>
                                                <ImageIcon className="w-10 h-10 text-primary mb-2" />
                                                <p className="text-sm font-medium px-4 text-center truncate w-full">{files.cover.name}</p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                                                <p className="text-xs text-muted-foreground">Select Cover</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {errors.cover && <p className="text-xs text-destructive mt-2">{errors.cover}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>{isEdit ? "Update Book PDF (Optional)" : "Book PDF"}</Label>
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={e => handleFileChange(e, "bookFile")}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${files.bookFile ? "border-secondary/50 bg-secondary/5" : "border-border/50 hover:border-secondary/30"}`}>
                                        {files.bookFile ? (
                                            <>
                                                <FileText className="w-10 h-10 text-secondary mb-2" />
                                                <p className="text-sm font-medium px-4 text-center truncate w-full">{files.bookFile.name}</p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                                                <p className="text-xs text-muted-foreground">Select PDF Volume</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {errors.bookFile && <p className="text-xs text-destructive mt-2">{errors.bookFile}</p>}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Settings */}
                <div className="space-y-6">
                    <Card className="p-5 md:p-8 bg-card/50 backdrop-blur border-border/50 lg:sticky lg:top-24">
                        <h2 className="font-display text-2xl tracking-wide mb-6">PUBLISHING</h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Visibility</Label>
                                    <p className="text-xs text-muted-foreground">Make this book public in the catalog</p>
                                </div>
                                <Switch
                                    checked={formData.status === "Published"}
                                    onCheckedChange={checked => setFormData({ ...formData, status: checked ? "Published" : "Draft" })}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border/50">
                                <div className="space-y-0.5">
                                    <Label>Book Club Eligible</Label>
                                    <p className="text-xs text-muted-foreground">Include this in the 2nd step of the subscription signup flow</p>
                                </div>
                                <Switch
                                    checked={formData.is_book_club_eligible}
                                    onCheckedChange={checked => setFormData({ ...formData, is_book_club_eligible: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border/50">
                                <div className="space-y-0.5">
                                    <Label>Age Restricted (18+)</Label>
                                    <p className="text-xs text-muted-foreground">Restrict this book to adult users only</p>
                                </div>
                                <Switch
                                    checked={formData.is_age_restricted}
                                    onCheckedChange={checked => setFormData({ ...formData, is_age_restricted: checked })}
                                />
                            </div>

                            {isEdit && (
                                <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 text-xs text-muted-foreground">
                                    <p className="font-bold text-secondary mb-1">EDIT MODE ACTIVE</p>
                                    <p>File assets (Book File/Cover) are optional. Only upload if you wish to replace the current versions in the library.</p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-border/50 space-y-3">
                                <Button
                                    type="submit"
                                    className="w-full text-lg font-display tracking-wider h-12"
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                    {isEdit ? "UPDATE VOLUME" : "CREATE VOLUME"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-muted-foreground hover:text-foreground"
                                    onClick={() => router.push("/admin/books")}
                                >
                                    Cancel
                                </Button>
                            </div>

                            {isEdit && canDelete && (
                                <div className="pt-6 border-t border-border/50">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-destructive hover:text-white hover:bg-destructive"
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                    >
                                        Delete Book permanently
                                    </Button>

                                    {/* Delete Confirmation Modal */}
                                    {isDeleteDialogOpen && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                            <Card className="max-w-md w-full border-primary/20 bg-card/95 p-6 animate-in zoom-in-95 duration-200">
                                                <h3 className="font-display text-3xl tracking-wider text-primary mb-2">PURGE INITIATION</h3>
                                                <p className="text-muted-foreground mb-6">
                                                    Are you sure you want to permanently purge <span className="text-foreground font-bold italic">"{formData.title}"</span>? This will wipe all files, variants, and related history from the cosmic library.
                                                </p>
                                                <div className="flex gap-3 justify-end">
                                                    <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>ABORT</Button>
                                                    <Button variant="destructive" className="font-display tracking-widest" onClick={handleDelete}>CONFIRM PURGE</Button>
                                                </div>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </form>
    )
}
