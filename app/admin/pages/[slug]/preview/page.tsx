import { notFound } from "next/navigation"

import { getDraft } from "@/lib/page-editor"
import { HomeSections } from "@/components/marketing/home-sections"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { PolicyContent } from "@/components/marketing/policy-content"

/**
 * Renders the DRAFT of a page using the real marketing components.
 *
 * Shown inside the editor's preview pane. It reuses the same components the
 * public site uses rather than a second implementation, so the preview cannot
 * drift away from what publishing will actually produce.
 *
 * Reached only through /admin, which the middleware gates to admins, and it
 * reads the draft with the cookie-aware client, so RLS refuses it for anyone
 * else even if the URL leaks.
 */
export const dynamic = "force-dynamic"

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const draft = await getDraft(slug)
    if (!draft) notFound()

    const blocks = draft.document.sections.flatMap((section) => section.blocks)

    return (
        <div className="min-h-screen bg-background">
            {slug === "home" ? (
                <HomeSections document={draft.document} />
            ) : slug === "privacy-policy" ? (
                <div className="container mx-auto max-w-3xl px-4 py-10">
                    <PolicyContent blocks={blocks} />
                </div>
            ) : (
                <div className="container mx-auto max-w-4xl px-4 py-10">
                    <ContentBlocks blocks={blocks} />
                </div>
            )}
        </div>
    )
}
