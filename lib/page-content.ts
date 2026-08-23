import { createStaticClient } from "@/lib/supabase/server"

/**
 * The editable page content model.
 *
 * Replaces content/marketing/*.json, which was read off disk at build time and
 * so could only change through a deploy. See migration
 * 20260823000000_add_editable_page_content.sql for why a whole page is stored as
 * one document rather than a row per block.
 *
 * Every block and section carries a stable id. That is the point of this model:
 * the previous homepage located its galleries by document position
 * (`blocks.slice(10, 26)` was "the books"), so inserting or dragging a single
 * block would have silently moved images between sections. Ids survive
 * reordering; indices do not.
 */

export type PageBlock =
    | { id: string; type: "heading"; level: number; text: string }
    | { id: string; type: "text"; text: string }
    | { id: string; type: "image"; src: string; alt: string; role?: string }

/**
 * A run of content with an identity and a rendering treatment.
 *
 * `settings` carries the section's own chrome — eyebrow, heading, call to
 * action, background — while `blocks` carries its repeatable content. Splitting
 * them this way means the editor can offer "change this heading" as a field and
 * "reorder these images" as a list, rather than treating a heading and a gallery
 * image as the same kind of thing.
 */
export interface PageSection {
    id: string
    /** Rendering treatment: body, hero, video, gallery, feature, closing. */
    kind: string
    /** Human label, shown in the editor. Never rendered on the public page. */
    name: string
    settings: Record<string, unknown>
    blocks: PageBlock[]
}

export interface PageDocument {
    version: 1
    sections: PageSection[]
}

/** Narrow a section's settings without scattering casts through the views. */
export function setting(section: PageSection | undefined, key: string): string | undefined {
    const value = section?.settings?.[key]
    return typeof value === "string" ? value : undefined
}

export function findSection(doc: PageDocument | null, id: string): PageSection | undefined {
    return doc?.sections.find((s) => s.id === id)
}

/** Images in a section, in order, skipping backgrounds and duplicates. */
export function sectionImages(section: PageSection | undefined) {
    const seen = new Set<string>()
    const out: { id: string; src: string; alt: string }[] = []
    for (const block of section?.blocks ?? []) {
        if (block.type !== "image" || block.role === "background") continue
        if (seen.has(block.src)) continue
        seen.add(block.src)
        out.push({ id: block.id, src: block.src, alt: block.alt })
    }
    return out
}

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
