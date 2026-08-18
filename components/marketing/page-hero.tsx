import { cn } from "@/lib/utils"

/**
 * Full-bleed hero with a photographic background, shared by the marketing pages.
 *
 * The background is a CSS layer rather than <picture> because the parallax needs
 * background-attachment, which only applies to CSS backgrounds. Desktop fixes it
 * to the viewport so it holds still while the section scrolls over it; mobile
 * scrolls normally, since iOS Safari renders background-attachment:fixed poorly —
 * it sizes against the document and stutters. motion-reduce opts out too, as
 * parallax is a common motion-sensitivity trigger.
 *
 * Pass `imagePortrait` when a separate narrow-screen crop exists; without it the
 * single image is used at every width.
 *
 * `overlay` sets the scrim. The source site stores a per-section opacity — the
 * homepage hero at .8, the about hero at .3 — so a fainter source image wants a
 * heavier scrim to keep the display type legible.
 */
export function PageHero({
    image,
    imagePortrait,
    overlay = "bg-background/75",
    children,
}: {
    image: string
    imagePortrait?: string
    overlay?: string
    children: React.ReactNode
}) {
    return (
        // min-h keeps short heroes (a title and nothing else) from cropping the
        // artwork to a sliver — bg-cover in a shallow box cuts heads off.
        <section className="relative flex min-h-[360px] items-center overflow-hidden border-b border-border md:min-h-[460px]">
            {imagePortrait && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
                    style={{ backgroundImage: `url(${imagePortrait})` }}
                />
            )}
            <div
                aria-hidden="true"
                className={cn(
                    "absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-fixed motion-reduce:bg-scroll",
                    imagePortrait && "hidden md:block",
                )}
                style={{ backgroundImage: `url(${image})` }}
            />
            <div className={cn("absolute inset-0", overlay)} />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

            <div className="container relative mx-auto w-full max-w-4xl px-4 py-20 text-center md:py-24">
                {children}
            </div>
        </section>
    )
}
