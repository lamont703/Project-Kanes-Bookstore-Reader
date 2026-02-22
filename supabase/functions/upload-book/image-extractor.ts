/**
 * Illustration Extractor for Deno (Supabase Edge Functions)
 * 
 * Identifies and extracts inline illustrations from parsed PDF pages.
 * Illustrations are stored separately from page images so they can be
 * displayed as thumbnails, used in book previews, or shown in a gallery.
 * 
 * Each illustration is associated with a page and position index
 * for accurate placement in the reading experience.
 */

import type { ParsedIllustration } from "./pdf-parser.ts";

/**
 * Extract illustrations from a PDF page's raw data.
 * 
 * In the MuPDF pipeline, this would analyze the page's structured text
 * to identify image objects, extract their bounds, and render them
 * as separate image files.
 * 
 * In the fallback pipeline, this returns an empty array since SVG
 * placeholders don't contain real illustrations.
 */
export async function extractIllustrations(
    _pageRawData: any,
    pageNumber: number,
): Promise<ParsedIllustration[]> {
    // In the production MuPDF pipeline, this would:
    // 1. Iterate over the page's display list
    // 2. Identify image XObjects
    // 3. Filter by minimum size (skip tiny decorative elements)
    // 4. Render each image at its native resolution
    // 5. Encode as WebP
    // 6. Return with position metadata

    // For now, return empty — illustrations will be added when
    // the MuPDF WASM integration is finalized.
    console.log(`[illustration-extractor] Page ${pageNumber}: scanning for inline images...`);

    return [];
}

/**
 * Determine if an image is likely a meaningful illustration
 * (vs. a decorative element like a rule line or bullet).
 * 
 * Heuristic: images smaller than 50×50 px are usually decorative.
 */
export function isSignificantImage(width: number, height: number): boolean {
    const MIN_DIMENSION = 50;
    const MIN_AREA = 5000; // 50×100 or similar

    return width >= MIN_DIMENSION && height >= MIN_DIMENSION && width * height >= MIN_AREA;
}
