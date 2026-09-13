"use client"

import * as React from "react"
import Image from "next/image"
import { Play } from "lucide-react"

import { parseVideoSource } from "@/lib/video-embed"

/**
 * Hero video for the marketing homepage.
 *
 * Click-to-play on purpose. The source is a 2-minute clip, so `preload="none"`
 * plus a poster means a visitor who never presses play downloads nothing beyond
 * an 80 KB image. The original on the GoHighLevel site was HEVC in a QuickTime
 * container, which does not play in Firefox and is unreliable in Chrome; this
 * is the H.264 transcode.
 *
 * The source may also be a YouTube link, since that is what an admin editing the
 * page is most likely to paste. A <video> tag cannot play one — it wants a file —
 * so that case renders the embedded player instead. Either way nothing from the
 * video host is requested until the poster is clicked.
 */
export function HeroVideo({
    src,
    poster,
    caption,
    editSetting,
}: {
    src: string
    poster: string
    caption?: string
    /**
     * "<sectionId>:<key>" for the poster, when it is an editable setting.
     * Lets the admin preview swap the still without a page render.
     */
    editSetting?: string
}) {
    const [playing, setPlaying] = React.useState(false)
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const source = parseVideoSource(src)

    function start() {
        setPlaying(true)
        // The element only exists after the state flip, so play on the next
        // tick. The embed autoplays from its own URL and needs no nudge.
        if (source.kind === "file") {
            requestAnimationFrame(() => videoRef.current?.play())
        }
    }

    return (
        <figure className="mx-auto w-full max-w-xl">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
                {playing ? (
                    // Nested rather than chained so the union narrows: the file
                    // branch needs source.src, which only exists on one member.
                    source.kind === "youtube" ? (
                        <iframe
                            src={source.embedUrl}
                            title={caption || "Video"}
                            // The player letterboxes itself inside the square
                            // card rather than being cropped to it, which
                            // object-cover would do to a 16:9 video.
                            className="size-full"
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={source.src}
                            poster={poster}
                            data-edit-setting={editSetting}
                            controls
                            playsInline
                            preload="none"
                            className="size-full object-cover"
                        />
                    )
                ) : (
                    <button
                        type="button"
                        onClick={start}
                        aria-label="Play video"
                        className="group absolute inset-0 size-full"
                    >
                        <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 576px"
                            data-edit-setting={editSetting}
                            className="object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                            <span className="flex size-20 items-center justify-center rounded-full bg-primary shadow-lg transition-transform group-hover:scale-110">
                                <Play className="ml-1 size-9 fill-white text-white" />
                            </span>
                        </span>
                    </button>
                )}
            </div>
            {caption && (
                <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    )
}
