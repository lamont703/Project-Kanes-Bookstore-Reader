
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

async function checkBucketConfig() {
    console.log("🔍 Checking Storage Bucket Config...");
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("❌ Failed to list buckets:", error.message);
        return;
    }

    buckets.forEach(bucket => {
        console.log(`\nBucket: ${bucket.name}`);
        console.log(`- Allowed Mime Types: ${JSON.stringify(bucket.allowed_mime_types)}`);
        console.log(`- Public: ${bucket.public}`);
        console.log(`- Size Limit: ${bucket.file_size_limit}`);
    });
}

checkBucketConfig();
