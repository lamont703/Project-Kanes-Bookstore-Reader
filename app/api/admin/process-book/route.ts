import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPDF } from "@/lib/book/pdf-processor";

/**
 * PDF Processing API Route (Vercel Node.js)
 * 
 * Takes a bookId and a storage path, downloads the PDF from Supabase,
 * renders pages as high-quality images, extracts text, and uploads
 * everything back to Supabase.
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    // ─── 1. Authorization ────────────────────────────────────────
    // We'll use a shared secret to ensure only our Edge functions call this
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.INTERNAL_API_SECRET;

    // In dev, provide a way to bypass or use a default if not set
    if (secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { bookId, storagePath, title } = await request.json();

        if (!bookId || !storagePath) {
            return NextResponse.json({ error: "Missing bookId or storagePath" }, { status: 400 });
        }

        console.log(`[process-book] Starting job for "${title}" (${bookId})`);
        const supabase = createAdminClient();

        // ─── 2. Download original PDF from Storage ────────────────
        const { data: pdfBlob, error: downloadError } = await supabase.storage
            .from("book-pdfs")
            .download(storagePath);

        if (downloadError) {
            console.error(`[process-book] Download failed: ${downloadError.message}`);
            throw downloadError;
        }

        const buffer = Buffer.from(await pdfBlob.arrayBuffer());
        console.log(`[process-book] Downloaded PDF (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

        // ─── 3. Run MuPDF Processing Pipeline ───────────────────
        const parseResult = await processPDF(buffer, title || "book.pdf");
        console.log(`[process-book] Parsed ${parseResult.pages.length} pages and ${parseResult.illustrations.length} illustrations`);

        // ─── 4. Upload Rendered Pages ─────────────────────────────
        for (const page of parseResult.pages) {
            const pagePath = `${bookId}/page-${String(page.pageNumber).padStart(4, "0")}.png`;

            // Upload image
            const { error: uploadError } = await supabase.storage
                .from("book-pages")
                .upload(pagePath, page.imageData, {
                    contentType: page.contentType,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("book-pages")
                .getPublicUrl(pagePath);

            // Insert DB record
            const { error: dbError } = await supabase
                .from("book_pages")
                .insert({
                    book_id: bookId,
                    page_number: page.pageNumber,
                    page_image_url: publicUrl,
                    content: JSON.stringify(page.structuredContent),
                    word_count: page.textContent ? page.textContent.trim().split(/\s+/).length : 0,
                });

            if (dbError) throw dbError;
        }

        // ─── 5. Upload Illustrations ─────────────────────────────
        for (const illust of parseResult.illustrations) {
            const illustPath = `${bookId}/illust-p${illust.pageNumber}-${illust.positionIndex}.png`;

            const { error: illustUploadError } = await supabase.storage
                .from("book-illustrations")
                .upload(illustPath, illust.imageData, {
                    contentType: illust.contentType,
                    upsert: true
                });

            if (illustUploadError) continue; // Non-fatal

            const { data: { publicUrl: illustUrl } } = supabase.storage
                .from("book-illustrations")
                .getPublicUrl(illustPath);

            await supabase
                .from("book_illustrations")
                .insert({
                    book_id: bookId,
                    image_url: illustUrl,
                    page_number: illust.pageNumber,
                    position_index: illust.positionIndex,
                    width: illust.width,
                    height: illust.height,
                });
        }

        // ─── 6. Mark as Published ─────────────────────────────────
        await supabase
            .from("books")
            .update({ status: "published" })
            .eq("id", bookId);

        const duration = Date.now() - startTime;
        console.log(`[process-book] Finished job for ${bookId} in ${duration}ms`);

        return NextResponse.json({
            success: true,
            pages: parseResult.pages.length,
            illustrations: parseResult.illustrations.length,
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
