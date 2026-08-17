import { createClient } from '@supabase/supabase-js';
import { processPDF } from './pdf-processor';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/lib/supabase/config'

const supabaseUrl = SUPABASE_URL;
const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper to process an array in chunks.
 */
async function processInChunks<T>(
    items: T[],
    chunkSize: number,
    processor: (item: T) => Promise<void>
) {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(processor));
    }
}

/**
 * PDF Batch Processor (Vercel Node.js)
 * 
 * Orchestrates the full PDF parsing pipeline:
 * 1. Download original PDF from Storage
 * 2. Parse PDF (renders pages + extracts text + extracts XObject illustrations)
 * 3. Upload artifacts (page images + illustrations)
 * 4. Sync database (book_pages + book_illustrations)
 * 5. Update book status
 */
export async function processPdfBatch(bookId: string, storagePath: string) {
    console.log(`[pdf-batch] Starting PDF processing for book ${bookId}...`);

    // ─── 1. Download PDF ───────────────────────────────────────────
    const { data: fileData, error: downloadError } = await supabase.storage
        .from("book-pdfs")
        .download(storagePath);

    if (downloadError || !fileData) {
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // ─── 2. Internal PDF Extraction (The Heavy Lifting) ───────────
    const result = await processPDF(buffer, "original.pdf");
    console.log(`[pdf-batch] PDF Parsed: ${result.pages.length} pages, ${result.illustrations.length} illustrations`);

    // ─── 3. Upload Illustrations in Chunked Parallel ──────────────
    const illustrationUrls: string[] = [];

    await processInChunks(result.illustrations, 5, async (illust) => {
        const fileName = `${bookId}/illust_${illust.positionIndex}.png`;

        const { error: uploadErr } = await supabase.storage
            .from("book-illustrations")
            .upload(fileName, illust.imageData, {
                contentType: illust.contentType,
                upsert: true
            });

        if (uploadErr) {
            console.error(`[pdf-batch] Illustration upload failed: ${uploadErr.message}`);
            throw new Error(`Failed to upload illustration: ${uploadErr.message}`);
        }

        const { data: publicUrl } = supabase.storage
            .from("book-illustrations")
            .getPublicUrl(fileName);

        illustrationUrls[illust.positionIndex] = publicUrl.publicUrl;

        const { error: illustInsertErr } = await supabase.from("book_illustrations").insert({
            book_id: bookId,
            image_url: publicUrl.publicUrl,
            page_number: illust.pageNumber,
            position_index: illust.positionIndex
        });

        if (illustInsertErr) {
            console.error(`[pdf-batch] Illustration DB insert failed: ${illustInsertErr.message}`);
            throw new Error(`Failed to save illustration to database: ${illustInsertErr.message}`);
        }
    });

    console.log(`[pdf-batch] Finished uploading ${result.illustrations.length} illustrations`);

    // ─── 4. Upload Page Images and Save Content in Chunked Parallel 
    // Clear existing pages for idempotency
    const { error: deleteErr } = await supabase.from("book_pages").delete().eq("book_id", bookId);
    if (deleteErr) {
        console.warn(`[pdf-batch] Failed to clear old pages (usually okay): ${deleteErr.message}`);
    }

    await processInChunks(result.pages, 3, async (page) => {
        const pageImageName = `${bookId}/page_${page.pageNumber}.png`;

        const { error: pageUploadErr } = await supabase.storage
            .from("book-pages")
            .upload(pageImageName, page.imageData, {
                contentType: page.contentType,
                upsert: true
            });

        if (pageUploadErr) {
            console.error(`[pdf-batch] Page ${page.pageNumber} upload failed: ${pageUploadErr.message}`);
            throw new Error(`Failed to upload page ${page.pageNumber}: ${pageUploadErr.message}`);
        }

        const { data: pageUrl } = supabase.storage
            .from("book-pages")
            .getPublicUrl(pageImageName);

        // Inject illustration markers into the content if needed
        let finalContent = page.textContent || "";
        const pageIllusts = result.illustrations.filter(ill => ill.pageNumber === page.pageNumber);

        if (pageIllusts.length > 0) {
            pageIllusts.sort((a, b) => a.positionIndex - b.positionIndex).forEach(ill => {
                const url = illustrationUrls[ill.positionIndex];
                if (url) {
                    finalContent += `\n\n![Illustration](${url})`;
                }
            });
        }

        const { error: pageInsertErr } = await supabase.from("book_pages").insert({
            book_id: bookId,
            page_number: page.pageNumber,
            page_image_url: pageUrl.publicUrl,
            content: finalContent,
            word_count: (page.textContent || "").split(/\s+/).length
        });

        if (pageInsertErr) {
            console.error(`[pdf-batch] Page ${page.pageNumber} DB insert failed: ${pageInsertErr.message}`);
            throw new Error(`Failed to save page ${page.pageNumber} to database: ${pageInsertErr.message}`);
        }
    });

    console.log(`[pdf-batch] Finished uploading ${result.pages.length} pages`);

    // ─── 5. Update Book Metadata ──────────────────────────────────
    const { data: fileUrl } = supabase.storage
        .from("book-pdfs")
        .getPublicUrl(storagePath);

    console.log(`[pdf-batch] Finalizing book status to "published" for ${bookId}...`);
    const { error: finalUpdateErr } = await supabase.from("books").update({
        status: 'published',
        book_file_url: fileUrl.publicUrl,
    }).eq("id", bookId);

    if (finalUpdateErr) {
        console.error(`[pdf-batch] CRITICAL: Final status update failed: ${finalUpdateErr.message}`);
        throw new Error(`Failed to finalize book status: ${finalUpdateErr.message}`);
    }

    return {
        pages: result.pages.length,
        illustrations: result.illustrations.length
    };
}
