import Image from "next/image"
import type { PageBlock } from "@/lib/page-content"
import { TileGrid, TILE_BASIS } from "@/components/marketing/tile-grid"

/**
 * Renders imported marketing content in document order.
 *
 * Typography follows the app's design system (app/globals.css): headings use
 * font-display in tracking-wider uppercase, body copy is text-muted-foreground.
 * Runs of consecutive images collapse into a responsive gallery grid — the
 * source pages (notably /characters) are long image sequences, and stacking
 * them one per row would be unreadable.
 */

function Heading({ level, text, editId }: { level: number; text: string; editId?: string }) {
    const cls =
        level <= 1
            ? "font-display text-4xl md:text-5xl tracking-wider uppercase text-primary"
            : level === 2
              ? "font-display text-2xl md:text-3xl tracking-wider uppercase text-secondary"
              : "font-display text-xl tracking-wide uppercase text-foreground"
    const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as "h1"
    return <Tag className={`${cls} mt-10 first:mt-0`} data-edit-id={editId}>{text}</Tag>
}

function Gallery({ images }: { images: Extract<PageBlock, { type: "image" }>[] }) {
    if (images.length === 1) {
        const img = images[0]
        return (
            <div className="my-8 overflow-hidden rounded-xl border border-border bg-card" data-edit-id={img.id}>
                <Image
                    src={img.src}
                    alt={img.alt}
                    width={1024}
                    height={1024}
                    className="h-auto w-full object-cover"
                />
            </div>
        )
    }
    // Square boxes, not natural height: these pages mix aspect ratios
    // (/characters ranges 0.67 to 1.0), so without a fixed box the rows come
    // out ragged and nothing lines up.
    return (
        <TileGrid className="my-8">
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
                        height={512}
                        className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                </div>
            ))}
        </TileGrid>
    )
}

export function ContentBlocks({ blocks }: { blocks: PageBlock[] }) {
    const rendered: React.ReactNode[] = []
    let run: Extract<PageBlock, { type: "image" }>[] = []

    const flushRun = (key: string) => {
        if (run.length) {
            rendered.push(<Gallery key={key} images={run} />)
            run = []
        }
    }

    blocks.forEach((block, i) => {
        if (block.type === "image") {
            run.push(block)
            return
        }
        flushRun(`gallery-${i}`)
        if (block.type === "heading") {
            rendered.push(
                <Heading key={block.id} level={block.level} text={block.text} editId={block.id} />,
            )
        } else {
            rendered.push(
                <p
                    key={block.id}
                    data-edit-id={block.id}
                    className="mt-4 leading-relaxed text-muted-foreground"
                >
                    {block.text}
                </p>,
            )
        }
    })
    flushRun("gallery-end")

    return <>{rendered}</>
}
