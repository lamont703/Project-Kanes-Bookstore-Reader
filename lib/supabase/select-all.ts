/**
 * Read every row of a query, past PostgREST's response ceiling.
 *
 * Supabase caps how many rows one REST response may contain — 1,000 by default
 * (`db_max_rows`). It is not an error and there is no warning: the response is
 * simply short, and only the `Content-Range` header records that anything was
 * cut. A query with no `.limit()` therefore looks complete and is not, which is
 * exactly how /admin/books came to show 1,000 of 1,057 books with nothing
 * anywhere saying so.
 *
 * `.range()` alone does not fix it — the ceiling applies per response, not per
 * request — so the only way to read everything is to ask repeatedly. This walks
 * the windows until a short page proves the end.
 *
 * ⚠️ The query MUST have a total order, and the last key must be unique.
 * Paging is offset-based, so rows tied on the sort key can shuffle between
 * requests and land in two windows or neither. Order by something unique, or
 * add `id` as a tiebreaker:
 *
 *     selectAll(() => supabase.from("books").select("*").order("title").order("id"))
 *
 * Use it for admin screens that genuinely need the whole table. Anything
 * user-facing should paginate in the UI instead of shipping ten thousand rows
 * to a browser.
 */

/** PostgREST's default. Asking for more per page does not raise the ceiling. */
const PAGE_SIZE = 1000

/** Refuse to spin forever if a query somehow never returns a short page. */
const MAX_ROWS = 100_000

export async function selectAll<T = unknown>(
    /**
     * Builds the query afresh each call. A factory, not a builder: supabase-js
     * query builders are single-use, so reusing one would replay the first
     * request and loop forever on the same thousand rows.
     */
    makeQuery: () => PromiseLike<{ data: T[] | null; error: unknown }> & {
        range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
    },
): Promise<{ data: T[]; error: unknown }> {
    const rows: T[] = []

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1)

        // Return what we have alongside the error rather than throwing it away:
        // a caller showing 2,000 of 3,000 books beats one showing none.
        if (error) return { data: rows, error }
        if (!data?.length) break

        rows.push(...data)

        // A short page is the end. Checking this rather than comparing against a
        // separate count keeps it to one round trip more than strictly needed,
        // and avoids disagreeing with a count taken a moment earlier.
        if (data.length < PAGE_SIZE) break
    }

    return { data: rows, error: null }
}
