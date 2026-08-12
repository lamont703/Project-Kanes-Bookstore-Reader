export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminBooksContent } from "@/components/admin/admin-books-content"

export default async function AdminBooksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?redirect=/admin/books")
  }

  // Fetch initial books on the server to ensure identity sync
  const { data, error } = await supabase
    .from("books")
    .select("*, book_variants(*)")
    .eq("product_type", "book")
    .order("title")

  if (error) {
    console.error("Failed to fetch books for admin:", error)
  }

  // Map to the format the UI expects
  const initialBooks = (data || []).map((b: any) => ({
    ...b,
    coverImage: b.cover_image_url,
    catalogStatus: b.status === "published" ? "Published" : "Draft",
    price: b.book_variants?.find((v: any) => v.format === 'ebook')?.price || b.book_variants?.[0]?.price || 0
  }))

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <AdminBooksContent initialBooks={initialBooks} />
    </div>
  )
}
