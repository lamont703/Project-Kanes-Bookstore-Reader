import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { HeroVideo } from "@/components/marketing/hero-video"
import { PageHero } from "@/components/marketing/page-hero"
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
// The site logo, used as the video thumbnail. Same asset the header wordmark
// uses, so the still frame reads as branding rather than an arbitrary moment.
const HERO_POSTER = "/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"

// Hero background lifted from kanesbookstore.com. The source page stores these
// as section backgrounds in its page model rather than as CSS or markup, which
// is why they were not picked up by the content import.
const HERO_BG = "/marketing/kanes-hero-bg.webp"
const HERO_BG_PORTRAIT = "/marketing/kanes-hero-bg-portrait.webp"

// Closing-section photo, block 54 of the imported homepage.
const CLOSING_IMAGE = "/marketing/ec93931a-6621b6c18381f2b6f9098b2d.webp"

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
                (1024x1536) for narrow screens, so PageHero is given both. */}
            <PageHero image={HERO_BG} imagePortrait={HERO_BG_PORTRAIT}>
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
                <div className="mt-8 flex justify-center">
                    <Button asChild size="lg">
                        <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                    </Button>
                </div>
            </PageHero>

            {/* Video + More About Us — one section directly below the hero, in
                the source site's order: video, eyebrow, statement, join CTA. */}
            <section className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                    <HeroVideo
                        src={HERO_VIDEO}
                        poster={HERO_POSTER}
                        caption="Press play for a look inside Kane's Komet Bookstore."
                    />

                    <div className="mx-auto mt-14 max-w-3xl">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            More About Us
                        </p>
                        {aboutBlurb && (
                            <h2 className="mt-4 text-xl font-semibold tracking-tight text-balance md:text-2xl">
                                {aboutBlurb.text}
                            </h2>
                        )}
                        <div className="mt-8 flex justify-center">
                            <Button asChild size="lg">
                                <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                            </Button>
                        </div>
                    </div>
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
                                <Link href="/browse">View All Of Our Kometz</Link>
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
                            <Button asChild size="lg">
                                <Link href="/characters">Meet All Of Our Komet Characters!</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Closing CTA. The image sits above the join button, which is where
                the source page places it — block 54, immediately before the final
                CTA. Already part of the content import, so it is served locally
                rather than hotlinked from the LeadConnector CDN. */}
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

                    <div className="mx-auto mt-10 overflow-hidden rounded-xl border border-border bg-card">
                        <Image
                            src={CLOSING_IMAGE}
                            alt="A reader with a Komet book"
                            width={800}
                            height={533}
                            className="h-auto w-full object-cover"
                        />
                    </div>

                    <Button asChild size="lg" className="mt-10">
                        <a href={kometzUrl("/book-club")}>Join Our Komet Book Club</a>
                    </Button>
                </div>
            </section>
        </>
    )
}
