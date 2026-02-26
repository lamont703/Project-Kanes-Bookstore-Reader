/**
 * PDF Processor for Node.js (Vercel API)
 * 
 * Handles high-fidelity rendering of PDF pages and text extraction
 * using the MuPDF native/WASM library.
 */

import * as mupdf from 'mupdf'

export interface ParsedPage {
    pageNumber: number;
    imageData: Buffer;
    contentType: string;
    width: number;
    height: number;
    textContent: string;
    structuredContent: any[];
}

export interface ParsedIllustration {
    pageNumber: number;
    positionIndex: number;
    imageData: Buffer;
    contentType: string;
    width: number;
    height: number;
    caption?: string;
}

export interface PDFParseResult {
    pages: ParsedPage[];
    illustrations: ParsedIllustration[];
    metadata: {
        title?: string;
        author?: string;
        pageCount: number;
        fileSizeBytes: number;
    };
}

const RENDER_DPI = 150;
const MAX_PAGE_DIMENSION = 1600;

/**
 * Clean and normalize extracted text from a parsed PDF page.
 * Optimized for reflowable display by joining broken lines and removing PDF noise.
 */
function cleanText(textContent: string): string {
    if (!textContent) return "";

    let text = textContent
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "") // Remove control chars
        .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ") // Normalize spaces
        // Ligatures
        .replace(/ﬁ/g, "fi")
        .replace(/ﬂ/g, "fl")
        .replace(/ﬀ/g, "ff")
        .replace(/ﬃ/g, "ffi")
        .replace(/ﬄ/g, "ffl")
        // Hyphenation at end of lines
        .replace(/(\w)-\s*\n\s*(\w)/g, "$1$2")
        // Clean multi-spaces
        .replace(/[ \t]{2,}/g, " ");

    const lines = text.split("\n");
    const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Filter out lone page numbers (1-4 digits)
        if (/^\d{1,4}$/.test(trimmed)) return false;

        // Filter out very short lines that look like crumbs (e.g. ".", "x", "1b")
        // But keep anything that has at least one vowel and 2+ characters
        if (trimmed.length < 3 && !/[aeiouAEIOU]/.test(trimmed)) return false;

        return true;
    });

    // Join with spaces for reflow, but preserve paragraph breaks if they exist
    return filtered.join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Calculate word count.
 */
function countWords(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
}

/**
 * Core MuPDF Parsing Logic
 */
export async function processPDF(fileBuffer: Buffer, fileName: string): Promise<PDFParseResult> {
    // Use new Uint8Array because mupdf expects typed arrays
    const fileBytes = new Uint8Array(fileBuffer);
    const doc = mupdf.Document.openDocument(fileBytes, fileName);
    const pageCount = doc.countPages();

    const pages: ParsedPage[] = [];
    const illustrations: ParsedIllustration[] = [];

    for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        const bounds = page.getBounds();

        const scale = RENDER_DPI / 72;
        let width = Math.round((bounds[2] - bounds[0]) * scale);
        let height = Math.round((bounds[3] - bounds[1]) * scale);

        if (width > MAX_PAGE_DIMENSION || height > MAX_PAGE_DIMENSION) {
            const ratio = Math.min(MAX_PAGE_DIMENSION / width, MAX_PAGE_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, height], false);
        pixmap.clear(255);

        const drawDevice = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
        try {
            const matrix = mupdf.Matrix.scale(width / (bounds[2] - bounds[0]), height / (bounds[3] - bounds[1]));
            page.run(drawDevice, matrix);
        } finally {
            drawDevice.close();
        }

        const pngData = pixmap.asPNG();
        const structuredText = page.toStructuredText("preserve-whitespace");
        const jsonStr = structuredText.asJSON?.();
        const blocks: any[] = [];
        let currentText = "";
        let pagePlainText = "";

        // Walk the structured text to catch exactly what MuPDF sees (Text + Images)
        structuredText.walk({
            beginTextBlock: () => {
                if (currentText.trim()) {
                    const cleaned = cleanText(currentText);
                    if (cleaned) blocks.push({ type: 'text', content: cleaned });
                }
                currentText = "";
            },
            onChar: (c) => {
                currentText += c;
                pagePlainText += c;
            },
            endLine: () => {
                currentText += " ";
                pagePlainText += "\n";
            },
            onImageBlock: (bbox, transform, image) => {
                // Flush existing text before image
                if (currentText.trim()) {
                    const cleaned = cleanText(currentText);
                    if (cleaned) blocks.push({ type: 'text', content: cleaned });
                }
                currentText = "";

                try {
                    const imgPixmap = image.toPixmap();
                    const imgPng = imgPixmap.asPNG();
                    const positionIndex = illustrations.length;

                    const imgWidth = image.getWidth();
                    const imgHeight = image.getHeight();

                    illustrations.push({
                        pageNumber: i + 1,
                        positionIndex,
                        imageData: Buffer.from(imgPng),
                        contentType: "image/png",
                        width: imgWidth,
                        height: imgHeight,
                    });

                    blocks.push({
                        type: 'image',
                        imageIndex: positionIndex,
                        width: imgWidth,
                        height: imgHeight
                    });
                } catch (err) {
                    console.warn(`[pdf-processor] Image extraction failed on page ${i + 1}`, err);
                }
            }
        });

        // Flush final text
        if (currentText.trim()) {
            const cleaned = cleanText(currentText);
            if (cleaned) blocks.push({ type: 'text', content: cleaned });
        }

        // Final Fallback: If no blocks were added, use absolute asText() source
        if (blocks.length === 0) {
            const absoluteText = structuredText.asText();
            if (absoluteText && absoluteText.trim()) {
                pagePlainText = absoluteText;
                blocks.push({ type: 'text', content: cleanText(absoluteText) });
            }
        }

        pages.push({
            pageNumber: i + 1,
            imageData: Buffer.from(pngData),
            contentType: "image/png",
            width,
            height,
            textContent: pagePlainText,
            structuredContent: blocks,
        });
    }

    return {
        pages,
        illustrations,
        metadata: {
            title: doc.getMetaData("info:Title") || fileName,
            author: doc.getMetaData("info:Author") || "Unknown",
            pageCount,
            fileSizeBytes: fileBytes.length,
        }
    };
}
