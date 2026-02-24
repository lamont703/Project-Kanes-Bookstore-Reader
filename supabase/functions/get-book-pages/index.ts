/**
 * get-book-pages Edge Function
 * 
 * Serves paginated book page data for the reader.
 * Verifies that the requesting user has access to the book
 * (via purchase, subscription, or admin role) before returning pages.
 * 
 * GET /get-book-pages?book_id=<uuid>&page=<number>&limit=<number>
 * 
 * Response:
 * {
 *   book: { id, title, author, total_pages },
 *   pages: [{ page_number, page_image_url, word_count }],
 *   pagination: { page, limit, total, has_more }
 * }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createErrorResponse, ErrorCodes } from "../_shared/errors.ts";
import { createAdminClient, createAuthClient } from "../_shared/supabase-client.ts";

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "GET") {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Method not allowed", 405);
    }

    try {
        const url = new URL(req.url);
        const bookId = url.searchParams.get("book_id");
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);

        if (!bookId) {
            return createErrorResponse(ErrorCodes.VALIDATION_ERROR, "book_id is required");
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Authorization required");
        }

        const authClient = createAuthClient(authHeader);
        const adminClient = createAdminClient();

        // Verify user
        const { data: { user }, error: authErr } = await authClient.auth.getUser();
        if (authErr || !user) {
            return createErrorResponse(ErrorCodes.UNAUTHORIZED, "Invalid token");
        }

        // Verify access: user must own the book, have a subscription, or be admin
        const { data: profile } = await adminClient
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        const isAdmin = profile?.role === "admin";

        if (!isAdmin) {
            // Check user library (purchased books)
            const { data: libraryEntry } = await adminClient
                .from("user_library")
                .select("id")
                .eq("user_id", user.id)
                .eq("book_id", bookId)
                .single();

            if (!libraryEntry) {
                // Check if user has active premium subscription (access to all books)
                const { data: subscription } = await adminClient
                    .from("user_subscriptions")
                    .select("plan, status")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .eq("plan", "premium")
                    .single();

                if (!subscription) {
                    return createErrorResponse(
                        ErrorCodes.FORBIDDEN,
                        "You must purchase this book or have a premium subscription to read it"
                    );
                }
            }
        }

        // Fetch book metadata
        const { data: book, error: bookErr } = await adminClient
            .from("books")
            .select("id, title, author")
            .eq("id", bookId)
            .single();

        if (bookErr || !book) {
            return createErrorResponse(ErrorCodes.NOT_FOUND, "Book not found");
        }

        // Get total page count
        const { count: totalPages } = await adminClient
            .from("book_pages")
            .select("*", { count: "exact", head: true })
            .eq("book_id", bookId);

        // Fetch requested pages
        const offset = (page - 1) * limit;
        const { data: pages, error: pageErr } = await adminClient
            .from("book_pages")
            .select("page_number, page_image_url, content, word_count")
            .eq("book_id", bookId)
            .order("page_number", { ascending: true })
            .range(offset, offset + limit - 1);

        if (pageErr) throw pageErr;

        const total = totalPages || 0;

        return new Response(
            JSON.stringify({
                book: {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    total_pages: total,
                },
                pages: pages || [],
                pagination: {
                    page,
                    limit,
                    total,
                    has_more: offset + limit < total,
                },
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (err: any) {
        console.error("[get-book-pages] Error:", err.message);
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, err.message);
    }
});
