"use client"

import * as React from "react"
import Image from "next/image"
import { Play } from "lucide-react"

/**
 * Hero video for the marketing homepage.
 *
 * Click-to-play on purpose. The source is a 2-minute clip, so `preload="none"`
 * plus a poster means a visitor who never presses play downloads nothing beyond
 * an 80 KB image. The original on the GoHighLevel site was HEVC in a QuickTime
 * container, which does not play in Firefox and is unreliable in Chrome; this
 * is the H.264 transcode.
 */
export function HeroVideo({
    src,
    poster,
    caption,
}: {
    src: string
    poster: string
    caption?: string
}) {
    const [playing, setPlaying] = React.useState(false)
    const videoRef = React.useRef<HTMLVideoElement>(null)

    function start() {
        setPlaying(true)
        // The element only exists after the state flip, so play on the next tick.
        requestAnimationFrame(() => videoRef.current?.play())
    }

    return (
        <figure className="mx-auto w-full max-w-xl">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
                {playing ? (
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        controls
                        playsInline
                        preload="none"
                        className="size-full object-cover"
                    />
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
                            className="object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                            <span className="flex size-20 items-center justify-center rounded-full bg-orange-600 shadow-lg transition-transform group-hover:scale-110">
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
