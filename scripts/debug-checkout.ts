import { handleCheckout } from '../supabase/functions/process-checkout/handler.ts';
import "https://deno.land/std@0.177.0/dotenv/load.ts";

/**
 * DEBUG SCRIPT: Test Checkout Logic Locally
 * 
 * This script runs the handleCheckout function in your local terminal.
 * It helps identify if the imports (Stripe, Supabase) are triggering
 * Node.js polyfills that cause the Deno.core.runMicrotasks error.
 * 
 * RUN COMMAND:
 * deno run -A scripts/debug-checkout.ts
 */

async function testCheckout() {
    console.log("🚀 Starting Local Checkout Debug...");

    // 1. Mock Data
    // Replace with a valid JWT if you want to test real Auth, 
    // or we can mock the user retrieval in the handler for pure logic testing.
    const mockAuthHeader = "Bearer INVALID_TOKEN_FOR_LOG_ONLY";

    // Replace with actual IDs from your DB to test real database logic
    const mockBody = {
        items: [
            {
                bookId: "any-book-id",
                variantId: "any-variant-id",
                format: "ebook",
                quantity: 1
            }
        ],
        promoCode: "WELCOME"
    };

    console.log("📦 Mock Body:", JSON.stringify(mockBody, null, 2));

    try {
        console.log("🔗 Calling handleCheckout...");
        // Note: This will likely fail with a 401 unless you provide a real JWT,
        // but it will confirm if the Stripe/Supabase client initialization crashes
        // with the 'Deno.core.runMicrotasks' error immediately.
        const result = await handleCheckout(mockAuthHeader, mockBody);
        console.log("✅ Success Result:", result);
    } catch (error: any) {
        console.error("❌ Caught Error:");
        if (error.stack) {
            console.error(error.stack);
        } else {
            console.error(JSON.stringify(error, null, 2));
        }

        if (error.message?.includes("runMicrotasks")) {
            console.error("\n🔥 ALERT: REPRODUCED THE MICROTASK ERROR!");
        }
    }
}

testCheckout();
