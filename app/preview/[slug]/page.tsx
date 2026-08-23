import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
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
 * Lives outside /admin deliberately. Under /admin it inherited the admin
 * layout, so the iframe rendered the whole admin shell — sidebar, header and
 * nav — wrapped around the page, which is what made every preview look clipped
 * and unreadable. Only the root layout applies here, so the preview is the page
 * and nothing else.
 *
 * Being outside /admin means it does not get the middleware's admin gate for
 * free, so it checks the role itself. RLS is the real backstop — getDraft reads
 * with the cookie-aware client and drafts are admin-only — but a redirect is a
 * better answer than an empty page.
 */
export const dynamic = "force-dynamic"

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?redirect=/preview/${slug}`)
    const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") redirect("/")

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
