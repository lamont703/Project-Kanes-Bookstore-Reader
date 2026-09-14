import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { blocksOf, getPublishedBlocks, type PageDocument } from "@/lib/page-content"
import { apexUrl } from "@/lib/hosts"

// Content is editable at runtime, so this cannot be baked in permanently at
// build time. Five minutes matches the other content-driven marketing pages;
// publishing revalidates explicitly rather than waiting for it.
export const revalidate = 300

export const metadata: Metadata = {
    title: "Characters | Kane's Komet Bookstore",
    description: "Meet the Komet characters from the Kane's Komet Bookstore universe.",
    alternates: { canonical: apexUrl("/characters") },
}

export default async function CharactersPage({ previewDocument }: {
    /** Supplied only by the admin draft preview, which renders this
     *  component so the preview is the page rather than a copy of it. */
    previewDocument?: PageDocument
} = {}) {
    const blocks = previewDocument ? blocksOf(previewDocument) : await getPublishedBlocks("characters")
    return (
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={blocks} />
        </div>
    )
}
