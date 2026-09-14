import { createStaticClient } from "@/lib/supabase/server"
import { GENRES } from "@/lib/types/book"

/**
 * Book categories, from the database.
 *
 * These were a hardcoded constant backed by a Postgres enum, so adding one meant
 * a code change and a schema migration. They are now rows (see migration
 * 20260825000000), which is what lets an admin add a category from the browse
 * editor and have it appear both in the public filters and in the upload form.
 *
 * Falls back to the original constant if the table cannot be read, so a filter
 * bar that cannot reach the database degrades to the old list rather than
 * vanishing.
 */
export async function getActiveGenres(): Promise<string[]> {
    const supabase = createStaticClient()
    const { data, error } = await supabase
        .from("book_genres")
        .select("name")
        .eq("is_active", true)
        .order("sort_order")
        .order("name")

    if (error || !data?.length) {
        if (error) console.error("getActiveGenres failed:", error.message)
        return [...GENRES].filter((g) => g !== "All")
    }
    return data.map((row) => row.name as string)
}
