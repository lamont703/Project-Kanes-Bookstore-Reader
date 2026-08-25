import { createStaticClient } from "@/lib/supabase/server"
import type { PageBlock, PageDocument } from "@/lib/page-model"

/**
 * Server-side reads of page content.
 *
 * Re-exports the pure model so existing server imports keep working; client
 * components must import from lib/page-model directly.
 */
export * from "@/lib/page-model"

/**
 * The published document for a slug, or null if the page has never been
 * published.
 *
 * Uses the cookie-free client on purpose: these are public marketing pages that
 * prerender, and RLS already restricts anonymous reads to the published row, so
 * a draft cannot leak through this path even though it shares the table.
 */
export async function getPublishedPage(slug: string): Promise<PageDocument | null> {
    const supabase = createStaticClient()

    const { data, error } = await supabase
        .from("pages")
        .select("slug, page_versions!inner(document, state)")
        .eq("slug", slug)
        .eq("page_versions.state", "published")
        .maybeSingle()

    if (error) {
        console.error(`getPublishedPage(${slug}) failed:`, error.message)
        return null
    }

    const versions = (data as { page_versions?: { document: PageDocument }[] } | null)?.page_versions
    return versions?.[0]?.document ?? null
}

/**
 * Every block on a page, flattened across its sections.
 *
 * Most marketing pages are one linear run of content and their renderers already
 * expect a flat list, so this keeps them a one-line change. Pages with real
 * section structure (the homepage) address sections by id instead.
 *
 * Returns an empty list rather than throwing when a page is unseeded: a missing
 * paragraph is preferable to a 500, and the error is logged for the operator.
 */
export async function getPublishedBlocks(slug: string): Promise<PageBlock[]> {
    const doc = await getPublishedPage(slug)
    if (!doc) {
        console.error(`getPublishedBlocks(${slug}): no published document — page content is unseeded`)
        return []
    }
    return doc.sections.flatMap((section) => section.blocks)
}

/** Flatten a document the caller already has, without a round trip. */
export function blocksOf(doc: PageDocument | null | undefined): PageBlock[] {
    return (doc?.sections ?? []).flatMap((section) => section.blocks)
}
