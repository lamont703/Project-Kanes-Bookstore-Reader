import { cn } from "@/lib/utils"

/**
 * Shared tile layout for every gallery and card grid on the marketing pages.
 *
 * Flex-wrap with justify-center rather than CSS grid. None of these collections
 * divides evenly into four columns — /characters has 33 images, /privacy-policy
 * 9, /komet-book-club 5, and the live catalog pages vary with whatever admin
 * has published. A grid pins the remainder hard-left against empty cells; this
 * centres the final row instead.
 *
 * Tiles must carry TILE_BASIS so full rows still fill edge to edge: each width
 * subtracts that row's share of the 1rem gap (2-up loses one gap, 3-up two,
 * 4-up three).
 */

export const TILE_BASIS =
    "w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]"

export function TileGrid({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex flex-wrap justify-center gap-4", className)}>{children}</div>
    )
}
