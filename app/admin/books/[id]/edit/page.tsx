import { BookForm } from "@/components/admin/book-form"
import { mockBooks } from "@/lib/mock-books"
import { Edit3 } from "lucide-react"

export default async function EditBookPage({ params }: { params: { id: string } }) {
    const { id } = await params

    // In a real app, this would be a fetch. Here we use mock data.
    const book = mockBooks.find(b => b.id === id)

    if (!book) {
        return (
            <div className="p-8 text-center py-20">
                <h1 className="text-4xl font-display mb-4">VOLUME NOT FOUND</h1>
                <p className="text-muted-foreground">The ID you provided does not exist in our coordinates.</p>
            </div>
        )
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
