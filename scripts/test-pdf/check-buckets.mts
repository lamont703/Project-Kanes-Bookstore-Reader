
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

async function checkBuckets() {
    console.log("🔍 Checking Storage Buckets...");
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("❌ Failed to list buckets:", error.message);
        return;
    }

    const seen = new Set(buckets.map(b => b.name));
    const required = ["book-docs", "book-covers", "book-pages", "book-illustrations"];

    required.forEach(name => {
        if (seen.has(name)) {
            console.log(`✅ Bucket "${name}" exists.`);
        } else {
            console.log(`❌ Bucket "${name}" is MISSING!`);
        }
    });
}

checkBuckets();
