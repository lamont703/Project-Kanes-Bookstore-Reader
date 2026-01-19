import { BookForm } from "@/components/admin/book-form"
import { Sparkles } from "lucide-react"

export default function NewBookPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Add to Catalog</p>
                </div>
                <h1 className="font-display text-6xl tracking-wider">
                    <span className="text-primary">CREATE</span> <span className="text-secondary">NEW VOLUME</span>
                </h1>
                <p className="text-lg text-muted-foreground mt-2">Deploy a new literary object to the cosmic library.</p>
            </div>

            <BookForm />
        </div>
    )
}
