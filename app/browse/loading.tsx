import { SiteHeader } from "@/components/site-header"

/**
 * Loading state for /browse.
 *
 * This previously returned null, which blanked the whole page — header included —
 * during the transition, then repainted everything. That reads as a full page
 * reload even though the navigation is client-side.
 *
 * Rendering the header plus a skeleton keeps the chrome stable, so only the
 * catalogue area changes while the server responds.
 */
export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <div className="container mx-auto animate-pulse px-4 py-8">
                <div className="mb-8">
                    <div className="h-12 w-2/3 max-w-md rounded bg-muted/40" />
                    <div className="mt-3 h-4 w-full max-w-xl rounded bg-muted/20" />
                </div>
                <div className="mb-6 h-10 w-full rounded bg-muted/20" />
                <div className="mb-8 flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-8 w-20 rounded bg-muted/20" />
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-3">
                            <div className="aspect-[2/3] w-full rounded-lg bg-muted/30" />
                            <div className="mt-3 h-4 w-3/4 rounded bg-muted/30" />
                            <div className="mt-2 h-3 w-1/2 rounded bg-muted/20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
