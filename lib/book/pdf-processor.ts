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
    const fileBytes = new Uint8Array(fileBuffer);
    const doc = mupdf.Document.openDocument(fileBytes, fileName);
    const pageCount = doc.countPages();

    const pages: ParsedPage[] = [];
    const illustrations: ParsedIllustration[] = [];
    const seenXrefs = new Set<number>();

    // ─── Single Pass: Mining & Rendering ──────────────────────────
    for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        const pageNumber = i + 1;

        // 1. Extract Illustrations from Page Resources
        const pageObj = (page as any).getObject();
        const res = pageObj.get("Resources");
        if (res) {
            const xobjDict = res.get("XObject");
            if (xobjDict && xobjDict.isDictionary()) {
                const jsDict = (xobjDict as any).asJS();
                const keys = Object.keys(jsDict);

                for (const key of keys) {
                    const entry = xobjDict.get(key);
                    if (!entry) continue;

                    try {
                        const subtype = entry.get("Subtype")?.toString();
                        if (subtype === "/Image") {
                            const xref = (entry as any).getRef ? (entry as any).getRef() : null;
                            if (xref && seenXrefs.has(xref)) continue;
                            if (xref) seenXrefs.add(xref);

                            const image = (doc as any).loadImage(entry);
                            const pixmap = image.toPixmap();
                            const pngData = pixmap.asPNG();

                            illustrations.push({
                                pageNumber,
                                positionIndex: illustrations.length,
                                imageData: Buffer.from(pngData),
                                contentType: "image/png",
                                width: pixmap.getWidth(),
                                height: pixmap.getHeight(),
                            });
                        }
                    } catch (e) {
                        console.warn(`[pdf-processor] XObject extraction failed on page ${pageNumber}: ${key}`, e);
                    }
                }
            }
        }

        // 2. Render Page to PNG
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

        // 3. Extract Text and Structured Content
        const stext = page.toStructuredText("preserve-whitespace,images");
        const json = JSON.parse(stext.asJSON());
        const mupdfBlocks = json.blocks || (json.pages && json.pages[0]?.blocks) || [];

        const blocks: any[] = [];
        let pagePlainText = "";

        mupdfBlocks.forEach((block: any) => {
            if (block.type === 'text') {
                let blockText = "";
                block.lines?.forEach((line: any) => {
                    line.spans?.forEach((span: any) => {
                        blockText += span.text || "";
                    });
                    blockText += "\n";
                });
                const cleaned = cleanText(blockText);
                if (cleaned) {
                    blocks.push({ type: 'text', content: cleaned });
                    pagePlainText += blockText;
                }
            } else if (block.type === 'image') {
                const pageIllusts = illustrations.filter(ill => ill.pageNumber === pageNumber);
                if (pageIllusts.length > 0) {
                    blocks.push({
                        type: 'image',
                        imageIndex: pageIllusts[0].positionIndex,
                        width: block.bbox[2] - block.bbox[0],
                        height: block.bbox[3] - block.bbox[1]
                    });
                }
            }
        });

        // Fallback for empty pages
        if (blocks.length === 0) {
            const raw = stext.asText();
            if (raw.trim()) {
                blocks.push({ type: 'text', content: cleanText(raw) });
                pagePlainText = raw;
            }
        }

        pages.push({
            pageNumber,
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

