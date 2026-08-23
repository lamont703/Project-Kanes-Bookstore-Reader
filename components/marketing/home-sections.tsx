import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { HeroVideo } from "@/components/marketing/hero-video"
import { PageHero } from "@/components/marketing/page-hero"
import {
    getPublishedPage,
    findSection,
    sectionImages,
    setting,
    type PageDocument,
    type PageSection,
} from "@/lib/page-content"
import { APEX_PATHS, kometzUrl } from "@/lib/hosts"
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
 * Content comes from the database (see lib/page-content.ts), addressed by
 * section id. It previously came from a JSON file on disk and located each
 * gallery by document position — blocks 10..26 were "the books" — so inserting
 * or dragging a single block would have quietly moved images into the wrong
 * section. Nothing here refers to a block index any more.
 *
 * The source page renders each gallery twice (carousel slides, not responsive
 * variants — the two copies hold different images), so images are deduped and
 * each section renders once with the full unique set.
 */

/**
 * Resolve a stored call-to-action path for the host currently rendering.
 *
 * The homepage renders on both hosts, but only the marketing paths exist on the
 * apex. Anything the app owns (/browse, /book-club) has to become an absolute
 * link into kometz, or an apex visitor would land on a route that is not there.
 */
function ctaHref(href: string | undefined, fallback: string): string {
    const path = href ?? fallback
    return (APEX_PATHS as readonly string[]).includes(path) ? path : kometzUrl(path)
}

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
    images: { id: string; src: string; alt: string }[]
    aspect: "square" | "cover"
}) {
    return (
        <TileGrid className="mt-8">
            {images.map((img) => (
                <div
                    key={img.id}
                    data-edit-id={img.id}
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
function FeatureImage({ image }: { image: { id: string; src: string; alt: string } }) {
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

export async function HomeSections({ document }: { document?: PageDocument } = {}) {
    // A document is passed in only by the draft preview. Everywhere else this
    // reads the published version, so the public page cannot be made to render
    // unpublished content by a caller.
    const doc = document ?? (await getPublishedPage("home"))

    if (!doc) {
        // Loud rather than silently blank: this only happens if the target
        // database has not been seeded (scripts/seed-page-content.py).
        console.error("HomeSections: no published 'home' document — page content is unseeded")
        return null
    }

    const hero = findSection(doc, "home-hero")
    const video = findSection(doc, "home-video")
    const booksSection = findSection(doc, "home-books")
    const funkSection = findSection(doc, "home-funk")
    const charactersSection = findSection(doc, "home-characters")
    const closing = findSection(doc, "home-closing")

    const books = sectionImages(booksSection)
    const funk = sectionImages(funkSection)
    const characters = sectionImages(charactersSection)

    const galleryAspect = (s: PageSection | undefined): "square" | "cover" =>
        setting(s, "aspect") === "square" ? "square" : "cover"

    return (
        <>
            {/* Hero — full-bleed background, matching kanesbookstore.com. The
                source art is landscape (1536x1024) for desktop and portrait
                (1024x1536) for narrow screens, so PageHero is given both. */}
            <PageHero
                image={setting(hero, "image") ?? HERO_BG}
                imagePortrait={setting(hero, "imagePortrait") ?? HERO_BG_PORTRAIT}
            >
                <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                    {setting(hero, "eyebrow")}
                </p>
                <h1 className="font-display mt-3 text-5xl uppercase tracking-wider text-balance md:text-7xl">
                    <span className="text-primary">{setting(hero, "headingPrimary")}</span>{" "}
                    <span className="text-secondary">{setting(hero, "headingSecondary")}</span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">{setting(hero, "body")}</p>
                <div className="mt-8 flex justify-center">
                    <Button asChild size="lg">
                        <a href={ctaHref(setting(hero, "ctaHref"), "/book-club")}>
                            {setting(hero, "ctaLabel")}
                        </a>
                    </Button>
                </div>
            </PageHero>

            {/* Video + More About Us — one section directly below the hero, in
                the source site's order: video, eyebrow, statement, join CTA. */}
            <section data-edit-section="home-video" className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                    <HeroVideo
                        src={setting(video, "videoSrc") ?? HERO_VIDEO}
                        poster={setting(video, "poster") ?? HERO_POSTER}
                        caption={setting(video, "caption") ?? ""}
                    />

                    <div className="mx-auto mt-14 max-w-3xl">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            {setting(video, "eyebrow")}
                        </p>
                        {setting(video, "heading") && (
                            <h2 className="mt-4 text-xl font-semibold tracking-tight text-balance md:text-2xl">
                                {setting(video, "heading")}
                            </h2>
                        )}
                        <div className="mt-8 flex justify-center">
                            <Button asChild size="lg">
                                <a href={ctaHref(setting(video, "ctaHref"), "/book-club")}>
                                    {setting(video, "ctaLabel")}
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our books */}
            {books.length > 0 && (
                <section data-edit-section="home-books" className="border-b border-border">
                    <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            {setting(booksSection, "eyebrow")}
                        </p>
                        <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                            {setting(booksSection, "heading")}
                        </h2>
                        <Gallery images={books} aspect={galleryAspect(booksSection)} />
                        <div className="mt-10 text-center">
                            <Button asChild size="lg">
                                <a href={ctaHref(setting(booksSection, "ctaHref"), "/browse")}>
                                    {setting(booksSection, "ctaLabel")}
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* More funk */}
            <section data-edit-section="home-funk" className="border-b border-border">
                <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                    <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                        {setting(funkSection, "eyebrow")}
                    </p>
                    <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                        {setting(funkSection, "heading")}
                    </h2>
                    {funk.length > 0 && <FeatureImage image={funk[0]} />}
                    <div className="mt-10 text-center">
                        <Button asChild size="lg">
                            <Link href={setting(funkSection, "ctaHref") ?? "/morefunk"}>
                                {setting(funkSection, "ctaLabel")}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Characters */}
            {characters.length > 0 && (
                <section data-edit-section="home-characters" className="border-b border-border">
                    <div className="container mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
                        <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
                            {setting(charactersSection, "eyebrow")}
                        </p>
                        <h2 className="font-display mt-2 text-3xl uppercase tracking-wider md:text-4xl">
                            {setting(charactersSection, "heading")}
                        </h2>
                        <Gallery images={characters} aspect={galleryAspect(charactersSection)} />
                        <div className="mt-10 text-center">
                            <Button asChild size="lg">
                                <Link href={setting(charactersSection, "ctaHref") ?? "/characters"}>
                                    {setting(charactersSection, "ctaLabel")}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Closing CTA. The image sits above the join button, which is where
                the source page places it — block 54, immediately before the final
                CTA. Already part of the content import, so it is served locally
                rather than hotlinked from the LeadConnector CDN. */}
            <section data-edit-section="home-closing">
                <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
                    <h2 className="font-display text-4xl uppercase tracking-wider md:text-5xl">
                        <span className="text-primary">{setting(closing, "headingPrimary")}</span>{" "}
                        <span className="text-secondary">{setting(closing, "headingSecondary")}</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground">{setting(closing, "body")}</p>

                    <div className="mx-auto mt-10 overflow-hidden rounded-xl border border-border bg-card">
                        <Image
                            src={setting(closing, "image") ?? CLOSING_IMAGE}
                            alt={setting(closing, "imageAlt") ?? ""}
                            width={800}
                            height={533}
                            className="h-auto w-full object-cover"
                        />
                    </div>

                    <Button asChild size="lg" className="mt-10">
                        <a href={ctaHref(setting(closing, "ctaHref"), "/book-club")}>
                            {setting(closing, "ctaLabel")}
                        </a>
                    </Button>
                </div>
            </section>
        </>
    )
}
