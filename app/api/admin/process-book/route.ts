import { NextRequest, NextResponse } from "next/server";
import { processPdfBatch } from "@/lib/book/pdf-batch-processor";

/**
 * PDF Processing API Route (Vercel Node.js)
 * 
 * Takes a bookId and a storage path, downloads the PDF from Supabase,
 * extracts text and illustrations, and updates the database.
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

        console.log(`[process-book] Starting PDF job for "${title}" (${bookId})`);
        console.log(`[process-book] Memory usage before: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

        // ─── 2. Run PDF Processing Pipeline ──────────────────────────
        const parseResult = await processPdfBatch(bookId, storagePath);

        const duration = Date.now() - startTime;
        console.log(`[process-book] Finished PDF job for ${bookId} in ${duration}ms`);
        console.log(`[process-book] Memory usage after: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

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
