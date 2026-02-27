import * as mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ParsedDocxPage {
    pageNumber: number;
    content: string; // HTML content
    wordCount: number;
}

interface ParsedIllustration {
    pageNumber: number;
    positionIndex: number;
    imageData: Buffer;
    contentType: string;
}

export async function processDocx(bookId: string, storagePath: string) {
    console.log(`[docx-processor] Starting extraction for book ${bookId}...`);

    // 1. Download DOCX from Supabase
    const { data: fileData, error: downloadError } = await supabase.storage
        .from("book-docs")
        .download(storagePath);

    if (downloadError || !fileData) {
        throw new Error(`Failed to download DOCX: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const illustrations: ParsedIllustration[] = [];
    let illustrationCounter = 0;

    // 2. Mammoth Options
    const options = {
        transformDocument: (element: any) => {
            // Traverse the document and look for manual page breaks
            if (element.children) {
                element.children = element.children.map(options.transformDocument);
            }

            // Word inserts page breaks as <w:br w:type="page"/>
            // Mammoth translates this to a run with breakId: "page"
            if (element.type === "run" && element.breakId === "page") {
                return {
                    ...element,
                    type: "paragraph",
                    children: [{ type: "text", value: "[:PAGE_BREAK:]" }]
                };
            }
            return element;
        },
        convertImage: (mammoth.images as any).inline((element: any) => {
            return element.read().then((imageBuffer: Buffer) => {
                const currentCount = illustrationCounter++;

                illustrations.push({
                    pageNumber: 1,
                    positionIndex: currentCount,
                    imageData: imageBuffer,
                    contentType: element.contentType
                });

                return {
                    src: `__ILLUSTRATION_${currentCount}__`
                };
            });
        })
    };

    // 3. Convert to HTML
    const result = await mammoth.convertToHtml({ buffer }, options);
    let fullHtml = result.value;

    // 4. Split into "Pages"
    // We now split primarily on our custom [:PAGE_BREAK:] marker.
    // If no markers are found, we fall back to the character-limit strategy.

    let pageHtmls: string[] = [];

    if (fullHtml.includes("[:PAGE_BREAK:]")) {
        console.log(`[docx-processor] Detected manual page breaks. Splitting accordingly.`);
        pageHtmls = fullHtml.split("<p>[:PAGE_BREAK:]</p>");
        // Clean up any nested versions if they exist
        pageHtmls = pageHtmls.map(h => h.replace(/\[:PAGE_BREAK:\]/g, ""));
    } else {
        console.log(`[docx-processor] No manual page breaks found. Using virtual splitting.`);
        const MAX_PAGE_LENGTH = 1500; // ~250-300 words, feels like a real book page
        let remainingHtml = fullHtml;
        while (remainingHtml.length > 0) {
            let splitIdx = MAX_PAGE_LENGTH;
            if (remainingHtml.length > MAX_PAGE_LENGTH) {
                const nextTag = remainingHtml.indexOf('</p>', MAX_PAGE_LENGTH);
                if (nextTag !== -1) splitIdx = nextTag + 4;
            } else {
                splitIdx = remainingHtml.length;
            }
            pageHtmls.push(remainingHtml.substring(0, splitIdx));
            remainingHtml = remainingHtml.substring(splitIdx);
        }
    }

    const pages: ParsedDocxPage[] = pageHtmls.map((html, idx) => ({
        pageNumber: idx + 1,
        content: html,
        wordCount: html.replace(/<[^>]*>/g, '').split(/\s+/).length
    }));

    console.log(`[docx-processor] Generated ${pages.length} pages.`);

    // 5. Upload Illustrations and Replace Placeholders
    for (const illust of illustrations) {
        const fileName = `${bookId}/illust_${illust.positionIndex}.${illust.contentType.split('/')[1]}`;

        const { error: uploadErr } = await supabase.storage
            .from("book-illustrations")
            .upload(fileName, illust.imageData, {
                contentType: illust.contentType,
                upsert: true
            });

        if (uploadErr) {
            console.error(`[docx-processor] Illustration upload failed: ${uploadErr.message}`);
            continue;
        }

        const { data: publicUrl } = supabase.storage
            .from("book-illustrations")
            .getPublicUrl(fileName);

        // Replace the placeholder in the appropriate page content
        const searchPlaceholder = `__ILLUSTRATION_${illust.positionIndex}__`;
        pages.forEach(p => {
            p.content = p.content.replace(searchPlaceholder, publicUrl.publicUrl);
        });

        // Save illustration record to database
        await supabase.from("book_illustrations").insert({
            book_id: bookId,
            image_url: publicUrl.publicUrl,
            page_number: 1, // We treat docx as logical flow, but for DB we can anchor to page 1
            position_index: illust.positionIndex
        });
    }

    // 6. Save Pages to Database
    // Clear existing pages first
    await supabase.from("book_pages").delete().eq("book_id", bookId);

    for (const page of pages) {
        await supabase.from("book_pages").insert({
            book_id: bookId,
            page_number: page.pageNumber,
            page_image_url: "RES_DOCX", // Marker to indicate no PDF image
            content: page.content,
            word_count: page.wordCount
        });
    }

    // 7. Mark Book as Published
    await supabase.from("books").update({ status: 'published' }).eq("id", bookId);

    return {
        pages: pages.length,
        illustrations: illustrations.length
    };
}
