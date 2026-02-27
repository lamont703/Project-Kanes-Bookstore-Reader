import * as mupdf from 'mupdf';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF Dictionary Probing Scripture
 */

const PDF_PATH = "public/Brute Syndicate Volume 3.pdf";

async function main() {
    console.log("🚀 Probing PDF Object API...");

    const absolutePdfPath = path.join(process.cwd(), PDF_PATH);
    const fileBytes = new Uint8Array(fs.readFileSync(absolutePdfPath));
    const doc = mupdf.Document.openDocument(fileBytes, "application/pdf");

    const page = doc.loadPage(0);
    const pageObj = page.getObject();
    const res = pageObj.get("Resources");

    if (res) {
        console.log("--- Dictionary Methods ---");
        const prototype = Object.getPrototypeOf(res);
        const methods = Object.getOwnPropertyNames(prototype).filter(m => !m.startsWith("_"));
        console.log(methods.join(", "));

        // Try to see if it's an array or dict
        console.log(`Is Dictionary? ${res.isDictionary()}`);
        console.log(`Is Array? ${res.isArray()}`);
    } else {
        console.log("No Resources found.");
    }
}

main().catch(err => console.error(err));
