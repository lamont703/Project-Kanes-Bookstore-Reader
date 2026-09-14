import { cn } from "@/lib/utils"

/**
 * Full-bleed hero with a photographic background, shared by the marketing pages.
 *
 * The background is a CSS layer rather than <picture> because the parallax needs
 * background-attachment, which only applies to CSS backgrounds. It holds still
 * while the section scrolls over it.
 *
 * Which devices get that is decided by .hero-parallax in globals.css, on
 * whether there is a real pointing device — NOT on width. iOS Safari does not
 * reliably repaint a fixed background when the viewport changes, and an iPad is
 * far wider than the md breakpoint while still being iOS Safari, so a width
 * test handed iPads the broken path: entering Safari's full-screen mode left
 * the hero blank until the window was resized again. Reduced motion opts out
 * there too.
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
    editSection,
    children,
}: {
    image: string
    imagePortrait?: string
    overlay?: string
    /**
     * Section id, when this hero IS an editable section. Stamps the marker the
     * admin preview locates sections by, so the editor can show and hide it.
     */
    editSection?: string
    children: React.ReactNode
}) {
    return (
        // min-h keeps short heroes (a title and nothing else) from cropping the
        // artwork to a sliver — bg-cover in a shallow box cuts heads off.
        <section
            data-edit-section={editSection}
            className="relative flex min-h-[360px] items-center overflow-hidden border-b border-border md:min-h-[460px]"
        >
            {imagePortrait && (
                <div
                    aria-hidden="true"
                    data-edit-setting={editSection && `${editSection}:imagePortrait`}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
                    style={{ backgroundImage: `url(${imagePortrait})` }}
                />
            )}
            <div
                aria-hidden="true"
                data-edit-setting={editSection && `${editSection}:image`}
                className={cn(
                    "hero-parallax absolute inset-0 bg-cover bg-center bg-no-repeat",
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
