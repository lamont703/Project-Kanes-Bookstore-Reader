import * as mupdf from 'mupdf';
import * as fs from 'fs';
import * as path from 'path';

async function testOpen() {
    const pdfPath = path.join(process.cwd(), "public/Brute Syndicate Volume 3.pdf");
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileBytes = new Uint8Array(fileBuffer);

    console.log("Testing with 'application/pdf'...");
    try {
        const doc1 = mupdf.Document.openDocument(fileBytes, "application/pdf");
        console.log("✅ Success with 'application/pdf'");
    } catch (e: any) {
        console.log("❌ Failed with 'application/pdf':", e.message);
    }

    console.log("\nTesting with 'original.pdf'...");
    try {
        const doc2 = mupdf.Document.openDocument(fileBytes, "original.pdf");
        console.log("✅ Success with 'original.pdf'");
    } catch (e: any) {
        console.log("❌ Failed with 'original.pdf':", e.message);
    }
}

testOpen();
