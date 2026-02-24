/**
 * Upload Book Handler — Business Logic Orchestrator
 * 
 * Orchestrates the full book upload pipeline:
 * 1. Validate admin permissions
 * 2. Create book record (draft status)
 * 3. Create book variants (ebook, paper_book, komet_card)
 * 4. Upload original PDF to private Storage bucket
 * 5. Upload cover image to public Storage bucket
 * 6. Parse PDF → render pages as images → extract text
 * 7. Upload page images to Storage
 * 8. Create book_pages records (image URL + extracted text)
 * 9. Extract and store inline illustrations
 * 10. Transition book to "published" status
 * 
 * If any step fails, the handler rolls back by deleting the book record
 * (which cascades to variants, pages, and illustrations).
 */

import { createAdminClient, createAuthClient } from "../_shared/supabase-client.ts";
import { createErrorResponse, ErrorCodes } from "../_shared/errors.ts";
import { parsePDF, type PDFParseResult } from "./pdf-parser.ts";
import { extractText, countWords } from "./text-extractor.ts";
import { extractIllustrations } from "./image-extractor.ts";

interface UploadResult {
    id: string;
    title: string;
    status: string;
    pages_count: number;
    illustrations_count: number;
    processing_time_ms: number;
}

export async function handleUploadBook(
    authHeader: string,
    formData: FormData,
): Promise<UploadResult> {
    const startTime = Date.now();
    const adminClient = createAdminClient();
    const authClient = createAuthClient(authHeader);

    // ─── 0. Verify admin role ────────────────────────────────────
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
        throw { ...ErrorCodes.UNAUTHORIZED, message: "Invalid authentication token" };
    }

    const { data: profile } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        throw { ...ErrorCodes.FORBIDDEN, message: "Only admins can upload books" };
    }

    // ─── 1. Extract and validate metadata from form ──────────────
    const bookFile = formData.get("book_file") as File | null;
    const coverFile = formData.get("cover_file") as File | null;
    const title = (formData.get("title") as string)?.trim();
    const author = (formData.get("author") as string)?.trim();
    const genre = (formData.get("genre") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const illustrator = (formData.get("illustrator") as string)?.trim() || null;
    const seriesName = (formData.get("series_name") as string)?.trim() || null;
    const seriesOrder = parseInt(formData.get("series_order") as string || "0", 10) || null;

    // Variant pricing from form
    const ebookPrice = parseFloat(formData.get("ebook_price") as string || "14.99");
    const paperPrice = parseFloat(formData.get("paper_price") as string || "24.99");
    const kometCardPrice = parseFloat(formData.get("komet_card_price") as string || "29.99");

    if (!title || !author) {
        throw {
            ...ErrorCodes.VALIDATION_ERROR,
            message: "Missing required fields",
            details: [
                ...(!title ? [{ field: "title", issue: "Title is required" }] : []),
                ...(!author ? [{ field: "author", issue: "Author is required" }] : []),
            ],
        };
    }

    if (!bookFile) {
        throw { ...ErrorCodes.VALIDATION_ERROR, message: "Book PDF file is required" };
    }

    console.log(`[upload-book] Starting upload for "${title}" by ${author}`);

    // ─── 2. Create book record (draft) ──────────────────────────
    const { data: book, error: bookError } = await adminClient
        .from("books")
        .insert({
            title,
            author,
            genre,
            description,
            illustrator,
            series_name: seriesName,
            series_order: seriesOrder,
            status: "draft",
        })
        .select()
        .single();

    if (bookError) {
        console.error(`[upload-book] Failed to create book record: ${bookError.message}`);
        throw bookError;
    }

    const bookId = book.id;
    console.log(`[upload-book] Created book record: ${bookId}`);

    try {
        // ─── 3. Create book variants ───────────────────────────────
        const variants = [
            { book_id: bookId, format: "ebook", price: ebookPrice, is_in_stock: true },
            { book_id: bookId, format: "paper_book", price: paperPrice, is_in_stock: true },
            { book_id: bookId, format: "komet_card", price: kometCardPrice, is_in_stock: true },
        ];

        const { error: variantError } = await adminClient
            .from("book_variants")
            .insert(variants);

        if (variantError) throw variantError;
        console.log(`[upload-book] Created ${variants.length} variants`);

        // ─── 4. Upload original PDF ────────────────────────────────
        const { error: pdfUploadError } = await adminClient.storage
            .from("book-pdfs")
            .upload(`${bookId}/original.pdf`, bookFile, {
                contentType: "application/pdf",
                upsert: false,
            });

        if (pdfUploadError) throw pdfUploadError;
        console.log("[upload-book] Original PDF uploaded to Storage");

        // ─── 5. Upload cover image ─────────────────────────────────
        let coverImageUrl: string | null = null;

        if (coverFile) {
            const coverExt = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
            const coverPath = `${bookId}/cover.${coverExt}`;

            const { error: coverUploadError } = await adminClient.storage
                .from("book-covers")
                .upload(coverPath, coverFile, {
                    contentType: coverFile.type,
                    upsert: false,
                });

            if (coverUploadError) throw coverUploadError;

            // Get public URL for the cover
            const { data: publicUrl } = adminClient.storage
                .from("book-covers")
                .getPublicUrl(coverPath);

            coverImageUrl = publicUrl.publicUrl;

            // Update book record with cover URL
            await adminClient
                .from("books")
                .update({ cover_image_url: coverImageUrl })
                .eq("id", bookId);

            console.log("[upload-book] Cover image uploaded");
        }

        // ─── 6. Parse PDF → pages + text + illustrations ───────────
        console.log("[upload-book] Starting PDF processing pipeline...");
        const parseResult: PDFParseResult = await parsePDF(bookFile);
        console.log(`[upload-book] Parsed ${parseResult.pages.length} pages`);

        // ─── 7. Upload page images and create DB records ───────────
        let illustrationCount = 0;

        for (const page of parseResult.pages) {
            // Clean and normalize the extracted text
            const cleanText = extractText(page);
            const wordCount = countWords(cleanText);

            // Determine file extension from content type
            const ext = page.contentType === "image/webp" ? "webp"
                : page.contentType === "image/png" ? "png"
                    : "svg";

            const pageImagePath = `${bookId}/page-${String(page.pageNumber).padStart(4, "0")}.${ext}`;

            // Upload page image to Storage
            const { error: pageUploadError } = await adminClient.storage
                .from("book-pages")
                .upload(pageImagePath, page.imageData, {
                    contentType: page.contentType,
                    upsert: false,
                });

            if (pageUploadError) {
                console.error(`[upload-book] Failed to upload page ${page.pageNumber}: ${pageUploadError.message}`);
                throw pageUploadError;
            }

            // Get the storage URL for the page
            const { data: pageUrl } = adminClient.storage
                .from("book-pages")
                .getPublicUrl(pageImagePath);

            // Create book_pages record
            const { error: pageDbError } = await adminClient
                .from("book_pages")
                .insert({
                    book_id: bookId,
                    page_number: page.pageNumber,
                    page_image_url: pageUrl.publicUrl,
                    content: JSON.stringify(page.structuredContent), // Store as structured JSON
                    word_count: wordCount,
                });

            if (pageDbError) throw pageDbError;

            // ── Extract illustrations from this page ──
            const illustrations = await extractIllustrations(page, page.pageNumber);

            for (const illust of illustrations) {
                const illustExt = illust.contentType === "image/webp" ? "webp" : "png";
                const illustPath = `${bookId}/illust-p${page.pageNumber}-${illust.positionIndex}.${illustExt}`;

                const { error: illustUploadError } = await adminClient.storage
                    .from("book-illustrations")
                    .upload(illustPath, illust.imageData, {
                        contentType: illust.contentType,
                        upsert: false,
                    });

                if (illustUploadError) {
                    console.warn(`[upload-book] Illustration upload failed: ${illustUploadError.message}`);
                    continue; // Non-fatal — skip this illustration
                }

                const { data: illustUrl } = adminClient.storage
                    .from("book-illustrations")
                    .getPublicUrl(illustPath);

                await adminClient.from("book_illustrations").insert({
                    book_id: bookId,
                    image_url: illustUrl.publicUrl,
                    page_number: page.pageNumber,
                    position_index: illust.positionIndex,
                    caption: illust.caption || null,
                    width: illust.width,
                    height: illust.height,
                });

                illustrationCount++;
            }

            console.log(
                `[upload-book] Page ${page.pageNumber}/${parseResult.pages.length}: ` +
                `${wordCount} words, ${illustrations.length} illustrations`
            );
        }

        // ─── 8. Finalize: mark as published ────────────────────────
        const finalStatus = (formData.get("status") as string) === "published" ? "published" : "draft";

        await adminClient
            .from("books")
            .update({ status: finalStatus })
            .eq("id", bookId);

        const processingTime = Date.now() - startTime;
        console.log(
            `[upload-book] ✅ Complete! "${title}" — ` +
            `${parseResult.pages.length} pages, ${illustrationCount} illustrations, ` +
            `${processingTime}ms`
        );

        return {
            id: bookId,
            title,
            status: finalStatus,
            pages_count: parseResult.pages.length,
            illustrations_count: illustrationCount,
            processing_time_ms: processingTime,
        };

    } catch (err: any) {
        // ─── Rollback: cascade delete cleans up variants, pages, illustrations ──
        console.error(`[upload-book] ❌ Processing failed for "${title}": ${err.message}`);

        // Clean up Storage files
        try {
            await adminClient.storage.from("book-pdfs").remove([`${bookId}/original.pdf`]);
            // List and remove any page/illustration files
            const { data: pageFiles } = await adminClient.storage.from("book-pages").list(bookId);
            if (pageFiles?.length) {
                await adminClient.storage.from("book-pages").remove(
                    pageFiles.map((f: any) => `${bookId}/${f.name}`)
                );
            }
            const { data: coverFiles } = await adminClient.storage.from("book-covers").list(bookId);
            if (coverFiles?.length) {
                await adminClient.storage.from("book-covers").remove(
                    coverFiles.map((f: any) => `${bookId}/${f.name}`)
                );
            }
        } catch (cleanupErr: any) {
            console.error(`[upload-book] Storage cleanup partial: ${cleanupErr.message}`);
        }

        // Cascade delete the book record (removes variants, pages, illustrations)
        await adminClient.from("books").delete().eq("id", bookId);
        console.log(`[upload-book] Rolled back book record ${bookId}`);

        throw err;
    }
}
