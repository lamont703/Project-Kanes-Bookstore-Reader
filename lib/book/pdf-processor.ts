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
 */
function cleanText(textContent: string): string {
    let text = textContent || "";
    text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
    text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ");
    text = text
        .replace(/ﬁ/g, "fi")
        .replace(/ﬂ/g, "fl")
        .replace(/ﬀ/g, "ff")
        .replace(/ﬃ/g, "ffi")
        .replace(/ﬄ/g, "ffl");
    text = text.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.replace(/[ \t]{2,}/g, " ");

    const lines = text.split("\n");
    const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (/^\d{1,4}$/.test(trimmed)) return false;
        if (trimmed.length > 0 && trimmed.length < 4 && !/[a-zA-Z]{2,}/.test(trimmed)) return false;
        return true;
    });

    return filtered.join("\n").trim();
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
        const blocks: any[] = [];
        let pagePlainText = "";

        const jsonStr = structuredText.asJSON?.();
        let mupdfBlocks: any[] = [];

        try {
            if (jsonStr) {
                const parsed = JSON.parse(jsonStr);
                // MuPDF JSON can be { blocks: [] } or { pages: [{ blocks: [] }] }
                mupdfBlocks = parsed.blocks || (parsed.pages && parsed.pages[0]?.blocks) || [];
            }
        } catch (err) {
            console.warn("[pdf-processor] Structured text JSON parse failed", err);
        }

        if (Array.isArray(mupdfBlocks) && mupdfBlocks.length > 0) {
            mupdfBlocks.forEach((block: any) => {
                if (block.type === 'text' && Array.isArray(block.lines)) {
                    let blockText = "";
                    block.lines.forEach((line: any) => {
                        if (Array.isArray(line.spans)) {
                            line.spans.forEach((span: any) => {
                                blockText += span.text || "";
                            });
                        }
                        blockText += " ";
                    });
                    const cleanedText = cleanText(blockText);
                    blocks.push({ type: 'text', content: cleanedText });
                    pagePlainText += blockText + "\n";
                } else if (block.type === 'image') {
                    const imgBBox = block.bbox;
                    const imgWidth = Math.round(imgBBox[2] - imgBBox[0]);
                    const imgHeight = Math.round(imgBBox[3] - imgBBox[1]);

                    if (imgWidth > 50 && imgHeight > 50) {
                        try {
                            const illustPixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, imgWidth, imgHeight], false);
                            illustPixmap.clear(255);
                            const illustDev = new mupdf.DrawDevice(mupdf.Matrix.identity, illustPixmap);
                            try {
                                const illustMatrix = mupdf.Matrix.translate(-imgBBox[0], -imgBBox[1]);
                                page.run(illustDev, illustMatrix);
                            } finally {
                                illustDev.close();
                            }

                            const illustPng = illustPixmap.asPNG();
                            const positionIndex = illustrations.length;

                            illustrations.push({
                                pageNumber: i + 1,
                                positionIndex,
                                imageData: Buffer.from(illustPng),
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
                        } catch (illustErr) {
                            console.warn(`Illustration error on page ${i + 1}:`, illustErr);
                        }
                    }
                }
            });
        } else {
            const text = structuredText.asText();
            pagePlainText = text;
            blocks.push({ type: 'text', content: cleanText(text) });
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
