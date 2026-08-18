import type { Metadata } from "next"
import { PolicyContent } from "@/components/marketing/policy-content"
import { getMarketingPage } from "@/lib/marketing-content"
import { apexUrl } from "@/lib/hosts"

export const metadata: Metadata = {
    title: "Privacy Policy | Kane's Komet Bookstore",
    description: "How Kane's Komet Bookstore collects, uses, and protects your information.",
    alternates: { canonical: apexUrl("/privacy-policy") },
}

export default async function PrivacyPolicyPage() {
    const page = await getMarketingPage("privacy-policy")

    // The imported page carries three regions: the site's hero band, the policy
    // itself, then promotional Our Books / Our Characters sections with their
    // character images. Only the policy belongs here.
    //
    // The boundaries are found by shape rather than by index, so a re-import
    // cannot silently reintroduce the surrounding content. The policy is one
    // markdown blob, so its own headings arrive as TEXT lines beginning "###";
    // the promo sections arrive as real heading blocks. That difference marks
    // where the policy ends.
    const start = page.blocks.findIndex(
        (b) => b.type === "text" && b.text.trim().startsWith("###"),
    )
    const rest = start === -1 ? page.blocks : page.blocks.slice(start)
    const endOffset = rest.findIndex((b) => b.type === "heading")
    const policy = endOffset === -1 ? rest : rest.slice(0, endOffset)

    // Skip the policy's own "### Privacy Policy" title — the page renders it as
    // the h1 below instead of repeating it.
    const body = policy.slice(1)

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
            <h1 className="font-display text-5xl uppercase tracking-wider md:text-6xl">
                <span className="text-primary">PRIVACY</span>{" "}
                <span className="text-secondary">POLICY</span>
            </h1>
            <PolicyContent blocks={body} />
        </div>
    )
}
