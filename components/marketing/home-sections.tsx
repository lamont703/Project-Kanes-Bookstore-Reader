import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { HeroVideo } from "@/components/marketing/hero-video"
import { getMarketingPage, type MarketingBlock } from "@/lib/marketing-content"
import { kometzUrl } from "@/lib/hosts"
import { TileGrid, TILE_BASIS } from "@/components/marketing/tile-grid"

/**
 * The homepage body, shared by both hosts.
 *
 * `/` renders this everywhere — the apex reaches it by a rewrite to
 * /kanes-home, the app host through app/page.tsx. Only the surrounding chrome
 * differs: the app host wraps it in SiteHeader so a signed-in member keeps
 * their session and cart, while the apex uses the session-free marketing
 * layout. Keeping the body in one component means the entry point cannot drift
 * between hosts.
 *
 * Content comes from the imported GoHighLevel page. That page renders each
 * gallery twice (carousel slides, not responsive variants — the two copies hold
 * different images), so images are deduped and each section renders once with
 * the full unique set.
 */

const HERO_VIDEO = "/marketing/video/kanes-hero.mp4"
// A real frame from the clip. The video's own GHL "thumbnail" was the site logo
// on a white background — wrong subject, and jarring on a dark page.
const HERO_POSTER = "/marketing/video/kanes-hero-poster.jpg"

// Hero background lifted from kanesbookstore.com. The source page stores these
// as section backgrounds in its page model rather than as CSS or markup, which
// is why they were not picked up by the content import.
const HERO_BG = "/marketing/kanes-hero-bg.webp"
const HERO_BG_PORTRAIT = "/marketing/kanes-hero-bg-portrait.webp"

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

/**
 * Gallery grid.
 *
 * Flex-wrap with justify-center rather than CSS grid: the sections divide
 * unevenly into four columns (9 books, 17 characters), and a grid leaves the
 * remainder hard-left against empty space. Centering the wrap balances the
 * final row instead.
 *
 * `aspect` is required, not optional — the source images have mixed ratios
 * (characters range 0.67 to 1.0), so without a fixed box the rows come out
 * ragged and nothing lines up.
 */
function Gallery({
    images,
    aspect,
}: {
    images: { src: string; alt: string }[]
    aspect: "square" | "cover"
}) {
    return (
        <TileGrid className="mt-8">
            {images.map((img) => (
                <div
                    key={img.src}
                    className={`${TILE_BASIS} overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50`}
                >
                    <Image
                        src={img.src}
                        alt={img.alt}
                        width={512}
                        height={768}
                        className={`w-full object-cover transition-transform duration-300 hover:scale-105 ${
                            aspect === "square" ? "aspect-square" : "aspect-[2/3]"
                        }`}
                    />
                </div>
            ))}
        </TileGrid>
    )
}

/**
 * A single wide image presented as a feature rather than a grid tile.
 *
 * The More Funk section has exactly one 3:2 banner. In a four-column grid it
 * rendered as a lone quarter-width tile pinned to the left, which is what made
 * that section look misaligned against its centred heading and button.
 */
function FeatureImage({ image }: { image: { src: string; alt: string } }) {
    return (
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-border bg-card">
            <Image
                src={image.src}
                alt={image.alt}
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
            />
        </div>
    )
}

export async function HomeSections() {
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
            {/* Hero — full-bleed background, matching kanesbookstore.com. The
                source art is landscape (1536x1024) for desktop and portrait
                (1024x1536) for narrow screens; <picture> picks per viewport so
                phones do not get a wide crop. GHL renders it at opacity .8, so
                the scrim below approximates that while keeping the display type
                legible over a busy photograph. */}
            <section className="relative overflow-hidden border-b border-border">
                {/* Two layers rather than a <picture>, because the parallax needs
                    background-attachment and that only applies to CSS backgrounds.

                    Desktop gets the landscape art fixed to the viewport, so it
                    holds still while the section scrolls over it. Mobile gets the
                    portrait art scrolling normally: iOS Safari renders
                    background-attachment:fixed badly — it sizes against the whole
                    document and stutters — so parallax is desktop-only by design,
                    not by oversight. motion-reduce also opts out. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
                    style={{ backgroundImage: `url(${HERO_BG_PORTRAIT})` }}
                />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat md:block md:bg-fixed motion-reduce:bg-scroll"
                    style={{ backgroundImage: `url(${HERO_BG})` }}
                />
                <div className="absolute inset-0 bg-background/75" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

                <div className="container relative mx-auto max-w-4xl px-4 py-24 text-center md:py-32">
                    <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                        Welcome 2 the
                    </p>
                    <h1 className="font-display mt-3 text-5xl uppercase tracking-wider text-balance md:text-7xl">
                        <span className="text-primary">FUNKIEST BOOKSTORE</span>{" "}
                        <span className="text-secondary">IN THE UNIVERSE!</span>
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground">
                        Creative literature and art through Komet books and merch.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild size="lg">
                            <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/komet-book-club">Learn About the Club</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Video — sits directly below the hero, as it does on the source
                site, rather than inside it. */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                    <HeroVideo
                        src={HERO_VIDEO}
                        poster={HERO_POSTER}
                        caption="Press play for a look inside Kane's Komet Bookstore."
                    />
                </div>
            </section>

            {/* More about us */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
                    <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                        More About Us
                    </p>
                    {aboutBlurb && (
                        <h2 className="mt-4 text-xl font-semibold tracking-tight text-balance md:text-2xl">
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
                    <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            Our Books
                        </p>
                        <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                            Learn About Our Kometz
                        </h2>
                        <Gallery images={books} aspect="cover" />
                        <div className="mt-10 text-center">
                            <Button asChild size="lg">
                                <Link href="/kometbooks">View All Of Our Kometz</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* More funk */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                    <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                        More Funk
                    </p>
                    <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                        Buy More Products
                    </h2>
                    {funk.length > 0 && <FeatureImage image={funk[0]} />}
                    <div className="mt-10 text-center">
                        <Button asChild size="lg">
                            <Link href="/morefunk">More Funk for Purchase</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Characters */}
            {characters.length > 0 && (
                <section className="border-b border-border">
                    <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            Our Characters
                        </p>
                        <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                            Learn About Our Characters
                        </h2>
                        <Gallery images={characters} aspect="square" />
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
                    <h2 className="font-display text-4xl uppercase tracking-wider md:text-5xl">
                        <span className="text-primary">HAVE A</span>{" "}
                        <span className="text-secondary">KANE DAY</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Members get a membership tee, a book bundle, a surprise gift, and an
                        automatic Kane Dealer code for 35% off at checkout.
                    </p>
                    <Button asChild size="lg" className="mt-8">
                        <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                    </Button>
                </div>
            </section>
        </>
    )
}
