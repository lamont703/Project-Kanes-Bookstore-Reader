import * as mupdf from 'mupdf';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF XObject Miner (loadImage approach)
 * 
 * Using doc.loadImage(entry) to correctly extract Image XObjects.
 */

const PDF_PATH = "public/Brute Syndicate Volume 3.pdf";
const OUTPUT_DIR = "scripts/test-pdf/outputs/brute-volume-3";

async function main() {
    console.log("🚀 Starting XObject Miner (doc.loadImage)...");

    const absolutePdfPath = path.join(process.cwd(), PDF_PATH);
    const absoluteOutputDir = path.join(process.cwd(), OUTPUT_DIR);

    if (!fs.existsSync(absolutePdfPath)) {
        console.error("❌ PDF file not found at:", absolutePdfPath);
        process.exit(1);
    }
    if (!fs.existsSync(absoluteOutputDir)) {
        fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    const fileBuffer = fs.readFileSync(absolutePdfPath);
    const fileBytes = new Uint8Array(fileBuffer);

    const doc = mupdf.Document.openDocument(fileBytes, "application/pdf");
    const pageCount = doc.countPages();
    console.log(`📑 Total Pages: ${pageCount}`);

    let globalImageCounter = 0;
    const seenXrefs = new Set<number>();

    for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        console.log(`\n--- Page ${i + 1} ---`);

        const pageObj = page.getObject();
        const res = pageObj.get("Resources");
        if (!res) continue;

        const xobjDict = res.get("XObject");
        if (!xobjDict || !xobjDict.isDictionary()) continue;

        const jsDict = xobjDict.asJS();
        const keys = Object.keys(jsDict);

        for (const key of keys) {
            const entry = xobjDict.get(key);
            if (!entry) continue;

            try {
                const subtype = entry.get("Subtype")?.toString();
                if (subtype === "/Image") {
                    const xref = entry.getRef ? entry.getRef() : null;
                    if (xref && seenXrefs.has(xref)) {
                        console.log(`   ♻️ Skipping duplicate Image: ${key}`);
                        continue;
                    }
                    if (xref) seenXrefs.add(xref);

                    globalImageCounter++;
                    const imgId = `p${i + 1}_${key}`;

                    const width = entry.get("Width")?.valueOf();
                    const height = entry.get("Height")?.valueOf();

                    console.log(`   📸 Extracting Image: ${key} (${width}x${height})`);

                    // Correct way to load an Image from a PDF object in this WASM build
                    const image = doc.loadImage(entry);
                    const pixmap = image.toPixmap();
                    const pngData = pixmap.asPNG();

                    const outputPath = path.join(absoluteOutputDir, `${imgId}.png`);
                    fs.writeFileSync(outputPath, Buffer.from(pngData));
                    console.log(`      ✅ Saved: ${outputPath}`);
                } else if (subtype === "/Form") {
                    // Could recurse here, but let's stick to simple ones first
                }
            } catch (e: any) {
                console.warn(`      ⚠️ Failed to extract ${key}:`, e.message);
            }
        }
    }

    console.log(`\n✨ Perfect! Total unique images extracted: ${globalImageCounter}`);
}

main().catch(err => console.error(err));
