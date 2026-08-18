/**
 * Admin list loading state.
 *
 * Previously returned null, which blanked the content area mid-transition. The
 * admin layout shell survives, so only this region needed filling — but a blank
 * still reads as something breaking rather than loading.
 */
export default function Loading() {
    return (
        <div className="container mx-auto animate-pulse px-4 py-8">
            <div className="mb-8 h-10 w-64 rounded bg-muted/40" />
            <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                        <div className="size-14 shrink-0 rounded bg-muted/30" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 rounded bg-muted/30" />
                            <div className="h-3 w-1/5 rounded bg-muted/20" />
                        </div>
                        <div className="h-8 w-20 rounded bg-muted/20" />
                    </div>
                ))}
            </div>
        </div>
    )
}
