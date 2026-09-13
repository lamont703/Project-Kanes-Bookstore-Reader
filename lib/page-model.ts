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
     * A titled paragraph rendered as one unit — the book club's membership
     * benefits are six of these.
     *
     * A heading block followed by a text block would look the same on the page
     * but would pair them by adjacency, and this model exists precisely to avoid
     * position-dependent meaning: deleting one heading would silently re-pair
     * every card below it. One block holding both keeps a card a card however it
     * is dragged.
     */
    | { id: string; type: "card"; title: string; body: string }

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
    /**
     * Switched off in the editor: the public page renders nothing for it.
     *
     * Optional and opt-in — an absent flag means visible — so every document
     * written before this field existed keeps rendering exactly as it did.
     * Hiding is stored on the section rather than by deleting it so the copy,
     * images and ordering survive being switched back on.
     */
    hidden?: boolean
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

/** A section the admin has switched off. Absent flag means visible. */
export function isHidden(section: PageSection | undefined): boolean {
    return section?.hidden === true
}

/**
 * Whether a page should skip rendering the section with this id.
 *
 * False when the section is missing entirely, which is the important half: the
 * marketing pages fall back to hardcoded copy when the database is unseeded, and
 * an absent section has to keep that fallback rather than blank the page. Only a
 * section that exists and is switched off counts as hidden.
 */
export function sectionHidden(doc: PageDocument | null | undefined, id: string): boolean {
    return isHidden(findSection(doc ?? null, id))
}

/** The sections a visitor should see, in order. */
export function visibleSections(doc: PageDocument | null | undefined): PageSection[] {
    return (doc?.sections ?? []).filter((s) => !s.hidden)
}

/** The card blocks of a section, in order. */
export function sectionCards(section: PageSection | undefined) {
    return (section?.blocks ?? []).filter(
        (b): b is Extract<PageBlock, { type: "card" }> => b.type === "card",
    )
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

