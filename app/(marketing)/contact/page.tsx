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
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Contact Us</h1>
            <p className="mt-4 text-muted-foreground">
                Questions about a book, an order, or the Komet Book Club? Send us a note and
                we&apos;ll get back to you.
            </p>

            <div className="mt-10">
                <ContactForm />
            </div>

            <div className="mt-14 border-t border-border pt-8">
                <h2 className="font-bold text-orange-500">Get In Touch</h2>
                <p className="mt-2 text-sm text-muted-foreground">Mon – Sat 9:00am – 8:00pm</p>
                <p className="text-sm text-muted-foreground">Sunday – CLOSED</p>
                <p className="mt-2 text-sm text-muted-foreground">Atlanta, GA, USA</p>
            </div>
        </div>
    )
}
