import * as mupdf from 'mupdf';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF Document Methods Scripture
 */

async function main() {
    const fileBytes = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public/Brute Syndicate Volume 3.pdf")));
    const doc = mupdf.Document.openDocument(fileBytes, "application/pdf");

    console.log("--- Document Methods ---");
    const prototype = Object.getPrototypeOf(doc);
    const methods = Object.getOwnPropertyNames(prototype).filter(m => !m.startsWith("_"));
    console.log(methods.join(", "));
}

main().catch(err => console.error(err));
