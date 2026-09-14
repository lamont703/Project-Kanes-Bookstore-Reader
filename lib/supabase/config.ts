/**
 * Which Supabase project this deployment talks to.
 *
 * Staging-prefixed variables win when present, so a Vercel Preview environment
 * is pointed at the staging branch by ADDING three variables rather than
 * overwriting the production ones. Production keeps its existing values and is
 * never edited:
 *
 *   NEXT_PUBLIC_SUPABASE_STAGING_URL       -> https://oplyizxbzmwdodctsnxv.supabase.co
 *   NEXT_PUBLIC_SUPABASE_STAGING_ANON_KEY  -> staging anon key
 *   SUPABASE_STAGING_SERVICE_ROLE_KEY      -> staging service_role key
 *
 * ⚠️  Set these on the PREVIEW environment ONLY.
 *
 * Resolution is by presence, not by environment name — there is no reliable
 * client-side signal for which Vercel environment a bundle was built for. So if
 * a STAGING_* variable is ever set on Production, production silently starts
 * reading the staging database. That is the one failure mode to guard against;
 * see assertSupabaseTarget() below, which surfaces it in server logs.
 *
 * NEXT_PUBLIC_* values are inlined at BUILD time, so changing any of these
 * requires a redeploy — editing them in Vercel alone changes nothing.
 */

export const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!

export const SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_STAGING_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Server-only. On the client this resolves to undefined rather than leaking —
 * Next.js only inlines NEXT_PUBLIC_* into browser bundles — but never import it
 * into a client component: you would get a silent undefined, not an error.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

/** True when the staging overrides are in play. */
export const IS_STAGING_TARGET = Boolean(process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL)

/**
 * Logged once at build/boot so which database a deployment is using is visible
 * in the build output instead of inferred from symptoms.
 */
export function describeSupabaseTarget(): string {
    const ref = (SUPABASE_URL ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown"
    return `Supabase target: ${ref} (${IS_STAGING_TARGET ? "STAGING override" : "default/production"})`
}

// Announce the target once per server process. This shows up in the Vercel
// build log and in function logs, so which database a deployment is talking to
// is stated outright rather than inferred from symptoms like a suspiciously
// small prerendered page count.
if (typeof window === "undefined") {
    const g = globalThis as { __supabaseTargetLogged?: boolean }
    if (!g.__supabaseTargetLogged) {
        g.__supabaseTargetLogged = true
        console.log(`🎯 ${describeSupabaseTarget()}`)
    }
}
