import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { getPublishedBlocks } from "@/lib/page-content"
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

export default async function CharactersPage() {
    const blocks = await getPublishedBlocks("characters")
    return (
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={blocks} />
        </div>
    )
}
