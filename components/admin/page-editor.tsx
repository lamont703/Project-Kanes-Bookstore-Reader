"use client"

import * as React from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Trash2, Upload, Loader2, RotateCcw, Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { saveDraft, publishPage, discardDraft } from "@/lib/page-editor"
import type { PageBlock, PageDocument, PageSection } from "@/lib/page-content"

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
                        <ImageField value={block.src} onChange={(src) => onChange({ ...block, src })} />
                        <Input
                            value={block.alt}
                            placeholder="Alt text (describes the image for screen readers)"
                            onChange={(e) => onChange({ ...block, alt: e.target.value })}
                            className="text-xs"
                        />
                    </div>
                ) : (
                    <textarea
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

    const previewSrc = `/admin/pages/${slug}/preview?v=${previewKey}`

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
                    <DndContext
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
                                        <Card className="mb-4 p-4">
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
                                                        <div key={key} className="space-y-1">
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
                        <Button variant="ghost" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
                            <RotateCcw className="mr-1 size-3" /> Refresh
                        </Button>
                    </div>
                    {dirty && (
                        <p className="mb-2 text-xs text-yellow-500">
                            Preview shows the last saved draft. Save to see these edits.
                        </p>
                    )}
                    <iframe
                        key={previewKey}
                        src={previewSrc}
                        title="Draft preview"
                        className="h-[70vh] w-full rounded-xl border border-border bg-background"
                    />
                </div>
            </div>
        </div>
    )
}
