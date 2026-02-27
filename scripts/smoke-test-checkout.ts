import fs from 'fs';
import path from 'path';

// Manual .env loader
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function smokeTest() {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
        return;
    }

    const functionUrl = `${SUPABASE_URL}/functions/v1/process-checkout`;

    console.log(`🚀 Testing Checkout Function at: ${functionUrl}`);

    // Mock Payload
    const payload = {
        items: [
            {
                bookId: "test-book-id",
                variantId: "test-variant-id",
                format: "ebook",
                quantity: 1
            }
        ],
        promoCode: "WELCOME35"
    };

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("-----------------------------------------");
        console.log("📡 Response Status:", response.status);
        console.log("📦 Response Data:", JSON.stringify(data, null, 2));
        console.log("-----------------------------------------");

        if (response.status === 200) {
            console.log("✅ Success! The function is responding correctly.");
        } else {
            console.log("⚠️  Received response. Check Supabase logs if result is unexpected.");
        }
    } catch (error) {
        console.error("💥 Network Error or Crash:", error);
    }
}

smokeTest();
