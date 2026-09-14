import { notFound } from "next/navigation"
import { getDraft } from "@/lib/page-editor"
import { PageEditor } from "@/components/admin/page-editor"

/** Dev-mode editor for one page. Always live: a draft must never be cached. */
export const dynamic = "force-dynamic"

const TITLES: Record<string, string> = {
    home: "Home",
    about: "About",
    characters: "Characters",
    "komet-book-club": "Komet Book Club",
    kometbooks: "Komet Books",
    "privacy-policy": "Privacy Policy",
    contact: "Contact",
    morefunk: "More Funk",
}

export default async function EditPageRoute({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const draft = await getDraft(slug)
    if (!draft) notFound()

    return (
        <PageEditor
            slug={slug}
            title={TITLES[slug] ?? slug}
            initialDocument={draft.document}
            initialHasChanges={draft.hasDraftChanges}
        />
    )
}
