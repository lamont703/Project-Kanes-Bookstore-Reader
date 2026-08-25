import { findSection, getPublishedPage, setting, type PageDocument } from "@/lib/page-content"
import type { Metadata } from "next"
import { ContactForm } from "@/components/marketing/contact-form"
import { apexUrl } from "@/lib/hosts"

// Its heading and intro are editable, so this cannot be baked in permanently.
// Publishing revalidates explicitly; this is the backstop.
export const revalidate = 300

export const metadata: Metadata = {
    title: "Contact | Kane's Komet Bookstore",
    description: "Get in touch with Kane's Komet Bookstore.",
    alternates: { canonical: apexUrl("/contact") },
}

export default async function ContactPage({ previewDocument }: {
    /** Supplied only by the admin draft preview. */
    previewDocument?: PageDocument
} = {}) {
    const doc = previewDocument ?? (await getPublishedPage("contact"))
    const header = findSection(doc, "contact-header")

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
            <h1 className="font-display text-5xl uppercase tracking-wider md:text-6xl">
                <span className="text-primary" data-edit-setting="contact-header:headingPrimary">
                    {setting(header, "headingPrimary") ?? "CONTACT"}
                </span>{" "}
                <span className="text-secondary" data-edit-setting="contact-header:headingSecondary">
                    {setting(header, "headingSecondary") ?? "US"}
                </span>
            </h1>
            <p className="mt-4 text-muted-foreground" data-edit-setting="contact-header:intro">
                {setting(header, "intro") ??
                    "Questions about a book, an order, or the Komet Book Club? Send us a note."}
            </p>

            <div className="mt-10">
                <ContactForm />
            </div>
        </div>
    )
}
