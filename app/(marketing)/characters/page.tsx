import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { getMarketingPage } from "@/lib/marketing-content"
import { apexUrl } from "@/lib/hosts"

export const metadata: Metadata = {
    title: "Characters | Kane's Komet Bookstore",
    description: "Meet the Komet characters from the Kane's Komet Bookstore universe.",
    alternates: { canonical: apexUrl("/characters") },
}

export default async function CharactersPage() {
    const page = await getMarketingPage("characters")
    return (
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={page.blocks} />
        </div>
    )
}
