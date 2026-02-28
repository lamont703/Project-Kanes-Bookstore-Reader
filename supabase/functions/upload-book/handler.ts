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
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
        console.error(`[upload-book] Auth failed: ${authError?.message || "No user found"}`);
        throw {
            ...ErrorCodes.UNAUTHORIZED,
            message: authError?.message || "Invalid authentication token"
        };
    }

    console.log(`[upload-book] Authenticated user: ${user.id} (${user.email})`);

    const { data: profile, error: profileError } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error(`[upload-book] Failed to fetch profile: ${profileError.message}`);
        throw { ...ErrorCodes.INTERNAL_ERROR, message: "Failed to verify admin status" };
    }

    if (profile?.role !== "admin") {
        console.warn(`[upload-book] Access denied for user ${user.id} (role: ${profile?.role})`);
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
    const existingId = formData.get("id") as string | null;
    const seriesOrder = parseInt(formData.get("series_order") as string || "0", 10) || null;

    // Variant pricing and availability from form
    const ebookPrice = parseFloat(formData.get("ebook_price") as string || "14.99");
    const ebookAvailable = formData.get("ebook_available") !== "false";
    const paperPrice = parseFloat(formData.get("paper_price") as string || "24.99");
    const paperAvailable = formData.get("paper_available") !== "false";
    const kometCardPrice = parseFloat(formData.get("komet_card_price") as string || "29.99");
    const kometCardAvailable = formData.get("komet_card_available") !== "false";

    const isBookClubEligible = formData.get("is_book_club_eligible") === "true";
    const isAgeRestricted = formData.get("is_age_restricted") === "true";

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

    if (!bookFile && !existingId) {
        throw { ...ErrorCodes.VALIDATION_ERROR, message: "A book PDF file is required for new uploads" };
    }

    console.log(`[upload-book] Starting upload for "${title}" by ${author}`);

    // ─── 2. Create or Update book record ───────────────────────
    const bookData = {
        title,
        author,
        genre,
        description,
        illustrator,
        series_name: seriesName,
        series_order: seriesOrder,
        is_book_club_eligible: isBookClubEligible,
        is_age_restricted: isAgeRestricted,
        status: "draft",
    };

    let bookId: string;

    if (existingId) {
        const { data: book, error: bookError } = await adminClient
            .from("books")
            .upsert({ id: existingId, ...bookData })
            .select()
            .single();

        if (bookError) throw bookError;
        bookId = book.id;
        console.log(`[upload-book] Updated book record: ${bookId}`);
    } else {
        const { data: book, error: bookError } = await adminClient
            .from("books")
            .insert(bookData)
            .select()
            .single();

        if (bookError) throw bookError;
        bookId = book.id;
        console.log(`[upload-book] Created book record: ${bookId}`);
    }

    try {
        // ─── 3. Create or Update book variants ───────────────────────────────
        const formats = ["ebook", "paper_book", "komet_card"];
        const pricing = [ebookPrice, paperPrice, kometCardPrice];
        const availability = [ebookAvailable, paperAvailable, kometCardAvailable];

        for (let i = 0; i < formats.length; i++) {
            const format = formats[i];
            const price = pricing[i];
            const is_in_stock = availability[i];

            const { error: variantError } = await adminClient
                .from("book_variants")
                .upsert({
                    book_id: bookId,
                    format,
                    price,
                    is_in_stock
                }, { onConflict: 'book_id,format' });

            if (variantError) throw variantError;
        }
        console.log(`[upload-book] Processed ${formats.length} variants`);

        // ─── 4. Upload original file (PDF or DOCX) ───────────────────
        let storagePath = "";
        if (bookFile) {
            const ext = "pdf";
            const mimeType = "application/pdf";
            storagePath = `${bookId}/original.${ext}`;

            const { error: uploadError } = await adminClient.storage
                .from("book-pdfs")
                .upload(storagePath, bookFile, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;
            console.log(`[upload-book] Original ${ext.toUpperCase()} uploaded to Storage`);

            // Get public URL and save to book record
            const { data: publicUrl } = adminClient.storage
                .from("book-pdfs")
                .getPublicUrl(storagePath);

            await adminClient
                .from("books")
                .update({ book_file_url: publicUrl.publicUrl })
                .eq("id", bookId);

            console.log("[upload-book] Book record updated with file URL");
        }

        // ─── 5. Upload cover image ─────────────────────────────────
        let coverImageUrl: string | null = null;

        if (coverFile) {
            const coverExt = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
            const coverPath = `${bookId}/cover.${coverExt}`;

            const { error: coverUploadError } = await adminClient.storage
                .from("book-covers")
                .upload(coverPath, coverFile, {
                    contentType: coverFile.type,
                    upsert: true,
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

        // ─── 6. Delegate processing to Vercel Node.js API ─────
        if (!bookFile) {
            console.log("[upload-book] No new file provided, skipping parsing pipeline.");
            const finalStatus = (formData.get("status") as string) === "published" ? "published" : "draft";
            await adminClient.from("books").update({ status: finalStatus }).eq("id", bookId);

            return {
                id: bookId,
                title,
                status: finalStatus,
                pages_count: 0,
                illustrations_count: 0,
                processing_time_ms: Date.now() - startTime,
            };
        }

        console.log("[upload-book] Starting Vercel processing delegation...");

        // Use environment variables for Vercel URL and Internal Secret
        const vercelUrl = Deno.env.get("VERCEL_PROJECT_URL") || "https://project-kanes-book-reader.vercel.app";
        const internalSecret = Deno.env.get("INTERNAL_API_SECRET");

        const vercelResponse = await fetch(`${vercelUrl}/api/admin/process-book`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${internalSecret}`
            },
            body: JSON.stringify({
                bookId,
                storagePath,
                title
            })
        });

        if (!vercelResponse.ok) {
            const errorText = await vercelResponse.text();
            console.error(`[upload-book] Vercel processing failed: ${errorText}`);
            throw new Error(`PDF processing delegation failed: ${errorText}`);
        }

        const processResult = await vercelResponse.json();
        const processingTime = Date.now() - startTime;

        // Force status transition to published in DB
        await adminClient
            .from("books")
            .update({
                status: "published"
            })
            .eq("id", bookId);

        console.log(
            `[upload-book] ✅ Complete via Vercel! "${title}" — ` +
            `${processResult.pages} chapters/pages, ${processResult.illustrations} illustrations, ` +
            `${processingTime}ms`
        );

        return {
            id: bookId,
            title,
            status: "published", // Vercel marks it as published once done
            pages_count: processResult.pages,
            illustrations_count: processResult.illustrations,
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
