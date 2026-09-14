import { NextRequest, NextResponse } from "next/server"
import { getViewerContext } from "@/lib/view-as/server"

/**
 * The reader's per-user state for the member an admin is currently viewing as.
 *
 * The reader is a client component that queries Supabase from the browser, so
 * left alone it would show the *admin's* progress, bookmarks and highlights on
 * top of the member's book. It calls this instead while a view is active; with
 * no view active the endpoint refuses and the reader keeps its normal path
 * untouched.
 */
export async function GET(request: NextRequest) {
    const { isViewingAs, userId, db } = await getViewerContext()

    if (!isViewingAs || !userId) {
        return NextResponse.json({ error: "No active View As session" }, { status: 400 })
    }

    const bookId = new URL(request.url).searchParams.get("bookId")
    if (!bookId) {
        return NextResponse.json({ error: "bookId is required" }, { status: 400 })
    }

    const [libraryRes, progressRes, bookmarksRes, highlightsRes] = await Promise.all([
        db.from("user_library").select("id").eq("user_id", userId).eq("book_id", bookId).maybeSingle(),
        db.from("reading_progress").select("current_page").eq("user_id", userId).eq("book_id", bookId).maybeSingle(),
        db.from("bookmarks").select("*").eq("user_id", userId).eq("book_id", bookId),
        db.from("highlights").select("*").eq("user_id", userId).eq("book_id", bookId),
    ])

    return NextResponse.json({
        // The reader is gated on user_library by RLS. The service-role client
        // used here is not, so ownership is reported explicitly and the reader
        // reproduces the refusal the member would have hit.
        owned: !!libraryRes.data,
        progress: progressRes.data ?? null,
        bookmarks: bookmarksRes.data ?? [],
        highlights: highlightsRes.data ?? [],
    })
}
