"use client"

import * as React from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Trash2, Upload, Loader2, RotateCcw, Eye, MousePointerClick } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { saveDraft, publishPage, discardDraft } from "@/lib/page-editor"
import { GenreManager } from "@/components/admin/genre-manager"
import type { PageBlock, PageDocument, PageSection } from "@/lib/page-model"

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
            <div className="size-20 shrink-0 overflow-hidden rounded border border-border bg-muted">
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
 * Renders the page at a real desktop width and scales it down to fit, rather
 * than letting a half-width pane render the site at its mobile breakpoints. An
 * admin checking a layout wants to see the layout visitors get, not a phone
 * rendering of it.
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
function useHotspots(
    frameRef: React.RefObject<HTMLIFrameElement | null>,
    scale: number,
    refreshKey: number,
    enabled: boolean,
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
    }, [frameRef, scale, refreshKey, enabled])

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
}: {
    src: string
    refreshKey: number
    editing: boolean
    onSelect: (key: string) => void
    selected: string | null
}) {
    const wrapRef = React.useRef<HTMLDivElement>(null)
    const frameRef = React.useRef<HTMLIFrameElement>(null)
    const [box, setBox] = React.useState({ width: PREVIEW_WIDTH, height: 700 })

    React.useEffect(() => {
        const el = wrapRef.current
        if (!el) return
        const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight })
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Never scale up: on a narrow screen the pane is already full width.
    const scale = Math.min(1, box.width / PREVIEW_WIDTH)
    const spots = useHotspots(frameRef, scale, refreshKey, editing)

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
                    width: PREVIEW_WIDTH,
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
    const [dirty, setDirty] = React.useState(false)
    const [hasChanges, setHasChanges] = React.useState(initialHasChanges)
    const [busy, setBusy] = React.useState<null | "save" | "publish" | "discard">(null)
    const [previewKey, setPreviewKey] = React.useState(0)
    const [editing, setEditing] = React.useState(true)
    const [selected, setSelected] = React.useState<string | null>(null)

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

    async function handleSave() {
        setBusy("save")
        const res = await saveDraft(slug, doc)
        setBusy(null)
        if (!res.ok) return toast.error(`Save failed: ${res.error}`)
        setDirty(false)
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
        <div className="container mx-auto px-4 py-8">
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* ---- editor ---- */}
                <div className="space-y-4">
                    {/* Categories are page furniture for /browse specifically:
                        they are its filter buttons. They are stored as rows, not
                        in the page document, because the upload form needs them
                        too and a book's category is a foreign key. */}
                    {slug === "browse" && <GenreManager />}

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
                                        <Card className="mb-4 p-4" data-section-card={section.id}>
                                            <div className="mb-3 flex items-center gap-2">
                                                {handle}
                                                <Input
                                                    value={section.name}
                                                    onChange={(e) =>
                                                        updateSection(section.id, { name: e.target.value })
                                                    }
                                                    className="h-8 max-w-56 font-semibold"
                                                />
                                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                    {section.kind}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="ml-auto"
                                                    onClick={() =>
                                                        edit({
                                                            ...doc,
                                                            sections: doc.sections.filter((s) => s.id !== section.id),
                                                        })
                                                    }
                                                    aria-label="Delete section"
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>

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
                                                {(["heading", "text", "image"] as const).map((t) => (
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
                <div className="xl:sticky xl:top-20 xl:self-start">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Draft preview
                        </p>
                        <div className="flex items-center gap-1">
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
                            Preview shows the last saved draft. Save to see these edits.
                        </p>
                    )}
                    <PreviewFrame
                        src={previewSrc}
                        refreshKey={previewKey}
                        editing={editing}
                        onSelect={selectFromPreview}
                        selected={selected}
                    />
                </div>
            </div>
        </div>
    )
}
