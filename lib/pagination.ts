/**
 * Page numbers to render, collapsing long runs to ellipses.
 *
 * The catalogue is past 400 books, so at any sane page size every number will
 * not fit on one line. Always show the first and last, plus a window around the
 * current page.
 *
 * Lives here rather than in components/browse-pagination.tsx so the admin
 * catalogue table can use the same logic without importing a "use client"
 * module or growing a second copy that drifts.
 */
export function pageWindow(current: number, total: number): (number | "gap")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages = new Set<number>([1, total, current, current - 1, current + 1])
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
    if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p))

    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const out: (number | "gap")[] = []
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("gap")
        out.push(p)
    })
    return out
}
