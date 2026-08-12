import { ProductForm } from "@/components/admin/product-form"

export default function NewProductPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="font-display mb-2 text-3xl tracking-wide md:text-4xl">Add Product</h1>
            <p className="mb-8 text-sm text-muted-foreground">
                Merchandise only. To add a book, use the Catalog — books need a PDF and go through
                the upload pipeline.
            </p>
            <ProductForm />
        </div>
    )
}
