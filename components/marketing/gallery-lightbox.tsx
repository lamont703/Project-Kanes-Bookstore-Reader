"use client"

import * as React from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { TileGrid, TILE_BASIS } from "@/components/marketing/tile-grid"

export interface GalleryImage {
    id: string
    src: string
    alt: string
}

/**
 * The marketing image gallery, with a full-screen viewer.
 *
 * The tiles are square crops (see the note in TileGrid on why), so on a page
 * like /characters the thumbnail is often showing you the middle of a portrait
 * and cutting off the rest. Opening the full image is the only way to actually
 * see one, which is why the whole grid is a client component: it owns the
 * viewer state.
 *
 * Tiles are real buttons rather than clickable divs, so they are reachable by
 * keyboard and announce themselves. Inside the admin page editor none of this
 * fires — that preview lays hotspot boxes over the iframe and swallows clicks
 * before they reach the content, which is what makes a heading editable rather
 * than a link.
 */
export function LightboxGallery({ images }: { images: GalleryImage[] }) {
    const [openIndex, setOpenIndex] = React.useState<number | null>(null)
    const active = openIndex === null ? null : images[openIndex]

    // Where focus came from, so closing puts it back on the tile that opened
    // the viewer rather than dropping it at the top of the document.
    const triggerRef = React.useRef<HTMLButtonElement | null>(null)
    const closeRef = React.useRef<HTMLButtonElement | null>(null)

    const close = React.useCallback(() => {
        setOpenIndex(null)
        triggerRef.current?.focus()
    }, [])

    React.useEffect(() => {
        if (active === null) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close()
        }
        document.addEventListener("keydown", onKeyDown)

        // Hold the page still behind the overlay. Restoring the previous value
        // rather than clearing it keeps this honest if anything else is also
        // locking scroll.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        closeRef.current?.focus()

        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [active, close])

    const openAt = (index: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
        triggerRef.current = e.currentTarget
        setOpenIndex(index)
    }

    const tiles =
        images.length === 1 ? (
            <div
                className="my-8 overflow-hidden rounded-xl border border-border bg-card"
                data-edit-id={images[0].id}
            >
                <button
                    type="button"
                    onClick={openAt(0)}
                    aria-label={`View ${images[0].alt || "image"} full screen`}
                    className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <Image
                        src={images[0].src}
                        alt={images[0].alt}
                        width={1024}
                        height={1024}
                        className="h-auto w-full object-cover"
                    />
                </button>
            </div>
        ) : (
            <TileGrid className="my-8">
                {images.map((img, i) => (
                    <div
                        key={img.id}
                        data-edit-id={img.id}
                        className={`${TILE_BASIS} overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50`}
                    >
                        <button
                            type="button"
                            onClick={openAt(i)}
                            aria-label={`View ${img.alt || "image"} full screen`}
                            className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        >
                            <Image
                                src={img.src}
                                alt={img.alt}
                                width={512}
                                height={512}
                                className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                        </button>
                    </div>
                ))}
            </TileGrid>
        )

    return (
        <>
            {tiles}

            {active && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={active.alt || "Image viewer"}
                    // Clicking the backdrop closes. The image sits in its own
                    // child below, so a click that lands on the picture itself
                    // does not bubble up as "dismiss".
                    onClick={close}
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-150 sm:p-8"
                >
                    <button
                        type="button"
                        ref={closeRef}
                        onClick={close}
                        aria-label="Close image viewer"
                        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-colors hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-5 sm:top-5"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* width/height 0 with auto sizing, rather than `fill`.
                        `fill` stretches the <img> across the whole overlay and
                        letterboxes the picture inside it, so the empty margin
                        beside a portrait looks like backdrop but is really the
                        image swallowing the click — clicking there did nothing.
                        Sizing to the natural aspect makes the element and the
                        visible picture the same box, so "outside the image" and
                        "backdrop" finally mean the same thing. */}
                    <Image
                        src={active.src}
                        alt={active.alt}
                        width={0}
                        height={0}
                        sizes="100vw"
                        priority
                        onClick={(e) => e.stopPropagation()}
                        className="h-auto max-h-full w-auto max-w-full cursor-default rounded-lg object-contain"
                    />

                    {active.alt && (
                        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-center text-sm text-white/90">
                            {active.alt}
                        </p>
                    )}
                </div>
            )}
        </>
    )
}
