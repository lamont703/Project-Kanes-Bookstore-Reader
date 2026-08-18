import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/nav/site-footer"
import { BookCard } from "@/components/book-card"
import type { Book } from "@/lib/types/book"
import { createClient } from "@/lib/supabase/server"
import { BrowseFilters } from "@/components/browse-filters"
import { BrowsePagination } from "@/components/browse-pagination"
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/lib/browse-options"

interface BrowsePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams
  const genre = (params.genre as string) || "All"
  const query = (params.q as string) || ""
  const sort = (params.sort as string) || "title"

  // Page size comes from the URL but is not trusted: only the offered options
  // are honoured, so a hand-edited ?perPage=5000 cannot ask the database for
  // the whole catalogue in one request.
  const requestedPerPage = Number(params.perPage)
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(requestedPerPage)
    ? requestedPerPage
    : DEFAULT_PER_PAGE
  const requestedPage = Number(params.page)
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1

  const supabase = await createClient()

  // Build the Supabase query on the server
  let dbQuery = supabase
    .from('books')
    .select(`
      *,
      book_variants (*)
    `, { count: 'exact' })
    .eq('status', 'published')
    // `books` is now a general catalog and also holds merchandise; this page
    // renders book-shaped cards, so keep it to books. See migration
    // 20260811000001_extend_books_to_catalog.sql.
    .eq('product_type', 'book')

  // Apply server-side filters
  if (genre !== "All") {
    dbQuery = dbQuery.eq('genre', genre)
  }

  // Author or Title search
  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,author.ilike.%${query}%`)
  }

  // Handle Sort
  if (sort === 'title') {
    dbQuery = dbQuery.order('title', { ascending: true })
  } else if (sort === 'price-low') {
    // Sorting by price is trickier because prices are in the variants table
    // For now we'll sort alphabetically, but we can refine our SQL here
  }

  // Fetch only the current page. Previously the whole catalogue came back on
  // every request and was rendered in one grid.
  const from = (page - 1) * perPage
  const { data, error, count } = await dbQuery.range(from, from + perPage - 1)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const rangeStart = total === 0 ? 0 : from + 1
  const rangeEnd = Math.min(from + perPage, total)

  if (error) {
    console.error("❌ Supabase Error on Server:", error)
  }

  const books: Book[] = (data || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    illustrator: b.illustrator,
    coverImage: b.cover_image_url || "/placeholder.webp",
    genre: b.genre,
    description: b.description || "",
    price: b.book_variants?.find((v: any) => v.format === 'ebook')?.price || b.book_variants?.[0]?.price || 0,
    variants: b.book_variants?.map((v: any) => ({
      id: v.id,
      format: v.format,
      price: v.price,
      available: v.is_in_stock
    })) || []
  }))

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2 uppercase">
            <span className="text-primary">THE KOMET</span> <span className="text-secondary">BOOK LIBRARY</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">Explore original stories from the World of Kane: Crime Saga, Kosmic Myths, Street Legends, and Everything In Between.</p>
        </div>

        {/* Search and Filters (Client Component) */}
        <BrowseFilters />

        {books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in border-2 border-dashed border-border rounded-xl">
            <p className="text-xl text-muted-foreground mb-4 font-display">NO COSMIC VOLUMES DETECTED</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">Your search criteria didn't yield any book signals from the galaxy.</p>
          </div>
        )}

        <BrowsePagination
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          perPage={perPage}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>

      <SiteFooter mode="app" />
    </div>
  )
}
