import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-api"

/**
 * One member's library, for the admin peek on /admin/users.
 *
 * Fetched on demand rather than folded into the users list: that endpoint
 * returns up to 200 people and already carries user_library only as an id array
 * it counts. Joining every title onto it would make the table's query heavier
 * for a detail almost nobody is looking at in any given row.
 *
 * Book club picks come from user_subscriptions.selected_book_ids as well as from
 * the library, because those two can disagree. A signup grant is written into
 * user_library with source 'subscription_signup', but user_library.book_id
 * CASCADEs on book delete (migration 20260227200000) while selected_book_ids is
 * a bare uuid[] with no foreign key. Delete a book and the library row vanishes
 * while the recorded choice survives, pointing at nothing — which is exactly the
 * case that shows up as an empty library and no explanation. Reporting the
 * choice with `missing: true` is how that stops being a mystery.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin()
    if (!session) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { id: userId } = await params
    const { admin } = session

    const [libraryRes, subRes] = await Promise.all([
        admin
            .from("user_library")
            .select("id, book_id, source, acquired_at, books (id, title, author, cover_image_url, product_type)")
            .eq("user_id", userId)
            .order("acquired_at", { ascending: false }),
        admin
            .from("user_subscriptions")
            .select("selected_book_ids")
            .eq("user_id", userId)
            .maybeSingle(),
    ])

    if (libraryRes.error) {
        return NextResponse.json({ error: libraryRes.error.message }, { status: 500 })
    }

    const items = (libraryRes.data ?? []).map((row: any) => ({
        id: row.id,
        bookId: row.book_id,
        title: row.books?.title ?? "(book no longer in the catalogue)",
        author: row.books?.author ?? null,
        coverImage: row.books?.cover_image_url ?? null,
        productType: row.books?.product_type ?? null,
        source: row.source,
        acquiredAt: row.acquired_at,
    }))

    // The two books chosen at book club signup, resolved to titles.
    const chosenIds: string[] = subRes.data?.selected_book_ids ?? []
    let choices: { bookId: string; title: string | null; inLibrary: boolean }[] = []

    if (chosenIds.length) {
        const { data: chosenBooks } = await admin
            .from("books")
            .select("id, title")
            .in("id", chosenIds)

        const titleById = new Map<string, string>((chosenBooks ?? []).map((b: any) => [b.id, b.title]))
        const ownedIds = new Set(items.map((i: { bookId: string }) => i.bookId))

        choices = chosenIds.map((bookId) => ({
            bookId,
            title: titleById.get(bookId) ?? null,
            inLibrary: ownedIds.has(bookId),
        }))
    }

    return NextResponse.json({ total: items.length, items, choices })
}
