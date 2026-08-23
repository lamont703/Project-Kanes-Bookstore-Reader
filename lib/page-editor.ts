"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { PageDocument } from "@/lib/page-content"

/**
 * Server actions behind the page editor.
 *
 * Every one of these goes through the cookie-aware client, so the caller's own
 * RLS applies and a non-admin is refused by the database rather than by the UI
 * alone. The publish and discard RPCs check the role a second time; that is
 * deliberate belt and braces on the one operation that changes what the public
 * sees.
 */

export interface PageSummary {
    slug: string
    title: string
    hasDraftChanges: boolean
    publishedAt: string | null
    updatedAt: string | null
}

/**
 * Public URLs a slug is served at, for cache revalidation.
 *
 * The homepage is reachable at more than one path: / on the app host, and /
 * plus /kanes-home on the apex. Revalidating only one would leave the others
 * serving the pre-publish copy for up to five minutes.
 */
function publicPaths(slug: string): string[] {
    return slug === "home" ? ["/", "/kanes-home"] : [`/${slug}`]
}

export async function listPages(): Promise<PageSummary[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("pages")
        .select("slug, title, page_versions(state, document, updated_at, published_at)")
        .order("title")

    if (error) {
        console.error("listPages failed:", error.message)
        return []
    }

    return (data ?? []).map((page: any) => {
        const versions = page.page_versions ?? []
        const draft = versions.find((v: any) => v.state === "draft")
        const published = versions.find((v: any) => v.state === "published")
        return {
            slug: page.slug,
            title: page.title,
            // Comparing the serialised documents answers "is there anything to
            // publish" directly, rather than keeping a dirty flag that could
            // drift out of step with the content.
            hasDraftChanges:
                JSON.stringify(draft?.document ?? null) !== JSON.stringify(published?.document ?? null),
            publishedAt: published?.published_at ?? null,
            updatedAt: draft?.updated_at ?? null,
        }
    })
}

export async function getDraft(
    slug: string,
): Promise<{ document: PageDocument; hasDraftChanges: boolean } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("pages")
        .select("slug, page_versions(state, document)")
        .eq("slug", slug)
        .maybeSingle()

    if (error || !data) {
        if (error) console.error(`getDraft(${slug}) failed:`, error.message)
        return null
    }

    const versions = (data as any).page_versions ?? []
    const draft = versions.find((v: any) => v.state === "draft")
    const published = versions.find((v: any) => v.state === "published")
    if (!draft) return null

    return {
        document: draft.document as PageDocument,
        hasDraftChanges:
            JSON.stringify(draft.document) !== JSON.stringify(published?.document ?? null),
    }
}

export async function saveDraft(
    slug: string,
    document: PageDocument,
): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: page, error: pageError } = await supabase
        .from("pages").select("id").eq("slug", slug).maybeSingle()
    if (pageError || !page) return { ok: false, error: pageError?.message ?? "page not found" }

    const { error } = await supabase
        .from("page_versions")
        .update({ document })
        .eq("page_id", page.id)
        .eq("state", "draft")

    // Saving a draft changes nothing public, so nothing is revalidated here.
    return error ? { ok: false, error: error.message } : { ok: true }
}

export async function publishPage(slug: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    const { error } = await supabase.rpc("publish_page", { p_slug: slug })
    if (error) return { ok: false, error: error.message }

    // The public pages are statically cached with a five minute window. Without
    // this an admin would hit Publish, reload the site, and see no change.
    publicPaths(slug).forEach((path) => revalidatePath(path))
    return { ok: true }
}

export async function discardDraft(slug: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    const { error } = await supabase.rpc("discard_page_draft", { p_slug: slug })
    return error ? { ok: false, error: error.message } : { ok: true }
}
