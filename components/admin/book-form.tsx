"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GENRES, type Book } from "@/lib/mock-books"
import { UploadCloud, FileText, ImageIcon, Loader, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

interface BookFormProps {
    initialData?: any
    isEdit?: boolean
}

export function BookForm({ initialData, isEdit }: BookFormProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const supabase = createClient()

    // Form State
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        author: initialData?.author || "",
        illustrator: initialData?.illustrator || "",
        description: initialData?.description || "",
        genre: initialData?.genre || "Crime",
        price: initialData?.price || 0,
        status: initialData?.status || "Draft",
        variants: initialData?.book_variants || [
            { format: "ebook" as const, price: 0, available: true },
            { format: "paper_book" as const, price: 0, available: true },
            { format: "komet_card" as const, price: 0, available: true },
        ]
    })

    const [files, setFiles] = useState<{
        cover: File | null
        pdf: File | null
    }>({
        cover: null,
        pdf: null
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.title) newErrors.title = "Title is required"
        if (!formData.author) newErrors.author = "Author is required"
        if (!formData.description) newErrors.description = "Description is required"

        formData.variants.forEach((v: any) => {
            if (v.price <= 0) {
                newErrors[`price_${v.format}`] = `${v.format.replace('_', ' ')} price must be greater than 0`
            }
        })

        if (!isEdit) {
            if (!files.cover) newErrors.cover = "Cover image is required"
            if (!files.pdf) newErrors.pdf = "Book PDF is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "pdf") => {
        const file = e.target.files?.[0]
        if (file) {
            // Basic type validation
            if (type === "cover" && !file.type.startsWith("image/")) {
                toast.error("Please upload an image file (PNG/JPG)")
                return
            }
            if (type === "pdf" && file.type !== "application/pdf") {
                toast.error("Please upload a PDF file")
                return
            }

            setFiles(prev => ({ ...prev, [type]: file }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsUploading(true)

        let bookId: string | null = null

        try {
            // 1. Create the book record
            const { data: book, error: bookError } = await supabase
                .from("books")
                .insert({
                    title: formData.title,
                    author: formData.author,
                    illustrator: formData.illustrator || null,
                    description: formData.description,
                    genre: formData.genre,
                    status: formData.status === "Published" ? "published" : "draft",
                })
                .select()
                .single()

            if (bookError) throw new Error(`Failed to create book: ${bookError.message}`)
            bookId = book.id

            // 2. Upload cover image to Storage
            if (files.cover) {
                const coverExt = files.cover.name.split(".").pop()?.toLowerCase() || "jpg"
                const coverPath = `${bookId}/cover.${coverExt}`

                const { error: coverUploadError } = await supabase.storage
                    .from("book-covers")
                    .upload(coverPath, files.cover, {
                        contentType: files.cover.type,
                        upsert: true,
                    })

                if (coverUploadError) {
                    console.error("Cover upload error:", coverUploadError)
                    toast.error("Cover upload failed, but book was created. You can re-upload later.")
                } else {
                    // Get public URL and update book record
                    const { data: publicUrl } = supabase.storage
                        .from("book-covers")
                        .getPublicUrl(coverPath)

                    await supabase
                        .from("books")
                        .update({ cover_image_url: publicUrl.publicUrl })
                        .eq("id", bookId)
                }
            }

            // 3. Create book variants
            const variantInserts = formData.variants
                .filter((v: any) => v.price > 0)
                .map((v: any) => ({
                    book_id: bookId,
                    format: v.format,
                    price: v.price,
                    is_in_stock: v.available,
                }))

            if (variantInserts.length > 0) {
                const { error: variantError } = await supabase
                    .from("book_variants")
                    .insert(variantInserts)

                if (variantError) {
                    console.error("Variant creation error:", variantError)
                    toast.error("Some variants failed to create.")
                }
            }

            // 4. Upload PDF to Storage (for later processing by Edge Function)
            if (files.pdf) {
                const pdfPath = `${bookId}/original.pdf`

                const { error: pdfUploadError } = await supabase.storage
                    .from("book-pdfs")
                    .upload(pdfPath, files.pdf, {
                        contentType: "application/pdf",
                        upsert: true,
                    })

                if (pdfUploadError) {
                    console.error("PDF upload error:", pdfUploadError)
                    toast.error("PDF upload failed. You can re-upload from the edit page.")
                }
            }

            toast.success(isEdit ? "Volume updated successfully" : "New volume added to the cosmic library!")
            router.push("/admin/books")
        } catch (err: any) {
            console.error("Upload error:", err)
            toast.error(err.message || "Failed to upload volume")

            // Rollback: delete the book if we created one but something else failed
            if (bookId) {
                await supabase.from("books").delete().eq("id", bookId)
                console.log("Rolled back book record:", bookId)
            }
        } finally {
            setIsUploading(false)
        }
    }

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
                                        {GENRES.filter(g => g !== "All").map(genre => (
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
                                <Label>Cover Image (PNG/JPG)</Label>
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
                                <Label>Book PDF</Label>
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => handleFileChange(e, "pdf")}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${files.pdf ? "border-secondary/50 bg-secondary/5" : "border-border/50 hover:border-secondary/30"}`}>
                                        {files.pdf ? (
                                            <>
                                                <FileText className="w-10 h-10 text-secondary mb-2" />
                                                <p className="text-sm font-medium px-4 text-center truncate w-full">{files.pdf.name}</p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                                                <p className="text-xs text-muted-foreground">Select PDF</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {errors.pdf && <p className="text-xs text-destructive mt-2">{errors.pdf}</p>}
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

                            {isEdit && (
                                <div className="pt-6 border-t border-border/50">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-destructive hover:text-white hover:bg-destructive"
                                    >
                                        Delete Book permanently
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </form>
    )
}
