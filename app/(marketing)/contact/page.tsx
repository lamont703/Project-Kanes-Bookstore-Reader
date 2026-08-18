import type { Metadata } from "next"
import { ContactForm } from "@/components/marketing/contact-form"
import { apexUrl } from "@/lib/hosts"

export const metadata: Metadata = {
    title: "Contact | Kane's Komet Bookstore",
    description: "Get in touch with Kane's Komet Bookstore.",
    alternates: { canonical: apexUrl("/contact") },
}

export default function ContactPage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
            <h1 className="font-display text-5xl uppercase tracking-wider md:text-6xl">
                <span className="text-primary">CONTACT</span>{" "}
                <span className="text-secondary">US</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
                Questions about a book, an order, or the Komet Book Club? Send us a note and
                we&apos;ll get back to you.
            </p>

            <div className="mt-10">
                <ContactForm />
            </div>
        </div>
    )
}
