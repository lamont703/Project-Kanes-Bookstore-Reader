import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { getMarketingPage } from "@/lib/marketing-content"
import { apexUrl } from "@/lib/hosts"

export const metadata: Metadata = {
    title: "Privacy Policy | Kane's Komet Bookstore",
    description: "How Kane's Komet Bookstore collects, uses, and protects your information.",
    alternates: { canonical: apexUrl("/privacy-policy") },
}

export default async function PrivacyPolicyPage() {
    const page = await getMarketingPage("privacy-policy")
    return (
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={page.blocks} />
        </div>
    )
}
