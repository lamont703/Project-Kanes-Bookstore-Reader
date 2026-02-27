import * as mupdf from 'mupdf';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF Image Construction Scripture
 */

const PDF_PATH = "public/Brute Syndicate Volume 3.pdf";

async function main() {
    console.log("🚀 Probing Image Object creation...");

    const fileBytes = new Uint8Array(fs.readFileSync(path.join(process.cwd(), PDF_PATH)));
    const doc = mupdf.Document.openDocument(fileBytes, "application/pdf");
    const page = doc.loadPage(3); // Page 4 (index 3) has an image
    const pageObj = page.getObject();
    const xobjDict = pageObj.get("Resources").get("XObject");
    const im0 = xobjDict.get("Im0");

    console.log("   Found Im0 object. Is Stream?", im0.isStream());

    if (im0.isStream()) {
        try {
            console.log("   --- Attempt 1: new mupdf.Image(object) ---");
            // @ts-ignore
            const img = new mupdf.Image(im0);
            console.log("   ✅ Success!");
        } catch (e: any) {
            console.log("   ❌ Error:", e.message);
        }

        try {
            console.log("   --- Attempt 2: new mupdf.Image(buffer) ---");
            const stream = im0.readStream();
            // @ts-ignore
            const img = new mupdf.Image(stream);
            console.log("   ✅ Success!");
        } catch (e: any) {
            console.log("   ❌ Error:", e.message);
        }
    }
}

main().catch(err => console.error(err));
