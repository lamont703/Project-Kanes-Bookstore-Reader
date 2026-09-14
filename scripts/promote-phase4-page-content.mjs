/**
 * Phase 4 — copy the marketing page content from staging to production.
 *
 * NOT scripts/seed-page-content.py. That seeder writes generic starter content
 * and still emits the retired `kometbooks` / `komet-book-club` slugs while
 * missing `browse` and `book-club`. Staging carries the real thing: custom hero
 * art, the six book club benefit cards, rewritten copy — edited through the page
 * editor over weeks. Seeding production would produce a different, blanker site.
 *
 * Two halves, and the second is the one that is easy to forget:
 *
 *   1. The rows — pages and page_versions.
 *   2. The IMAGES those rows point at. They live in staging's `page-images`
 *      bucket, so copying the JSON alone would leave production serving its own
 *      homepage art from the staging project, forever, and breaking the day
 *      staging is cleaned up. Each referenced file is copied into production's
 *      bucket and every URL rewritten to match.
 *
 * Only referenced images are copied. Staging's bucket also holds abandoned
 * uploads from editing sessions; there is no reason to carry those across.
 *
 * `updated_by` is nulled. It is a foreign key to auth.users, and the staging
 * editors have no accounts on production — "nobody on this project edited this"
 * is both true and the only value that satisfies the constraint.
 *
 * Idempotent: re-running replaces the page rows and skips images already
 * present, so a partial failure can simply be re-run.
 *
 * Usage:
 *   node scripts/promote-phase4-page-content.mjs            # dry run
 *   node scripts/promote-phase4-page-content.mjs --confirm
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"

const CONFIRM = process.argv.includes("--confirm")

const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }),
)

const SOURCE_URL = env.NEXT_PUBLIC_SUPABASE_STAGING_URL
const SOURCE_KEY = env.SUPABASE_STAGING_SERVICE_ROLE_KEY
const TARGET_URL = env.NEXT_PUBLIC_SUPABASE_URL
const TARGET_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const ref = (u) => (u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) ?? [])[1] ?? "?"
const SOURCE_REF = ref(SOURCE_URL)
const TARGET_REF = ref(TARGET_URL)

console.log(`source : ${SOURCE_REF} (staging)`)
console.log(`target : ${TARGET_REF} (production)`)
console.log(`mode   : ${CONFIRM ? "APPLY" : "dry run"}\n`)

if (SOURCE_REF === TARGET_REF) {
    console.error("source and target are the same project — refusing")
    process.exit(1)
}

const src = createClient(SOURCE_URL, SOURCE_KEY)
const dst = createClient(TARGET_URL, TARGET_KEY)

// ── read the source ────────────────────────────────────────────────────────
const { data: pages, error: readErr } = await src
    .from("pages")
    .select("id, slug, title, page_versions(state, document, published_at)")
    .order("slug")

if (readErr) { console.error("could not read staging pages:", readErr.message); process.exit(1) }

const STORAGE_RE = new RegExp(
    `https://${SOURCE_REF}\\.supabase\\.co/storage/v1/object/public/page-images/([^"\\\\]+)`,
    "g",
)

const referenced = new Set()
for (const p of pages) {
    for (const v of p.page_versions) {
        for (const m of JSON.stringify(v.document).matchAll(STORAGE_RE)) referenced.add(m[1])
    }
}

console.log(`pages          : ${pages.length}`)
console.log(`page_versions  : ${pages.reduce((n, p) => n + p.page_versions.length, 0)}`)
console.log(`images to copy : ${referenced.size}\n`)

if (!CONFIRM) {
    for (const p of pages) console.log(`  would copy  ${p.slug.padEnd(16)} ${p.page_versions.length} version(s)`)
    console.log("\nDRY RUN — nothing written. Re-run with --confirm.")
    process.exit(0)
}

// ── 1. images ──────────────────────────────────────────────────────────────
const { data: existing } = await dst.storage.from("page-images").list("", { limit: 1000 })
const already = new Set((existing ?? []).map((f) => f.name))

let copied = 0, skipped = 0
for (const name of referenced) {
    if (already.has(name)) { skipped++; continue }
    const publicUrl = `${SOURCE_URL}/storage/v1/object/public/page-images/${name}`
    const res = await fetch(publicUrl)
    if (!res.ok) { console.error(`  image FAILED to download: ${name} (${res.status})`); process.exit(1) }
    const body = Buffer.from(await res.arrayBuffer())
    const { error } = await dst.storage.from("page-images").upload(name, body, {
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
        upsert: true,
    })
    if (error) { console.error(`  image FAILED to upload: ${name} — ${error.message}`); process.exit(1) }
    copied++
}
console.log(`images         : ${copied} copied, ${skipped} already present`)

// ── 2. rows, with URLs pointed at the target project ───────────────────────
let rewrites = 0
for (const p of pages) {
    const { error: pageErr } = await dst.from("pages")
        .upsert({ id: p.id, slug: p.slug, title: p.title }, { onConflict: "slug" })
    if (pageErr) { console.error(`  page ${p.slug} FAILED: ${pageErr.message}`); process.exit(1) }

    // Replace rather than append, so a re-run cannot leave two drafts behind.
    await dst.from("page_versions").delete().eq("page_id", p.id)

    for (const v of p.page_versions) {
        const before = JSON.stringify(v.document)
        const after = before.replaceAll(
            `https://${SOURCE_REF}.supabase.co/storage/v1/object/public/page-images/`,
            `https://${TARGET_REF}.supabase.co/storage/v1/object/public/page-images/`,
        )
        rewrites += (before.match(STORAGE_RE) ?? []).length

        const { error } = await dst.from("page_versions").insert({
            page_id: p.id,
            state: v.state,
            document: JSON.parse(after),
            published_at: v.published_at,
            updated_by: null,   // staging editors have no auth.users row here
        })
        if (error) { console.error(`  ${p.slug}/${v.state} FAILED: ${error.message}`); process.exit(1) }
    }
    console.log(`  ${p.slug.padEnd(16)} ${p.page_versions.length} version(s)`)
}
console.log(`url rewrites   : ${rewrites}`)

// ── 3. verify ──────────────────────────────────────────────────────────────
const { data: check } = await dst.from("pages").select("slug, page_versions(state, document)").order("slug")
let stale = 0, live = 0
for (const p of check ?? []) {
    for (const v of p.page_versions) {
        const j = JSON.stringify(v.document)
        stale += (j.match(new RegExp(SOURCE_REF, "g")) ?? []).length
        live += (j.match(new RegExp(TARGET_REF, "g")) ?? []).length
    }
}
console.log(`\nverification`)
console.log(`  pages on target        : ${(check ?? []).length}`)
console.log(`  image urls -> target   : ${live}`)
console.log(`  image urls -> staging  : ${stale}   ${stale === 0 ? "(good — no dependency on staging)" : "*** STILL POINTING AT STAGING ***"}`)
if (stale > 0) process.exit(1)
