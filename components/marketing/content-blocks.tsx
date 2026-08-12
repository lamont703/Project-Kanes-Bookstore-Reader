import Image from "next/image"
import type { MarketingBlock } from "@/lib/marketing-content"

/**
 * Renders imported marketing content in document order.
 *
 * Runs of consecutive images collapse into a responsive gallery grid — the
 * source pages (notably /characters) are long image sequences, and stacking
 * them one per row would be unreadable.
 */

function Heading({ level, text }: { level: number; text: string }) {
    const cls =
        level <= 1
            ? "text-3xl md:text-5xl font-bold tracking-tight text-balance"
            : level === 2
              ? "text-2xl md:text-3xl font-bold tracking-tight text-balance"
              : "text-lg md:text-xl font-semibold tracking-tight"
    const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as "h1"
    return <Tag className={`${cls} mt-10 first:mt-0`}>{text}</Tag>
}

function Gallery({ images }: { images: Extract<MarketingBlock, { type: "image" }>[] }) {
    if (images.length === 1) {
        const img = images[0]
        return (
            <div className="my-8 overflow-hidden rounded-xl border border-border">
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
                    className="overflow-hidden rounded-xl border border-border bg-card"
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
