import * as fs from 'fs';
import * as path from 'path';

// This script simulates the Edge Function calling the Vercel API
// but runs against a local instance if provided.

const VERCEL_URL = process.argv[2] || "http://localhost:3000";
const INTERNAL_SECRET = "kanes-komet-internal-api-secret-12345";
const BOOK_ID = "test-book-id-" + Date.now();
const STORAGE_PATH = "test/original.pdf";

async function testDelegation() {
    console.log(`🚀 Testing Vercel API at: ${VERCEL_URL}`);
    console.log(`📦 Mock Book ID: ${BOOK_ID}`);

    try {
        const response = await fetch(`${VERCEL_URL}/api/admin/process-book`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${INTERNAL_SECRET}`
            },
            body: JSON.stringify({
                bookId: BOOK_ID,
                storagePath: STORAGE_PATH,
                title: "Test Probe Book"
            })
        });

        console.log(`📡 Status: ${response.status}`);
        const text = await response.text();
        console.log(`📄 Response: ${text}`);
    } catch (err: any) {
        console.error(`❌ Request failed: ${err.message}`);
    }
}

testDelegation();
