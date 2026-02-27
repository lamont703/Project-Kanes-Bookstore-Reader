
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BOOK_ID = "13a1295a-3156-497d-b80d-f85589c11fda";

async function publishBook() {
    console.log(`🚀 Publishing book ${BOOK_ID}...`);
    const { error } = await supabase
        .from("books")
        .update({ status: 'published' })
        .eq("id", BOOK_ID);

    if (error) {
        console.error("❌ Failed to publish book:", error.message);
    } else {
        console.log("✅ Book status updated to 'published'!");
    }
}

publishBook();
