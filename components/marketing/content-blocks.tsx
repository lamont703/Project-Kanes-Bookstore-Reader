import Image from "next/image"
import type { MarketingBlock } from "@/lib/marketing-content"

/**
 * Renders imported marketing content in document order.
 *
 * Typography follows the app's design system (app/globals.css): headings use
 * font-display in tracking-wider uppercase, body copy is text-muted-foreground.
 * Runs of consecutive images collapse into a responsive gallery grid — the
 * source pages (notably /characters) are long image sequences, and stacking
 * them one per row would be unreadable.
 */

function Heading({ level, text }: { level: number; text: string }) {
    const cls =
        level <= 1
            ? "font-display text-4xl md:text-5xl tracking-wider uppercase text-primary"
            : level === 2
              ? "font-display text-2xl md:text-3xl tracking-wider uppercase text-secondary"
              : "font-display text-xl tracking-wide uppercase text-foreground"
    const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as "h1"
    return <Tag className={`${cls} mt-10 first:mt-0`}>{text}</Tag>
}

function Gallery({ images }: { images: Extract<MarketingBlock, { type: "image" }>[] }) {
    if (images.length === 1) {
        const img = images[0]
        return (
            <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
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
    return (
        <div className="my-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
                <div
                    key={img.src}
                    className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
                >
                    <Image
                        src={img.src}
                        alt={img.alt}
                        width={512}
                        height={512}
                        className="h-auto w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                </div>
            ))}
        </div>
    )
}

export function ContentBlocks({ blocks }: { blocks: MarketingBlock[] }) {
    const rendered: React.ReactNode[] = []
    let run: Extract<MarketingBlock, { type: "image" }>[] = []

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
            rendered.push(<Heading key={i} level={block.level} text={block.text} />)
        } else {
            rendered.push(
                <p key={i} className="mt-4 leading-relaxed text-muted-foreground">
                    {block.text}
                </p>,
            )
        }
    })
    flushRun("gallery-end")

    return <>{rendered}</>
}
