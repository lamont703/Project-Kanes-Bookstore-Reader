import { NextRequest, NextResponse } from "next/server";
import { processDocx } from "@/lib/book/docx-processor";

/**
 * DOCX Processing API Route (Vercel Node.js)
 * 
 * Takes a bookId and a storage path, downloads the DOCX from Supabase,
 * extracts text and illustrations using mammoth.js, and updates
 * the database.
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    // ─── 1. Authorization ────────────────────────────────────────
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.INTERNAL_API_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { bookId, storagePath, title } = await request.json();

        if (!bookId || !storagePath) {
            return NextResponse.json({ error: "Missing bookId or storagePath" }, { status: 400 });
        }

        console.log(`[process-book] Starting DOCX job for "${title}" (${bookId})`);

        // ─── 2. Run DOCX Processing Pipeline ───────────────────
        const parseResult = await processDocx(bookId, storagePath);

        const duration = Date.now() - startTime;
        console.log(`[process-book] Finished job for ${bookId} in ${duration}ms`);

        return NextResponse.json({
            success: true,
            pages: parseResult.pages,
            illustrations: parseResult.illustrations,
            duration_ms: duration
        });

    } catch (error: any) {
        console.error(`[process-book] Critical failure:`, error);
        return NextResponse.json({
            success: false,
            error: error.message || "Unknown processing error"
        }, { status: 500 });
    }
}
