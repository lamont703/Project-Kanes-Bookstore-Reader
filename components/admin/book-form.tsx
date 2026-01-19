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

interface BookFormProps {
    initialData?: Partial<Book> & { status?: string }
    isEdit?: boolean
}

export function BookForm({ initialData, isEdit }: BookFormProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        author: initialData?.author || "",
        description: initialData?.description || "",
        genre: initialData?.genre || "Science Fiction",
        price: initialData?.price || 0,
        isbn: initialData?.isbn || "",
        status: initialData?.status || "Published"
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
        if (formData.price <= 0) newErrors.price = "Price must be greater than 0"

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

        // Simulate API call
        setTimeout(() => {
            setIsUploading(false)
            toast.success(isEdit ? "Volume updated successfully" : "New volume added to catalog")
            router.push("/admin/books")
        }, 2000)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Metadata */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
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
                                <div className="space-y-2">
                                    <Label htmlFor="isbn">ISBN (Optional)</Label>
                                    <Input
                                        id="isbn"
                                        placeholder="978-0-..."
                                        value={formData.isbn}
                                        onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                                    />
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
                                    <Label htmlFor="price">Price ($)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        className={errors.price ? "border-destructive" : ""}
                                    />
                                    {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
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

                    <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
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
                    <Card className="p-8 bg-card/50 backdrop-blur border-border/50 sticky top-24">
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
