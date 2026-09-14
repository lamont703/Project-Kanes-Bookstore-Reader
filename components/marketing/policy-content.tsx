import type { PageBlock } from "@/lib/page-content"

/**
 * Renders the imported privacy policy.
 *
 * The source stores the whole policy as one markdown blob, which the content
 * import flattened into sequential text lines. Rendered as plain paragraphs the
 * markup shows literally — "### Information We Collect", "---" between sections,
 * "- " before every bullet. This turns the four constructs actually used back
 * into real elements; a markdown dependency would be overkill for that set.
 */
export function PolicyContent({ blocks }: { blocks: PageBlock[] }) {
    const lines = blocks
        .filter((b): b is Extract<PageBlock, { type: "text" }> => b.type === "text")
        .map((b) => ({ id: b.id, text: b.text.trim() }))

    const out: React.ReactNode[] = []
    let bullets: { id: string; text: string }[] = []

    const flushBullets = (key: string) => {
        if (!bullets.length) return
        out.push(
            <ul key={key} className="mt-3 list-disc space-y-1 pl-6 text-muted-foreground">
                {bullets.map((b) => (
                    <li key={b.id} data-edit-id={b.id}>
                        {b.text}
                    </li>
                ))}
            </ul>,
        )
        bullets = []
    }

    lines.forEach(({ id, text: line }, i) => {
        if (line.startsWith("- ")) {
            bullets.push({ id, text: line.slice(2).trim() })
            return
        }
        flushBullets(`ul-${i}`)

        if (line === "---") {
            out.push(<hr key={id} data-edit-id={id} className="my-10 border-border" />)
        } else if (line.startsWith("###")) {
            out.push(
                <h2
                    key={id}
                    data-edit-id={id}
                    className="font-display mt-10 text-2xl uppercase tracking-wider text-secondary"
                >
                    {line.replace(/^#+\s*/, "")}
                </h2>,
            )
        } else if (/^\d+\.\s/.test(line)) {
            // "1. Personal Information" — a labelled subsection, not a list item
            out.push(
                <h3 key={id} data-edit-id={id} className="mt-6 font-semibold text-foreground">
                    {line}
                </h3>,
            )
        } else {
            out.push(
                <p key={id} data-edit-id={id} className="mt-4 leading-relaxed text-muted-foreground">
                    {line}
                </p>,
            )
        }
    })
    flushBullets("ul-end")

    return <>{out}</>
}
