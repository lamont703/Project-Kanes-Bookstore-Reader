"use client"

import * as React from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Trash2, Upload, Loader2, RotateCcw, Eye, EyeOff, MousePointerClick } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { saveDraft, publishPage, discardDraft } from "@/lib/page-editor"
import { GenreManager } from "@/components/admin/genre-manager"
import { MerchProductOrder } from "@/components/admin/merch-product-order"
import { BookClubFreePicks } from "@/components/admin/book-club-free-picks"
import { findSection } from "@/lib/page-model"
import type { PageBlock, PageDocument, PageSection } from "@/lib/page-model"
import { youtubeId } from "@/lib/video-embed"

/**
 * Dev-mode editor for a marketing page.
 *
 * Edits a draft document held in component state; nothing reaches the public
 * site until Publish. The whole document is saved at once, which is why the
 * schema stores a page as a single row — reordering is just an array move here,
 * with no position columns to reconcile.
 *
 * Sections and blocks are addressed by id throughout. That is what makes drag
 * and drop safe: the homepage used to locate its galleries by document
 * position, so moving one block would have shuffled images between sections.
 */

const IMAGE_SETTING_KEYS = ["image", "imagePortrait", "poster", "background"]

/** Settings whose value is a video, and so needs saying what will actually play. */
const VIDEO_SETTING_KEYS = ["videoSrc"]

/**
 * What to tell the admin about a video address, if anything.
 *
 * A YouTube link and a hosted file both work; anything else that is plainly a
 * web page does not, and used to fail silently — the player rendered and simply
 * never started. Saying so at the field is the only place it can be caught
 * before Publish.
 */
function videoHint(value: string): { tone: "ok" | "warn"; text: string } | null {
    const raw = value.trim()
    if (!raw) return null
    if (youtubeId(raw)) return { tone: "ok", text: "YouTube video — plays in an embedded player." }

    // A path or a URL ending in a video file is the other supported shape.
    if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(raw)) {
        return { tone: "ok", text: "Video file — plays directly." }
    }
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
        return {
            tone: "warn",
            text: "This is not a YouTube link or a video file, so it will not play. Paste a YouTube URL, or a link ending in .mp4 or .webm.",
        }
    }
    return null
}

function label(key: string) {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim()
}

const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : String(Math.floor(Math.random() * 1e9))

/** Upload an image and return its public URL. */
async function uploadImage(file: File): Promise<string> {
    const supabase = createClient()
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${newId()}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("page-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from("page-images").getPublicUrl(path)
    return data.publicUrl
}

function ImageField({
    value,
    onChange,
    caption,
}: {
    value: string
    onChange: (next: string) => void
    caption?: string
}) {
    const [busy, setBusy] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const pick = async (file: File | undefined) => {
        if (!file) return
        setBusy(true)
        try {
            onChange(await uploadImage(file))
            toast.success("Image uploaded")
        } catch (e) {
            toast.error(`Upload failed: ${(e as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex items-start gap-3">
            {/* Smaller on phones: at 80px, nested inside a block editor's drag
                handle, delete button and three levels of padding, the URL field
                beside it was left about 120 pixels. */}
            <div className="size-14 shrink-0 overflow-hidden rounded border border-border bg-muted sm:size-20">
                {value && (
                    // Not next/image: sources are user supplied at runtime and may
                    // point at any configured host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={value} alt="" className="size-full object-cover" />
                )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
                <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-xs" />
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pick(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                    >
                        {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Upload className="mr-1 size-3" />}
                        Replace
                    </Button>
                    {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
                </div>
            </div>
        </div>
    )
}

function SortableRow({
    id,
    children,
}: {
    id: string
    children: (handle: React.ReactNode) => React.ReactNode
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={isDragging ? "relative z-10 opacity-90" : undefined}
        >
            {children(
                <button
                    type="button"
                    className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4" />
                </button>,
            )}
        </div>
    )
}

function BlockEditor({
    block,
    onChange,
    onDelete,
    handle,
}: {
    block: PageBlock
    onChange: (next: PageBlock) => void
    onDelete: () => void
    handle: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3">
            {handle}
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {block.type}
                    </span>
                    {block.type === "heading" && (
                        <select
                            className="rounded border border-border bg-card px-2 py-0.5 text-xs"
                            value={block.level}
                            onChange={(e) => onChange({ ...block, level: Number(e.target.value) })}
                        >
                            {[1, 2, 3, 4].map((l) => (
                                <option key={l} value={l}>
                                    H{l}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {block.type === "image" ? (
                    <div className="space-y-2">
                        <div data-field-id={block.id}>
                            <ImageField value={block.src} onChange={(src) => onChange({ ...block, src })} />
                        </div>
                        <Input
                            value={block.alt}
                            placeholder="Alt text (describes the image for screen readers)"
                            onChange={(e) => onChange({ ...block, alt: e.target.value })}
                            className="text-xs"
                        />
                    </div>
                ) : block.type === "card" ? (
                    <div className="space-y-2" data-field-id={block.id}>
                        <Input
                            value={block.title}
                            placeholder="Card title"
                            onChange={(e) => onChange({ ...block, title: e.target.value })}
                            className="font-medium"
                        />
                        <textarea
                            className="min-h-16 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={block.body}
                            placeholder="What this benefit gives the member"
                            onChange={(e) => onChange({ ...block, body: e.target.value })}
                        />
                    </div>
                ) : (
                    <textarea
                        data-field-id={block.id}
                        className="min-h-16 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={block.text}
                        onChange={(e) => onChange({ ...block, text: e.target.value })}
                    />
                )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Delete block">
                <Trash2 className="size-4 text-destructive" />
            </Button>
        </div>
    )
}


/**
 * The draft preview pane.
 *
 * On a pane at least MIN_SCALED_PANE wide it renders the page at a real desktop
 * width and scales it down to fit, rather than letting a half-width pane render
 * the site at its mobile breakpoints: an admin checking a layout there wants the
 * layout visitors get, not a phone rendering of it.
 *
 * Below that width the reasoning inverts. Shrinking 1280px into a phone-sized
 * pane lands at about 28%, which is not legible at any font size, so the frame
 * renders at its own width instead and the site lays out at its real mobile
 * breakpoints.
 *
 * The iframe's height is divided back out by the scale so the scaled result
 * fills the pane exactly — otherwise the frame is shorter than its container
 * and the page appears cut off partway down.
 */
const PREVIEW_WIDTH = 1280



interface Hotspot {
    key: string
    label: string
    top: number
    left: number
    width: number
    height: number
}

/**
 * Boxes drawn over the preview, one per editable thing.
 *
 * The preview renders in an iframe on the same origin, so its DOM is readable
 * from here. Elements mark themselves with data-edit-id (a block) or
 * data-edit-section (a whole section) and this measures them, scales the rects
 * to match the shrunken frame, and lays interactive boxes on top.
 *
 * The boxes also swallow clicks that would otherwise follow links inside the
 * preview, which is what you want: in the editor a heading is something to
 * edit, not something to navigate away from.
 */
/**
 * Every image the preview can show, addressed the way the DOM marks it.
 *
 * Two kinds: a section setting (the hero art, the video poster) marked
 * data-edit-setting="<section>:<key>", and an image block marked
 * data-edit-id="<block>". Keying them the same way lets one pass handle both.
 */
function imageSources(doc: PageDocument): Map<string, string> {
    const out = new Map<string, string>()
    for (const section of doc.sections) {
        for (const key of IMAGE_SETTING_KEYS) {
            const value = section.settings[key]
            if (typeof value === "string" && value) out.set(`setting:${section.id}:${key}`, value)
        }
        for (const block of section.blocks) {
            if (block.type === "image" && block.src) out.set(`block:${block.id}`, block.src)
        }
    }
    return out
}

/**
 * Point one already-rendered element at a new image.
 *
 * The same setting can be any of three things in the DOM — an <img> (the
 * closing image, the video poster still), a <video> whose poster attribute
 * holds it, or a div carrying it as a CSS background (the hero art) — so the
 * element decides how it is written rather than the caller.
 *
 * Clearing srcset matters: these are next/image renders, whose srcset lists
 * /_next/image URLs for the OLD source. Leave it and the browser keeps picking
 * a candidate from it and the swap silently does nothing.
 *
 * The element is tested by tagName rather than instanceof. These nodes come
 * from the iframe's document, so they are instances of ITS HTMLImageElement,
 * not this window's, and instanceof is false for every one of them — which sent
 * every <img> down the background-image branch and quietly did nothing.
 */
function pointAtImage(el: HTMLElement, url: string) {
    // What was last written here, so a re-run does not refetch an unchanged
    // image. Comparing el.src is no good — the browser reports it resolved to
    // an absolute URL, which never equals a stored relative path.
    if (el.dataset.livePreviewSrc === url) return
    el.dataset.livePreviewSrc = url

    const setImg = (img: HTMLImageElement) => {
        img.removeAttribute("srcset")
        img.src = url
    }

    if (el.tagName === "IMG") return setImg(el as HTMLImageElement)
    if (el.tagName === "VIDEO") {
        ;(el as HTMLVideoElement).poster = url
        return
    }

    // A wrapper around the image (the gallery tiles) or, failing that, an
    // element carrying it as a CSS background (the hero art).
    const img = el.querySelector("img")
    if (img) return setImg(img)
    el.style.backgroundImage = `url(${url})`
}

/**
 * Reflect the unsaved draft inside the preview without a round trip.
 *
 * The preview is a server render of the last SAVED draft, so without this
 * neither hiding a section nor replacing an image shows until Save — and those
 * are the two edits whose whole point is seeing the result. The frame is
 * same-origin, so rather than re-render it this reaches in and patches what
 * changed.
 *
 * Visibility works off the elements a section owns. The homepage, the book club
 * and the header pages each render a section into one container marked
 * data-edit-section, so hiding that container is exact. The flat pages (about,
 * characters, privacy policy) render one continuous run of blocks with no
 * section element at all, so there the section's own blocks are hidden one by
 * one — which is precisely what the published page drops, since blocksOf()
 * filters those same blocks out.
 *
 * Images are patched as a DELTA against the document the frame was rendered
 * from. Only a source the admin has changed since the last save is written, so
 * the untouched majority keep the optimised /_next/image renders they were
 * served with.
 *
 * Presentation only: the document is untouched, so Save and Publish still decide
 * what visitors get, and a reloaded frame comes back agreeing with what was
 * shown here.
 */
function useLivePreview(
    frameRef: React.RefObject<HTMLIFrameElement | null>,
    doc: PageDocument,
    savedDoc: PageDocument,
    liveKey: string,
    refreshKey: number,
) {
    // Read the documents through refs so this re-runs when something the
    // preview can show changes, not on every keystroke in a text field.
    const docRef = React.useRef(doc)
    docRef.current = doc
    const savedRef = React.useRef(savedDoc)
    savedRef.current = savedDoc

    React.useEffect(() => {
        const frame = frameRef.current
        if (!frame) return

        const apply = () => {
            const d = frame.contentDocument
            if (!d?.body) return

            const current = docRef.current
            const hidden = new Set(current.sections.filter((s) => s.hidden).map((s) => s.id))
            // Block id -> owning section, for the pages that render blocks flat.
            const owner = new Map<string, string>()
            current.sections.forEach((s) => s.blocks.forEach((b) => owner.set(b.id, s.id)))

            const wanted = imageSources(current)
            const rendered = imageSources(savedRef.current)

            d.querySelectorAll<HTMLElement>(
                "[data-edit-section],[data-edit-id],[data-edit-setting]",
            ).forEach((el) => {
                const setting = el.dataset.editSetting
                const blockId = el.dataset.editId
                const sectionId =
                    el.dataset.editSection ??
                    (blockId ? owner.get(blockId) : undefined) ??
                    setting?.split(":")[0]
                if (!sectionId) return

                if (hidden.has(sectionId)) {
                    el.style.display = "none"
                } else if (el.style.display === "none") {
                    // Only clear what was switched off here. Writing "" over
                    // everything would flatten display rules the page set itself.
                    el.style.display = ""
                }

                const imageKey = setting ? `setting:${setting}` : blockId ? `block:${blockId}` : null
                if (!imageKey) return
                const url = wanted.get(imageKey)
                if (url && url !== rendered.get(imageKey)) pointAtImage(el, url)
            })
        }

        // The frame may already be loaded when this runs — after an edit it
        // certainly is — so apply now and again whenever it reloads. The delayed
        // pass covers hydration: React claims the markup shortly after load and
        // can put back the source the server rendered.
        apply()
        const onLoad = () => {
            apply()
            window.setTimeout(apply, 300)
        }
        frame.addEventListener("load", onLoad)
        return () => frame.removeEventListener("load", onLoad)
        // refreshKey remounts the iframe, so the listener has to be re-attached
        // to the new element even when nothing about the draft changed.
    }, [frameRef, liveKey, refreshKey])
}

function useHotspots(
    frameRef: React.RefObject<HTMLIFrameElement | null>,
    scale: number,
    refreshKey: number,
    enabled: boolean,
    liveKey: string,
) {
    const [spots, setSpots] = React.useState<Hotspot[]>([])

    React.useEffect(() => {
        if (!enabled) {
            setSpots([])
            return
        }
        const frame = frameRef.current
        if (!frame) return

        let last = 0
        const measure = () => {
            const doc = frame.contentDocument
            if (!doc?.body) return
            const found: Hotspot[] = []
            doc.querySelectorAll<HTMLElement>(
                "[data-edit-id],[data-edit-section],[data-edit-setting]",
            ).forEach((el) => {
                const key = el.dataset.editId
                    ? `block:${el.dataset.editId}`
                    : el.dataset.editSetting
                      ? `setting:${el.dataset.editSetting}`
                      : `section:${el.dataset.editSection}`
                const r = el.getBoundingClientRect()
                // Skip anything scrolled out of the frame or collapsed.
                if (r.width < 4 || r.height < 4) return
                found.push({
                    key,
                    label: el.dataset.editSection
                        ? "Section"
                        : el.dataset.editSetting
                          ? el.dataset.editSetting.split(":")[1]
                          : el.tagName.toLowerCase(),
                    top: r.top * scale,
                    left: r.left * scale,
                    width: r.width * scale,
                    height: r.height * scale,
                })
            })
            setSpots(found)
        }

        const schedule = () => {
            // Coalesce bursts of scroll events without relying on rAF, which
            // Chrome suspends entirely while the tab is hidden.
            const now = Date.now()
            if (now - last < 60) return
            last = now
            measure()
        }

        // The frame may already be loaded when this runs, so measure now and
        // again on load rather than relying on the event alone.
        schedule()
        frame.addEventListener("load", schedule)
        const win = frame.contentWindow
        win?.addEventListener("scroll", schedule, { passive: true })
        win?.addEventListener("resize", schedule)
        const timer = window.setInterval(schedule, 1000)

        return () => {
            clearInterval(timer)
            frame.removeEventListener("load", schedule)
            win?.removeEventListener("scroll", schedule)
            win?.removeEventListener("resize", schedule)
        }
        // liveKey: hiding a section moves everything below it, so the boxes
        // have to be re-measured or they sit over the wrong elements until the
        // next poll.
    }, [frameRef, scale, refreshKey, enabled, liveKey])

    return spots
}

/**
 * The draft preview pane.
 *
 * Renders the page at a real desktop width and scales it down to fit, rather
 * than letting a half-width pane render the site at its mobile breakpoints. An
 * admin checking a layout wants to see the layout visitors get, not a phone
 * rendering of it.
 *
 * The iframe's height is divided back out by the scale so the scaled result
 * fills the pane exactly — otherwise the frame is shorter than its container
 * and the page appears cut off partway down.
 */
function PreviewFrame({
    src,
    refreshKey,
    editing,
    onSelect,
    selected,
    doc,
    savedDoc,
    active,
    scaleToDesktop,
}: {
    src: string
    refreshKey: number
    editing: boolean
    onSelect: (key: string) => void
    selected: string | null
    /** The live draft, so visibility and image edits show without a save. */
    doc: PageDocument
    /** What the frame was rendered from, so only real changes are patched. */
    savedDoc: PageDocument
    /**
     * False while the mobile Edit tab is showing and this pane is display:none.
     *
     * A ResizeObserver is not delivered for an element that is not being
     * rendered, so going back to the Preview tab left the measured width stale
     * at zero and the frame stuck at its minimum. Re-measuring when this flips
     * is what keeps the frame the width of its pane.
     */
    active: boolean
    /** True from lg up, where the pane shows a scaled-down desktop render. */
    scaleToDesktop: boolean
}) {
    const wrapRef = React.useRef<HTMLDivElement>(null)
    const frameRef = React.useRef<HTMLIFrameElement>(null)
    const [box, setBox] = React.useState({ width: PREVIEW_WIDTH, height: 700 })

    React.useEffect(() => {
        const el = wrapRef.current
        if (!el || !active) return
        const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight })
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [active])

    // Everything the preview can reflect without a re-render: which sections are
    // switched off, and where each image points. Derived as one string so the
    // hooks re-run when one of those changes and not on every keystroke.
    const liveKey = [
        doc.sections.map((s) => `${s.id}:${s.hidden ? 1 : 0}`).join(","),
        [...imageSources(doc)].map(([k, v]) => `${k}=${v}`).join(","),
    ].join("|")

    useLivePreview(frameRef, doc, savedDoc, liveKey, refreshKey)

    /**
     * Desktop render scaled down, or the pane rendered at its own size?
     *
     * Keyed off the VIEWPORT, not the pane. Keying it off the pane looked
     * reasonable and was wrong: on a 1280px laptop the preview column is only
     * about 460px, so a pane-width test flipped the desktop editor to mobile
     * rendering too — the character grid went from four columns to two. The
     * question being asked is "is this a phone", and the viewport is what knows.
     *
     * So desktop behaviour is exactly what it was. Only the stacked layout below
     * lg, where a 1280px render would scale to about 28%, renders at pane width.
     */
    const frameWidth = scaleToDesktop ? PREVIEW_WIDTH : Math.max(box.width, 320)
    // box.width is 0 while the pane is display:none — the other tab is showing.
    // Guard it: a zero scale makes the height below Infinity.
    const scale = box.width > 0 ? Math.min(1, box.width / frameWidth) : 1
    const spots = useHotspots(frameRef, scale, refreshKey, editing, liveKey)

    return (
        <div
            ref={wrapRef}
            className="relative h-[72vh] w-full overflow-hidden rounded-xl border border-border bg-background"
        >
            <iframe
                ref={frameRef}
                key={refreshKey}
                src={src}
                title="Draft preview"
                style={{
                    width: frameWidth,
                    height: box.height / scale,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    border: 0,
                }}
            />

            {editing &&
                spots.map((spot) => {
                    const isSelected = spot.key === selected
                    return (
                        <button
                            key={spot.key}
                            type="button"
                            title={`Edit this ${spot.label}`}
                            onClick={() => onSelect(spot.key)}
                            style={{
                                position: "absolute",
                                top: spot.top,
                                left: spot.left,
                                width: spot.width,
                                height: spot.height,
                            }}
                            className={`group rounded-sm transition-colors ${
                                isSelected
                                    ? "bg-primary/15 ring-2 ring-primary"
                                    : "hover:bg-primary/10 hover:ring-2 hover:ring-primary/60"
                            }`}
                        >
                            <span className="pointer-events-none absolute left-0 top-0 hidden rounded-br bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground group-hover:block">
                                Edit
                            </span>
                        </button>
                    )
                })}
        </div>
    )
}

export function PageEditor({
    slug,
    title,
    initialDocument,
    initialHasChanges,
}: {
    slug: string
    title: string
    initialDocument: PageDocument
    initialHasChanges: boolean
}) {
    const [doc, setDoc] = React.useState<PageDocument>(initialDocument)
    /**
     * The document the preview iframe was rendered from — the last saved draft.
     *
     * Kept so the live patching below can push only what actually differs.
     * Rewriting every image on each frame load would replace Next's optimised
     * /_next/image sources with the raw originals, which on a page like
     * /characters means refetching 34 full-size images for no reason.
     */
    const [savedDoc, setSavedDoc] = React.useState<PageDocument>(initialDocument)
    const [dirty, setDirty] = React.useState(false)
    const [hasChanges, setHasChanges] = React.useState(initialHasChanges)
    const [busy, setBusy] = React.useState<null | "save" | "publish" | "discard">(null)
    const [previewKey, setPreviewKey] = React.useState(0)
    const [editing, setEditing] = React.useState(true)
    const [selected, setSelected] = React.useState<string | null>(null)
    /**
     * Which half of the editor a phone is showing.
     *
     * Below lg the two columns stack, and /characters has 35 blocks — so the
     * preview sat several screens below the fields that change it, which is the
     * one place it is no use. A pair of tabs puts it one tap away. Ignored from
     * lg up, where both are on screen at once.
     */
    const [mobilePane, setMobilePane] = React.useState<"edit" | "preview">("edit")

    /**
     * Whether the lg breakpoint is in force, matching the Tailwind classes that
     * decide the layout. Needed because the preview has to re-measure itself
     * when it stops being display:none, and only the viewport knows whether the
     * tabs are doing any hiding at all.
     */
    const [isWide, setIsWide] = React.useState(false)
    React.useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)")
        const sync = () => setIsWide(mq.matches)
        sync()
        mq.addEventListener("change", sync)
        return () => mq.removeEventListener("change", sync)
    }, [])

    /**
     * Bring the field for a clicked preview element into view and focus it.
     *
     * The two surfaces are joined by id alone: the preview stamps data-edit-id
     * on what it renders, the editor stamps data-field-id on the control that
     * changes it, and this is the only thing that knows they are the same
     * thing. Nothing depends on the two being in the same order.
     */
    const selectFromPreview = React.useCallback((key: string) => {
        setSelected(key)
        const [kind, ...rest] = key.split(":")
        const id = rest.join(":")
        const selector =
            kind === "section"
                ? `[data-section-card="${id}"]`
                : kind === "setting"
                  ? `[data-setting-id="${id}"]`
                  : `[data-field-id="${id}"]`
        const target = document.querySelector<HTMLElement>(selector)
        if (!target) return
        target.scrollIntoView({ behavior: "smooth", block: "center" })
        const field = target.matches("textarea,input")
            ? target
            : target.querySelector<HTMLElement>("textarea,input")
        // Focusing is what makes a click in the preview feel like it landed on
        // the thing you clicked, rather than merely scrolling near it.
        window.setTimeout(() => field?.focus({ preventScroll: true }), 320)
    }, [])

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

    const edit = (next: PageDocument) => {
        setDoc(next)
        setDirty(true)
    }

    const updateSection = (id: string, patch: Partial<PageSection>) =>
        edit({ ...doc, sections: doc.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

    /**
     * Switch a section on or off for visitors.
     *
     * Showing a section drops the flag rather than writing hidden: false.
     * "Are there unpublished changes" is answered by comparing the two
     * documents, so a section switched off and straight back on has to end up
     * byte-identical to how it started — otherwise the page would sit on
     * "unpublished changes" forever with nothing actually different in it.
     */
    const setSectionHidden = (id: string, hidden: boolean) =>
        edit({
            ...doc,
            sections: doc.sections.map((s) => {
                if (s.id !== id) return s
                const { hidden: _was, ...rest } = s
                return hidden ? { ...rest, hidden: true } : rest
            }),
        })

    async function handleSave() {
        setBusy("save")
        const res = await saveDraft(slug, doc)
        setBusy(null)
        if (!res.ok) return toast.error(`Save failed: ${res.error}`)
        setDirty(false)
        setSavedDoc(doc)
        setHasChanges(true)
        setPreviewKey((k) => k + 1)
        toast.success("Draft saved")
    }

    async function handlePublish() {
        // Publishing what is on screen, not what was last saved, is the only
        // behaviour that matches the button's label.
        setBusy("publish")
        if (dirty) {
            const saved = await saveDraft(slug, doc)
            if (!saved.ok) {
                setBusy(null)
                return toast.error(`Save failed: ${saved.error}`)
            }
            setDirty(false)
            setSavedDoc(doc)
        }
        const res = await publishPage(slug)
        setBusy(null)
        if (!res.ok) return toast.error(`Publish failed: ${res.error}`)
        setHasChanges(false)
        setPreviewKey((k) => k + 1)
        toast.success("Published — the live site is updated")
    }

    async function handleDiscard() {
        setBusy("discard")
        const res = await discardDraft(slug)
        setBusy(null)
        if (!res.ok) return toast.error(`Discard failed: ${res.error}`)
        toast.success("Draft reverted to the published version")
        window.location.reload()
    }

    function onSectionDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const from = doc.sections.findIndex((s) => s.id === active.id)
        const to = doc.sections.findIndex((s) => s.id === over.id)
        edit({ ...doc, sections: arrayMove(doc.sections, from, to) })
    }

    function onBlockDragEnd(sectionId: string, event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const section = doc.sections.find((s) => s.id === sectionId)
        if (!section) return
        const from = section.blocks.findIndex((b) => b.id === active.id)
        const to = section.blocks.findIndex((b) => b.id === over.id)
        updateSection(sectionId, { blocks: arrayMove(section.blocks, from, to) })
    }

    function addBlock(sectionId: string, type: PageBlock["type"]) {
        const section = doc.sections.find((s) => s.id === sectionId)
        if (!section) return
        const block: PageBlock =
            type === "image"
                ? { id: newId(), type: "image", src: "", alt: "" }
                : type === "card"
                  ? { id: newId(), type: "card", title: "New card", body: "" }
                  : type === "heading"
                    ? { id: newId(), type: "heading", level: 2, text: "New heading" }
                    : { id: newId(), type: "text", text: "New paragraph" }
        updateSection(sectionId, { blocks: [...section.blocks, block] })
    }

    function addSection() {
        edit({
            ...doc,
            sections: [
                ...doc.sections,
                {
                    id: `section-${newId()}`,
                    kind: "body",
                    name: "New section",
                    settings: {},
                    blocks: [{ id: newId(), type: "heading", level: 2, text: "New section" }],
                },
            ],
        })
    }

    const previewSrc = `/preview/${slug}?v=${previewKey}`

    return (
        <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Dev mode</p>
                    <h1 className="font-display text-3xl tracking-wide md:text-4xl">{title}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {dirty
                            ? "Unsaved edits"
                            : hasChanges
                              ? "Saved — not yet published"
                              : "Everything published"}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                        <a href={slug === "home" ? "/" : `/${slug}`} target="_blank" rel="noreferrer">
                            <Eye className="mr-1 size-4" /> Live page
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty || busy !== null}>
                        {busy === "save" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                        Save draft
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDiscard}
                        disabled={busy !== null || (!dirty && !hasChanges)}
                    >
                        <RotateCcw className="mr-1 size-4" /> Discard
                    </Button>
                    <Button size="sm" onClick={handlePublish} disabled={busy !== null || (!dirty && !hasChanges)}>
                        {busy === "publish" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                        Publish
                    </Button>
                </div>
            </div>

            {/* Edit / Preview, phones only. Rendered as real buttons rather
                than a Tabs component because the panels below are grid columns
                that must stay side by side from lg up — a Tabs root would have
                to be unwound at that breakpoint. */}
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/30 p-1 lg:hidden">
                {(["edit", "preview"] as const).map((pane) => (
                    <button
                        key={pane}
                        type="button"
                        onClick={() => setMobilePane(pane)}
                        aria-pressed={mobilePane === pane}
                        className={cn(
                            "rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors",
                            mobilePane === pane
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {pane === "edit" ? "Edit" : "Preview"}
                    </button>
                ))}
            </div>

            {/* Side by side from lg rather than xl. The admin sidebar already
                takes 256px, so an xl breakpoint meant the preview dropped below
                the fields on any window under about 1500px — which is where it
                was actually being used. The editor column is given slightly less
                room than the preview: its controls are fixed-height, the page
                being previewed is not.

                grid-cols-1 is NOT redundant with the single-column default, and
                removing it breaks the whole editor on a phone. Without an
                explicit template, the one column is an implicit `auto` track,
                which is sized by its content's max-content width — and
                overflow-hidden on the preview wrapper does not stop the 1280px
                iframe inside it from contributing. Measured at a 386px viewport
                the track computed to 1282px, so BOTH columns were 1282px wide
                and every field was clipped off-screen by the admin shell's
                overflow-x-hidden. minmax(0,1fr), which grid-cols-1 expands to,
                caps that contribution at the available width. */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* ---- editor ---- */}
                <div className={cn("min-w-0 space-y-4", mobilePane === "preview" && "hidden lg:block")}>
                    {/* Categories are page furniture for /browse specifically:
                        they are its filter buttons. They are stored as rows, not
                        in the page document, because the upload form needs them
                        too and a book's category is a foreign key. */}
                    {slug === "browse" && <GenreManager />}

                    {/* The same for /morefunk, where the merchandise categories
                        ARE the page's sections — their names are the headings and
                        their order is the running order. Without this the editor
                        could change the page's intro and nothing else, since
                        everything below it is generated from these rows. */}
                    {/* The Free Books section is a live query for eligible books,
                        not page content, so its running order cannot be reached
                        through the document either. Display Count, which decides
                        how many of them appear, IS a setting and sits with the
                        section's other fields below. */}
                    {slug === "book-club" && (
                        <BookClubFreePicks
                            displayCount={Number(
                                findSection(doc, "bookclub-free-books")?.settings?.displayCount ?? NaN,
                            )}
                            onChanged={() => setPreviewKey((k) => k + 1)}
                        />
                    )}

                    {/* /morefunk builds its sections from the merchandise rows,
                        so the running order of the products inside them cannot be
                        reached through the page document. The categories that
                        define the sections themselves are managed under
                        Merchandise, on the product form, rather than duplicated
                        here. */}
                    {slug === "morefunk" && (
                        <MerchProductOrder
                            // Rows, not the draft document, so the preview only
                            // picks a change up on a reload.
                            onChanged={() => setPreviewKey((k) => k + 1)}
                        />
                    )}

                    <DndContext
                        // Explicit and stable: without it dnd-kit derives its
                        // aria-describedby ids from a counter that advances
                        // differently on server and client, and React reports a
                        // hydration mismatch it cannot patch up.
                        id={`sections-${slug}`}
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={onSectionDragEnd}
                    >
                        <SortableContext
                            items={doc.sections.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {doc.sections.map((section) => (
                                <SortableRow key={section.id} id={section.id}>
                                    {(handle) => (
                                        <Card
                                            className={`mb-4 p-4 ${
                                                section.hidden ? "border-dashed bg-muted/20" : ""
                                            }`}
                                            data-section-card={section.id}
                                        >
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                {handle}
                                                <Input
                                                    value={section.name}
                                                    onChange={(e) =>
                                                        updateSection(section.id, { name: e.target.value })
                                                    }
                                                    // Full width on a phone, where sharing a
                                                    // row with the badge and the visibility
                                                    // controls left it unreadably narrow.
                                                    className="h-8 w-full min-w-0 font-semibold sm:w-auto sm:max-w-56"
                                                />
                                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                    {section.kind}
                                                </span>

                                                {/* Visibility. Stored as a flag rather than by
                                                    deleting the section, so switching it back on
                                                    restores the copy and images untouched. Like
                                                    every other edit here it only reaches visitors
                                                    at Publish. */}
                                                <div className="ml-auto flex items-center gap-2">
                                                    <Switch
                                                        id={`visible-${section.id}`}
                                                        checked={!section.hidden}
                                                        onCheckedChange={(on) =>
                                                            setSectionHidden(section.id, !on)
                                                        }
                                                        aria-label={
                                                            section.hidden
                                                                ? "Show this section on the live site"
                                                                : "Hide this section from the live site"
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor={`visible-${section.id}`}
                                                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"
                                                    >
                                                        {section.hidden ? (
                                                            <EyeOff className="size-3" />
                                                        ) : (
                                                            <Eye className="size-3" />
                                                        )}
                                                        {section.hidden ? "Hidden" : "Visible"}
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            edit({
                                                                ...doc,
                                                                sections: doc.sections.filter(
                                                                    (s) => s.id !== section.id,
                                                                ),
                                                            })
                                                        }
                                                        aria-label="Delete section"
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {section.hidden && (
                                                <p className="mb-3 rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                                                    Switched off — visitors will not see this
                                                    section once you publish. Its content is kept
                                                    and stays editable here.
                                                </p>
                                            )}

                                            {/* section settings: the headings, eyebrows and buttons
                                                that used to be hardcoded in JSX */}
                                            {Object.keys(section.settings).length > 0 && (
                                                <div className="mb-4 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                                                    {Object.entries(section.settings).map(([key, value]) => (
                                                        <div
                                                            key={key}
                                                            data-setting-id={`${section.id}:${key}`}
                                                            className="space-y-1"
                                                        >
                                                            <Label className="text-xs text-muted-foreground">
                                                                {label(key)}
                                                            </Label>
                                                            {IMAGE_SETTING_KEYS.includes(key) ? (
                                                                <ImageField
                                                                    value={String(value ?? "")}
                                                                    onChange={(next) =>
                                                                        updateSection(section.id, {
                                                                            settings: { ...section.settings, [key]: next },
                                                                        })
                                                                    }
                                                                />
                                                            ) : (
                                                                <>
                                                                    <Input
                                                                        value={String(value ?? "")}
                                                                        onChange={(e) =>
                                                                            updateSection(section.id, {
                                                                                settings: {
                                                                                    ...section.settings,
                                                                                    [key]: e.target.value,
                                                                                },
                                                                            })
                                                                        }
                                                                    />
                                                                    {VIDEO_SETTING_KEYS.includes(key) &&
                                                                        (() => {
                                                                            const hint = videoHint(String(value ?? ""))
                                                                            if (!hint) return null
                                                                            return (
                                                                                <p
                                                                                    className={`text-xs ${
                                                                                        hint.tone === "warn"
                                                                                            ? "text-yellow-500"
                                                                                            : "text-muted-foreground"
                                                                                    }`}
                                                                                >
                                                                                    {hint.text}
                                                                                </p>
                                                                            )
                                                                        })()}
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <DndContext
                                                id={`blocks-${section.id}`}
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                modifiers={[restrictToVerticalAxis]}
                                                onDragEnd={(e) => onBlockDragEnd(section.id, e)}
                                            >
                                                <SortableContext
                                                    items={section.blocks.map((b) => b.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-2">
                                                        {section.blocks.map((block) => (
                                                            <SortableRow key={block.id} id={block.id}>
                                                                {(h) => (
                                                                    <BlockEditor
                                                                        block={block}
                                                                        handle={h}
                                                                        onChange={(next) =>
                                                                            updateSection(section.id, {
                                                                                blocks: section.blocks.map((b) =>
                                                                                    b.id === block.id ? next : b,
                                                                                ),
                                                                            })
                                                                        }
                                                                        onDelete={() =>
                                                                            updateSection(section.id, {
                                                                                blocks: section.blocks.filter(
                                                                                    (b) => b.id !== block.id,
                                                                                ),
                                                                            })
                                                                        }
                                                                    />
                                                                )}
                                                            </SortableRow>
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(["heading", "text", "image", "card"] as const).map((t) => (
                                                    <Button
                                                        key={t}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addBlock(section.id, t)}
                                                    >
                                                        <Plus className="mr-1 size-3" /> {t}
                                                    </Button>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </SortableRow>
                            ))}
                        </SortableContext>
                    </DndContext>

                    <Button type="button" variant="outline" onClick={addSection}>
                        <Plus className="mr-1 size-4" /> Add section
                    </Button>
                </div>

                {/* ---- preview ---- */}
                {/* Sticky so the preview stays in view while scrolling a long
                    page of fields — /characters has 35 blocks. */}
                <div
                    className={cn(
                        "min-w-0 lg:sticky lg:top-20 lg:self-start",
                        mobilePane === "edit" && "hidden lg:block",
                    )}
                >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Draft preview
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                            <Button
                                variant={editing ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setEditing((v) => !v)}
                                aria-pressed={editing}
                                title="Toggle the click-to-edit overlay"
                            >
                                <MousePointerClick className="mr-1 size-3" />
                                {editing ? "Click-to-edit on" : "Click-to-edit off"}
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <a href={previewSrc} target="_blank" rel="noreferrer">
                                    <Eye className="mr-1 size-3" /> Full size
                                </a>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
                                <RotateCcw className="mr-1 size-3" /> Refresh
                            </Button>
                        </div>
                    </div>
                    {dirty && (
                        <p className="mb-2 text-xs text-yellow-500">
                            Section visibility and images preview live. Text edits appear
                            once you save.
                        </p>
                    )}
                    <PreviewFrame
                        src={previewSrc}
                        refreshKey={previewKey}
                        editing={editing}
                        onSelect={selectFromPreview}
                        selected={selected}
                        doc={doc}
                        savedDoc={savedDoc}
                        // From lg up both columns are always on screen, so the
                        // pane is only ever hidden by the phone tabs.
                        active={mobilePane === "preview" || isWide}
                        scaleToDesktop={isWide}
                    />
                </div>
            </div>
        </div>
    )
}
