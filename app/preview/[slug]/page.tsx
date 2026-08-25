import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getDraft } from "@/lib/page-editor"
import type { PageDocument } from "@/lib/page-content"

import AboutPage from "@/app/(marketing)/about/page"
import CharactersPage from "@/app/(marketing)/characters/page"
import PrivacyPolicyPage from "@/app/(marketing)/privacy-policy/page"
import ContactPage from "@/app/(marketing)/contact/page"
import MoreFunkPage from "@/app/(marketing)/morefunk/page"
import BrowsePage from "@/app/browse/page"
import BookClubPage from "@/app/book-club/page"
import { HomeSections } from "@/components/marketing/home-sections"

/**
 * Renders the DRAFT of a page.
 *
 * It renders the real page component — the same function the public route
 * exports — with the draft document passed in, rather than reassembling the
 * page from its parts. An earlier version rebuilt each page out of
 * ContentBlocks in a plain container, which meant the preview was missing hero
 * backgrounds, page widths and section chrome and so did not look like the page
 * being edited. Reusing the component makes drift impossible: there is only one
 * implementation.
 *
 * The draft document is passed as a prop rather than read from a cookie or a
 * query flag so the public routes stay statically rendered, and so no request
 * to a public URL can ever be made to serve unpublished content.
 *
 * Lives outside /admin deliberately. Under /admin it inherited the admin
 * layout, so the iframe rendered the whole admin shell around the page.
 * Being outside /admin means it does not get the middleware's admin gate for
 * free, so it checks the role itself; RLS on page_versions is the real backstop.
 */
export const dynamic = "force-dynamic"

const NONE = Promise.resolve({} as Record<string, string | string[] | undefined>)

function render(slug: string, document: PageDocument) {
    switch (slug) {
        case "home":
            return <HomeSections document={document} />
        case "about":
            return <AboutPage previewDocument={document} />
        case "characters":
            return <CharactersPage previewDocument={document} />
        case "privacy-policy":
            return <PrivacyPolicyPage previewDocument={document} />
        case "browse":
            return <BrowsePage searchParams={NONE} previewDocument={document} />
        case "book-club":
            return <BookClubPage previewDocument={document} />
        // These two carry no editable document yet: /contact is a form and
        // /morefunk renders live products. They still preview as themselves.
        case "contact":
            return <ContactPage />
        case "morefunk":
            return <MoreFunkPage />
        default:
            return null
    }
}

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

    const body = render(slug, draft.document)
    if (!body) notFound()

    return <div className="min-h-screen bg-background">{body}</div>
}
