import { BookForm } from "@/components/admin/book-form"
import { Edit3 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: b, error } = await supabase
        .from("books")
        .select(`
            *,
            book_variants (*)
        `)
        .eq("id", id)
        .single()

    if (error || !b) {
        return notFound()
    }

    // Map Supabase data to the format expected by BookForm
    const book = {
        ...b,
        status: b.status === "published" ? "Published" : "Draft",
        price: b.book_variants?.find((v: any) => v.format === 'ebook')?.price || b.book_variants?.[0]?.price || 0,
        book_variants: b.book_variants?.map((v: any) => ({
            format: v.format,
            price: v.price,
            available: v.is_in_stock // Map database field to form property
        })) || [
                { format: "ebook", price: 0, available: true },
                { format: "paper_book", price: 0, available: true },
                { format: "komet_card", price: 0, available: true },
            ]
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                        <Edit3 className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-secondary">Registry Update</p>
                </div>
                <h1 className="font-display text-6xl tracking-wider">
                    <span className="text-primary">EDIT</span> <span className="text-secondary">VOLUME</span>
                </h1>
                <p className="text-lg text-muted-foreground mt-2">Modify the metadata and assets for "{book.title}"</p>
            </div>

            <BookForm isEdit initialData={book} />
        </div>
    )
}
