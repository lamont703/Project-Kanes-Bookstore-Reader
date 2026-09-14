/**
 * What a "Video Src" in the page editor actually points at.
 *
 * The homepage video started life as a file we host (`/marketing/video/
 * kanes-hero.mp4`) played by a plain <video> tag. That tag can only play a video
 * FILE, so pasting a YouTube link into the field produced a player that silently
 * did nothing — the URL is a web page, not an mp4. Rather than forbid the link
 * an admin will naturally reach for, the renderer asks here what it was given
 * and plays it the right way.
 */

export type VideoSource =
    /** A video file the browser can play directly. */
    | { kind: "file"; src: string }
    /** A YouTube video, played through an embedded player. */
    | { kind: "youtube"; id: string; embedUrl: string }

/** YouTube ids are exactly 11 URL-safe characters. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

function asId(candidate: string | null | undefined): string | null {
    const value = (candidate ?? "").trim()
    return YOUTUBE_ID.test(value) ? value : null
}

/**
 * The video id in any of the shapes YouTube hands out.
 *
 * Covers what the share sheet and the address bar produce: youtu.be/<id> (with
 * the ?si= tracking parameter it appends), /watch?v=<id>, /embed/<id>,
 * /shorts/<id> and /v/<id>, on any of the www, m and nocookie hosts. Anything
 * else — a channel, a playlist page, a bare search — returns null and is treated
 * as a file, which is the pre-existing behaviour.
 */
export function youtubeId(raw: string): string | null {
    let url: URL
    try {
        url = new URL(raw.trim())
    } catch {
        return null
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null

    const host = url.hostname.replace(/^(www\.|m\.)/, "")

    if (host === "youtu.be") return asId(url.pathname.slice(1))

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") return asId(url.searchParams.get("v"))
        const path = url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/)
        if (path) return asId(path[1])
    }

    return null
}

export function parseVideoSource(raw: string): VideoSource {
    const id = youtubeId(raw)
    if (!id) return { kind: "file", src: raw }

    // nocookie is the same player without the tracking cookie set on load, and
    // the page already shows our own poster, so the embed only ever runs after a
    // deliberate click. autoplay because that click WAS the play button.
    const embedUrl =
        `https://www.youtube-nocookie.com/embed/${id}` +
        `?autoplay=1&rel=0&playsinline=1&modestbranding=1`

    return { kind: "youtube", id, embedUrl }
}
