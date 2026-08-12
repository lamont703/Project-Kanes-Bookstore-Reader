import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { HeroVideo } from "@/components/marketing/hero-video"
import { getMarketingPage, type MarketingBlock } from "@/lib/marketing-content"
import { apexUrl, kometzUrl } from "@/lib/hosts"

/**
 * Marketing homepage for kanesbookstore.com.
 *
 * Reached by a rewrite from "/" in proxy.ts — the app host keeps app/page.tsx
 * as its own landing page, so the two homepages stay ordinary routes instead of
 * one component branching on hostname.
 *
 * Content comes from the imported GoHighLevel page. That page renders each
 * gallery twice (carousel slides, not responsive variants — the two copies hold
 * different images), so images are deduped and each section is rendered once
 * with the full unique set.
 */

export const metadata: Metadata = {
    title: "Kane's Komet Bookstore — The Funkiest Bookstore in the Universe",
    description:
        "Kane's Komet Bookstore sells creative literature and art through Komet books and merch. Join the Komet Book Club for bundles, a membership tee, and 35% off as a Kane Dealer.",
    alternates: { canonical: apexUrl("/") },
}

const HERO_VIDEO = "/marketing/video/kanes-hero.mp4"
const HERO_POSTER = "/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"

/** Unique image sources between two block indices, in document order. */
function imagesBetween(blocks: MarketingBlock[], from: number, to: number) {
    const seen = new Set<string>()
    const out: { src: string; alt: string }[] = []
    for (const block of blocks.slice(from, to)) {
        if (block.type !== "image" || block.role === "background") continue
        if (seen.has(block.src)) continue
        seen.add(block.src)
        out.push({ src: block.src, alt: block.alt })
    }
    return out
}

function Gallery({ images, square }: { images: { src: string; alt: string }[]; square?: boolean }) {
    return (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
                <div
                    key={img.src}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                >
                    <Image
                        src={img.src}
                        alt={img.alt}
                        width={512}
                        height={512}
                        className={`w-full object-cover transition-transform duration-300 hover:scale-105 ${
                            square ? "aspect-square" : "h-auto"
                        }`}
                    />
                </div>
            ))}
        </div>
    )
}

export default async function KanesHomePage() {
    const page = await getMarketingPage("home")
    const blocks = page.blocks

    // Section boundaries follow the source document order; see the block dump
    // in content/marketing/home.json.
    const books = imagesBetween(blocks, 10, 26)
    const funk = imagesBetween(blocks, 26, 30)
    const characters = imagesBetween(blocks, 30, 54)

    const aboutBlurb = blocks.find(
        (b): b is Extract<MarketingBlock, { type: "heading" }> =>
            b.type === "heading" && b.text.startsWith("Kane's Bookstore:"),
    )

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 via-background to-background" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,0,0.18),transparent_60%)]" />

                <div className="container relative mx-auto px-4 py-16 md:py-24">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <div className="text-center lg:text-left">
                            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                                Welcome 2 the
                            </p>
                            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance md:text-6xl">
                                Funkiest Bookstore in the Universe!
                            </h1>
                            <p className="mt-6 text-lg text-muted-foreground">
                                Creative literature and art through Komet books and merch.
                            </p>
                            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                                <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
                                    <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <Link href="/komet-book-club">Learn About the Club</Link>
                                </Button>
                            </div>
                        </div>

                        <HeroVideo
                            src={HERO_VIDEO}
                            poster={HERO_POSTER}
                            caption="Press play for a look inside Kane's Komet Bookstore."
                        />
                    </div>
                </div>
            </section>

            {/* More about us */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                        More About Us
                    </p>
                    {aboutBlurb && (
                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance md:text-3xl">
                            {aboutBlurb.text}
                        </h2>
                    )}
                    <Button asChild variant="outline" className="mt-8">
                        <Link href="/about">Read Our Story</Link>
                    </Button>
                </div>
            </section>

            {/* Our books */}
            {books.length > 0 && (
                <section className="border-b border-border">
                    <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                            Our Books
                        </p>
                        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                            Learn About Our Kometz
                        </h2>
                        <Gallery images={books} />
                        <div className="mt-10 text-center">
                            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
                                <Link href="/kometbooks">View All Of Our Kometz</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* More funk */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                        More Funk
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                        Buy More Products
                    </h2>
                    {funk.length > 0 && <Gallery images={funk} square />}
                    <div className="mt-10 text-center">
                        <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
                            <Link href="/morefunk">More Funk for Purchase</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Characters */}
            {characters.length > 0 && (
                <section className="border-b border-border">
                    <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
                            Our Characters
                        </p>
                        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                            Learn About Our Characters
                        </h2>
                        <Gallery images={characters} square />
                        <div className="mt-10 text-center">
                            <Button asChild size="lg" variant="outline">
                                <Link href="/characters">Meet All Of Our Komet Characters!</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Closing CTA */}
            <section>
                <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
                    <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
                        Have A Kane Day
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Members get a membership tee, a book bundle, a surprise gift, and an
                        automatic Kane Dealer code for 35% off at checkout.
                    </p>
                    <Button asChild size="lg" className="mt-8 bg-orange-600 hover:bg-orange-700">
                        <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                    </Button>
                </div>
            </section>
        </>
    )
}
