import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { getMarketingPage } from "@/lib/marketing-content"
import { apexUrl } from "@/lib/hosts"

export const metadata: Metadata = {
    title: "About | Kane's Komet Bookstore",
    description:
        "Kane's Komet Bookstore brings you an eclectic selection of Komet books, exclusively published by Emanuel and Bass Publishing, plus Kane's handpicked must-reads and merchandise.",
    alternates: { canonical: apexUrl("/about") },
}

export default async function AboutPage() {
    const page = await getMarketingPage("about")
    return (
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={page.blocks} />
        </div>
    )
}
