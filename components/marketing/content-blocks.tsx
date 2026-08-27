import type { PageBlock } from "@/lib/page-content"
import { LightboxGallery } from "@/components/marketing/gallery-lightbox"

/**
 * Renders imported marketing content in document order.
 *
 * Typography follows the app's design system (app/globals.css): headings use
 * font-display in tracking-wider uppercase, body copy is text-muted-foreground.
 * Runs of consecutive images collapse into a responsive gallery grid — the
 * source pages (notably /characters) are long image sequences, and stacking
 * them one per row would be unreadable.
 *
 * This stays a Server Component. Only the gallery is interactive, and it lives
 * in LightboxGallery, which owns the full-screen viewer its tiles open.
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

/**
 * A run of consecutive images.
 *
 * The tiles are square crops, so on /characters a thumbnail usually shows the
 * middle of a portrait with the rest cut off — hence the full-screen viewer,
 * which LightboxGallery provides. Blocks keep their data-edit-id so the admin
 * page editor can still target each image.
 */
function Gallery({ images }: { images: Extract<PageBlock, { type: "image" }>[] }) {
    return (
        <LightboxGallery
            images={images.map((img) => ({ id: img.id, src: img.src, alt: img.alt }))}
        />
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
