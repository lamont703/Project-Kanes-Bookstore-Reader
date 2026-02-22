/**
 * Text Extractor for Deno (Supabase Edge Functions)
 * 
 * Extracts plain text from parsed PDF pages for full-text search indexing.
 * This module operates on the text already extracted during the PDF parsing
 * phase, providing additional cleaning and normalization for search quality.
 * 
 * The extracted text is stored in `book_pages.content` and indexed by
 * PostgreSQL for search queries, while the reader itself displays the
 * page image (preserving exact PDF layout).
 */

import type { ParsedPage } from "./pdf-parser.ts";

/**
 * Clean and normalize extracted text from a parsed PDF page.
 * 
 * Raw PDF text often contains artifacts from the encoding/rendering
 * process. This function normalizes it for better search indexing:
 * - Removes control characters
 * - Collapses excessive whitespace
 * - Normalizes line breaks into spaces (for indexing, not display)
 * - Strips page headers/footers if detected
 * - Preserves paragraph boundaries where possible
 */
export function extractText(page: ParsedPage): string {
  let text = page.textContent || "";

  // 1. Remove null bytes and control characters (except newlines/tabs)
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

  // 2. Normalize unicode whitespace to standard spaces
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ");

  // 3. Replace ligatures with their expanded forms
  text = text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl");

  // 4. Fix common PDF text extraction artifacts
  // Hyphen at end of line followed by continuation = join words
  text = text.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2");

  // 5. Normalize line breaks: collapse multiple newlines into paragraph breaks
  text = text.replace(/\n{3,}/g, "\n\n");

  // 6. Collapse excessive spaces (but preserve paragraph structure)
  text = text.replace(/[ \t]{2,}/g, " ");

  // 7. Strip likely page headers/footers
  // Common patterns: standalone page numbers, repeated headers
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    // Skip standalone numbers (page numbers)
    if (/^\d{1,4}$/.test(trimmed)) return false;
    // Skip very short lines that are likely headers/footers
    if (trimmed.length > 0 && trimmed.length < 4 && !/[a-zA-Z]{2,}/.test(trimmed)) return false;
    return true;
  });

  text = filtered.join("\n").trim();

  return text;
}

/**
 * Calculate word count for a cleaned text block.
 * Used for reading time estimates and progress tracking.
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Generate a search-optimized version of the text.
 * Strips punctuation and normalizes case for better full-text search matching.
 */
export function toSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")  // Keep letters, numbers, hyphens, apostrophes
    .replace(/\s+/g, " ")
    .trim();
}
