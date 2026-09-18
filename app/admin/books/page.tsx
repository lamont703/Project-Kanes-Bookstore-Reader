export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { selectAll } from "@/lib/supabase/select-all"
import { redirect } from "next/navigation"
import { AdminBooksContent } from "@/components/admin/admin-books-content"
import { getEffectiveRole } from "@/lib/current-role"
import { isAdminRole } from "@/lib/roles"

export default async function AdminBooksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?redirect=/admin/books")
  }

  /**
   * Every book, not the first thousand.
   *
   * Supabase caps a single REST response at 1,000 rows and says so only in a
   * Content-Range header nobody reads — so this page quietly showed 1,000 of
   * 1,057 books, and would have hidden more with every title added. selectAll
   * walks the pages. See lib/supabase/select-all.ts.
   *
   * Ordered by title AND id: offset paging needs a total order, and titles are
   * not unique, so ties could otherwise shuffle between requests and drop or
   * duplicate a row at a page boundary.
   */
  const { data, error } = await selectAll<any>(() =>
    supabase
      .from("books")
      .select("*, book_variants(*)")
      .eq("product_type", "book")
      // Retired books stay in the table so they can be brought back;
      // they must not appear anywhere a shopper or an admin browses.
      .is("deleted_at", null)
      .order("title")
      .order("id"),
  )

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

  // Employees maintain the catalogue but never delete from it — see lib/roles.ts.
  const canDelete = isAdminRole(await getEffectiveRole())

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <AdminBooksContent initialBooks={initialBooks} canDelete={canDelete} />
    </div>
  )
}
