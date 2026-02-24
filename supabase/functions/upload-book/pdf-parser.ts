/**
 * PDF Parser for Deno (Supabase Edge Functions)
 * 
 * Handles the conversion of PDF pages into WebP images to preserve exact visual layout.
 * Uses MuPDF WASM for high-fidelity PDF rendering.
 * 
 * Architecture:
 *   PDF File → MuPDF (WASM) → Page Pixmap (raw RGBA) → WebP Encoder → Uint8Array
 * 
 * If the WASM module is unavailable (e.g., local dev or CI), falls back to
 * a lightweight placeholder pipeline that creates a styled SVG per page.
 */

export interface ParsedPage {
    pageNumber: number;
    imageData: Uint8Array;      // Full page image (WebP/PNG/SVG)
    contentType: string;
    width: number;
    height: number;
    textContent: string;        // Plain text for search
    structuredContent: {        // Ordered blocks for reflowable reader
        type: 'text' | 'image';
        content?: string;       // For text blocks
        imageIndex?: number;    // For image blocks (refers to illustrations table)
        width?: number;
        height?: number;
    }[];
}

export interface ParsedIllustration {
    pageNumber: number;
    positionIndex: number;
    imageData: Uint8Array;
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

// ─── Configuration ─────────────────────────────────────────────
const RENDER_DPI = 150;           // Balance between quality and file size
const MAX_PAGE_DIMENSION = 1600;  // Cap rendered image dimension
const WEBP_QUALITY = 85;         // WebP compression quality (0-100)

/**
 * Parse a PDF file into individual page images and extracted text.
 * 
 * This is the core rendering pipeline. It attempts to use the MuPDF WASM
 * module for production-quality rendering. If that's unavailable, it falls
 * back to generating styled SVG placeholder pages.
 */
export async function parsePDF(file: File): Promise<PDFParseResult> {
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    console.log(`[pdf-parser] Processing "${file.name}" (${formatBytes(file.size)})`);

    // Attempt real WASM-based rendering
    try {
        return await parseWithMuPDF(fileBytes, file.name);
    } catch (wasmError: any) {
        console.warn(`[pdf-parser] WASM renderer unavailable: ${wasmError.message}`);
        console.log("[pdf-parser] Falling back to PDF stream parser...");
        return await parseWithStreamParser(fileBytes, file.name, file.size);
    }
}

// ─── Primary: MuPDF WASM Renderer ──────────────────────────────
async function parseWithMuPDF(
    fileBytes: Uint8Array,
    fileName: string
): Promise<PDFParseResult> {
    // Dynamic import of MuPDF WASM module
    // Switching to unpkg which often handles WASM sidecars more reliably in Deno
    const mupdf = await import("https://unpkg.com/mupdf@0.5.0/dist/mupdf.js");

    const doc = mupdf.Document.openDocument(fileBytes, fileName);
    const pageCount = doc.countPages();

    console.log(`[pdf-parser] MuPDF loaded — ${pageCount} pages detected`);

    const pages: ParsedPage[] = [];
    const illustrations: ParsedIllustration[] = [];

    for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        const bounds = page.getBounds();

        // Calculate render dimensions based on DPI
        const scale = RENDER_DPI / 72; // PDF units are 72 DPI
        let width = Math.round((bounds[2] - bounds[0]) * scale);
        let height = Math.round((bounds[3] - bounds[1]) * scale);

        // Cap maximum dimension
        if (width > MAX_PAGE_DIMENSION || height > MAX_PAGE_DIMENSION) {
            const ratio = Math.min(MAX_PAGE_DIMENSION / width, MAX_PAGE_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        // Create pixmap and clear to white
        const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, height], false);
        pixmap.clear(255);

        // Draw page onto pixmap with correct scaling
        const drawDevice = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
        try {
            const matrix = mupdf.Matrix.scale(width / (bounds[2] - bounds[0]), height / (bounds[3] - bounds[1]));
            page.run(drawDevice, matrix, new mupdf.Cookie());
        } finally {
            drawDevice.close();
        }

        // Convert pixmap to PNG
        const pngData = pixmap.asPNG();

        // Extract structured content (text and images in order)
        const structuredText = page.toStructuredText("preserve-whitespace");
        const blocks: any[] = [];
        let pagePlainText = "";

        // Iterate through blocks (MuPDF identifies text, images, etc.)
        const jsonStr = structuredText.asJSON?.();
        const mupdfBlocks = jsonStr ? JSON.parse(jsonStr).blocks : [];

        if (mupdfBlocks && mupdfBlocks.length > 0) {
            mupdfBlocks.forEach((block: any) => {
                if (block.type === 'text') {
                    let blockText = "";
                    block.lines.forEach((line: any) => {
                        line.spans.forEach((span: any) => {
                            blockText += span.text;
                        });
                        blockText += " "; // Add space between lines
                    });
                    blocks.push({ type: 'text', content: blockText.trim() });
                    pagePlainText += blockText + "\n";
                } else if (block.type === 'image') {
                    // Extract the actual illustration
                    const imgBBox = block.bbox; // [x0, y0, x1, y1]
                    const imgWidth = Math.round(imgBBox[2] - imgBBox[0]);
                    const imgHeight = Math.round(imgBBox[3] - imgBBox[1]);

                    // Only extract significant images
                    if (imgWidth > 30 && imgHeight > 30) {
                        try {
                            // Extract precisely the image block
                            const illustPixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, imgWidth, imgHeight], false);
                            illustPixmap.clear(255);
                            const illustDev = new mupdf.DrawDevice(mupdf.Matrix.identity, illustPixmap);
                            try {
                                // Translate the page so the image is at (0,0)
                                const illustMatrix = mupdf.Matrix.translate(-imgBBox[0], -imgBBox[1]);
                                page.run(illustDev, illustMatrix, new mupdf.Cookie());
                            } finally {
                                illustDev.close();
                            }

                            const illustPng = illustPixmap.asPNG();
                            const positionIndex = illustrations.length;

                            illustrations.push({
                                pageNumber: i + 1,
                                positionIndex,
                                imageData: new Uint8Array(illustPng),
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
                            console.warn(`[pdf-parser] Illustration extraction error on p${i + 1}:`, illustErr);
                        }
                    }
                }
            });
        } else {
            // Fallback for simple text extraction if JSON is unavailable
            const text = structuredText.asText();
            pagePlainText = text;
            blocks.push({ type: 'text', content: text });
        }

        pages.push({
            pageNumber: i + 1,
            imageData: new Uint8Array(pngData),
            contentType: "image/png",
            width,
            height,
            textContent: pagePlainText,
            structuredContent: blocks,
        });

        console.log(`[pdf-parser] Page ${i + 1}/${pageCount} processed with ${blocks.length} content blocks`);
    }

    return {
        pages,
        illustrations,
        metadata: {
            title: doc.getMetaData("info:Title") || undefined,
            author: doc.getMetaData("info:Author") || undefined,
            pageCount,
            fileSizeBytes: fileBytes.length,
        },
    };
}

// ─── Fallback: PDF Stream Parser ───────────────────────────────
/**
 * Lightweight fallback that parses the PDF's internal streams to
 * extract page count and text, then generates styled SVG pages.
 * 
 * This is used when the MuPDF WASM module isn't available (local dev, CI).
 * The SVGs are functional placeholders that preserve the page structure
 * and allow the full reader pipeline to be tested end-to-end.
 */
async function parseWithStreamParser(
    fileBytes: Uint8Array,
    fileName: string,
    fileSize: number,
): Promise<PDFParseResult> {
    // Parse the PDF cross-reference table to count pages
    const pdfText = new TextDecoder("latin1").decode(fileBytes);
    const pageCount = countPDFPages(pdfText);
    const textBlocks = extractPDFTextBlocks(pdfText);

    console.log(`[pdf-parser] Stream parser found ${pageCount} pages, ${textBlocks.length} text blocks`);

    const pages: ParsedPage[] = [];

    for (let i = 0; i < pageCount; i++) {
        const pageNumber = i + 1;
        const pageText = textBlocks[i] || `Page ${pageNumber}`;

        // Generate a styled SVG representing this page
        const svg = generatePageSVG(pageNumber, pageCount, pageText, fileName);
        const svgBytes = new TextEncoder().encode(svg);

        pages.push({
            pageNumber,
            imageData: svgBytes,
            contentType: "image/svg+xml",
            width: 612,   // Standard US Letter width in points
            height: 792,  // Standard US Letter height in points
            textContent: pageText,
            structuredContent: [{ type: 'text', content: pageText }],
        });
    }

    return {
        pages,
        illustrations: [],
        metadata: {
            pageCount,
            fileSizeBytes: fileSize,
        },
    };
}

/**
 * Count pages by looking for /Type /Page entries in the PDF structure.
 * Falls back to searching for page-tree Count if direct counting fails.
 */
function countPDFPages(pdfText: string): number {
    // Method 1: Count /Type /Page (not /Pages) objects
    const pageMatches = pdfText.match(/\/Type\s*\/Page(?!s)/g);
    if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
    }

    // Method 2: Look for /Count in the Pages dictionary
    const countMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (countMatch) {
        return parseInt(countMatch[1], 10);
    }

    // Absolute minimum fallback
    return 1;
}

/**
 * Extract readable text blocks from PDF content streams.
 * Handles both Tj (show string) and TJ (show strings) operators.
 */
function extractPDFTextBlocks(pdfText: string): string[] {
    const blocks: string[] = [];

    // Extract text between BT (begin text) and ET (end text) markers
    const textSections = pdfText.match(/BT[\s\S]*?ET/g) || [];

    for (const section of textSections) {
        let sectionText = "";

        // Match Tj operator: (text) Tj
        const tjMatches = section.match(/\(([^)]*)\)\s*Tj/g) || [];
        for (const match of tjMatches) {
            const textMatch = match.match(/\(([^)]*)\)/);
            if (textMatch) sectionText += textMatch[1] + " ";
        }

        // Match TJ operator: [(text)(text)] TJ
        const tjArrayMatches = section.match(/\[([^\]]*)\]\s*TJ/g) || [];
        for (const match of tjArrayMatches) {
            const innerTexts = match.match(/\(([^)]*)\)/g) || [];
            for (const inner of innerTexts) {
                const cleaned = inner.replace(/[()]/g, "");
                sectionText += cleaned;
            }
            sectionText += " ";
        }

        if (sectionText.trim()) {
            blocks.push(sectionText.trim());
        }
    }

    return blocks;
}

/**
 * Generate a styled SVG page that serves as a visual placeholder.
 * The SVG preserves page proportions and displays extracted text.
 */
function generatePageSVG(
    pageNumber: number,
    totalPages: number,
    text: string,
    fileName: string,
): string {
    const width = 612;
    const height = 792;
    const margin = 60;

    // Truncate text to fit the page reasonably
    const maxChars = 5000;
    const displayText = text.length > maxChars ? text.substring(0, maxChars) + "..." : text;

    // Word-wrap the text into lines
    const lines = wordWrap(displayText, 75);
    const lineHeight = 16;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .page-bg { fill: #fdfbf5; }
      .page-border { fill: none; stroke: #e0dcd4; stroke-width: 1; }
      .page-header { font-family: Georgia, 'Times New Roman', serif; font-size: 11px; fill: #999; }
      .page-number { font-family: Georgia, 'Times New Roman', serif; font-size: 12px; fill: #666; text-anchor: middle; }
      .page-text { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; fill: #333; line-height: ${lineHeight}px; }
      .page-decoration { fill: none; stroke: #d4c9a8; stroke-width: 0.5; }
    </style>
  </defs>

  <!-- Page background -->
  <rect class="page-bg" width="${width}" height="${height}" rx="2" />
  <rect class="page-border" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="2" />

  <!-- Header decoration line -->
  <line class="page-decoration" x1="${margin}" y1="${margin - 10}" x2="${width - margin}" y2="${margin - 10}" />

  <!-- Header -->
  <text class="page-header" x="${margin}" y="${margin - 20}">${escapeXml(fileName.replace(/\.pdf$/i, ""))}</text>

  <!-- Body text -->
  <text class="page-text" x="${margin}" y="${margin + 20}">
    ${lines.map((line, i) => `<tspan x="${margin}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("\n    ")}
  </text>

  <!-- Footer decoration line -->
  <line class="page-decoration" x1="${margin}" y1="${height - margin + 10}" x2="${width - margin}" y2="${height - margin + 10}" />

  <!-- Page number -->
  <text class="page-number" x="${width / 2}" y="${height - margin + 30}">${pageNumber}</text>
</svg>`;
}

// ─── Utilities ─────────────────────────────────────────────────

function wordWrap(text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if ((currentLine + " " + word).trim().length > maxWidth) {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + " " + word : word;
        }
    }
    if (currentLine) lines.push(currentLine.trim());

    return lines;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
