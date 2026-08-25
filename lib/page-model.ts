/**
 * The editable page content model — types and pure helpers only.
 *
 * Deliberately free of any server import. Client components (the book club
 * page, the editor) need setting() and findSection() at runtime, and pulling
 * them from the module that also opens a Supabase server client dragged
 * next/headers into the browser bundle and failed the build.
 *
 * lib/page-content.ts re-exports all of this, so server code can keep importing
 * from one place.
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

