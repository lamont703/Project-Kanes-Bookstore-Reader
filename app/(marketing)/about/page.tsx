import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { PageHero } from "@/components/marketing/page-hero"
import { blocksOf, getPublishedBlocks, type PageDocument } from "@/lib/page-content"
import { apexUrl } from "@/lib/hosts"

// Content is editable at runtime, so this cannot be baked in permanently at
// build time. Five minutes matches the other content-driven marketing pages;
// publishing revalidates explicitly rather than waiting for it.
export const revalidate = 300

export const metadata: Metadata = {
    title: "About | Kane's Komet Bookstore",
    description:
        "Kane's Komet Bookstore brings you an eclectic selection of Komet books, exclusively published by Emanuel and Bass Publishing, plus Kane's handpicked must-reads and merchandise.",
    alternates: { canonical: apexUrl("/about") },
}

// Hero background lifted from kanesbookstore.com/about. Like the homepage's, it
// lives in the source page model rather than in markup, which is why the content
// import did not pick it up. Rendered at opacity .3 there, hence the heavier
// scrim below.
const ABOUT_HERO = "/marketing/about-hero-bg.webp"

export default async function AboutPage({ previewDocument }: {
    /** Supplied only by the admin draft preview, which renders this
     *  component so the preview is the page rather than a copy of it. */
    previewDocument?: PageDocument
} = {}) {
    const blocks = previewDocument ? blocksOf(previewDocument) : await getPublishedBlocks("about")

    // The page's own h1 moves into the hero; the rest becomes the body, so the
    // title is not rendered twice.
    const first = blocks[0]
    const heading = first?.type === "heading" ? first.text : "About Us"
    const body = first?.type === "heading" ? blocks.slice(1) : blocks

    return (
        <>
            <PageHero image={ABOUT_HERO} overlay="bg-background/80">
                <h1 className="font-display text-5xl uppercase tracking-wider text-balance md:text-7xl">
                    <span className="text-primary">{heading.split(" ")[0]}</span>{" "}
                    <span className="text-secondary">
                        {heading.split(" ").slice(1).join(" ")}
                    </span>
                </h1>
            </PageHero>

            <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
                <ContentBlocks blocks={body} />
            </div>
        </>
    )
}
