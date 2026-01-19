import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Search, Filter, Trash2, ShieldCheck, AlertCircle } from "lucide-react"

export default function AdminDiscussionsPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="font-display text-5xl tracking-wider mb-2">
                    <span className="text-primary">MODERATE</span> <span className="text-secondary">DISCUSSIONS</span>
                </h1>
                <p className="text-lg text-muted-foreground">Manage community conversations and forum safety</p>
            </div>

            <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search discussions or reports..."
                        className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <Button variant="outline" className="bg-transparent border-border">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                </Button>
            </div>

            {/* Empty State / Placeholder for List */}
            <Card className="p-12 border-dashed border-2 border-border bg-card/10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-2xl tracking-wide mb-2">NO FLAG ITEMS</h3>
                <p className="text-muted-foreground max-w-md">
                    Great job! There are currently no discussions flagged for moderation.
                    The community is healthy and thriving across the cosmos.
                </p>
                <div className="mt-8 flex gap-4">
                    <Button variant="outline" className="bg-transparent">View Active Forums</Button>
                    <Button variant="outline" className="bg-transparent">Moderation Logs</Button>
                </div>
            </Card>

            {/* Loading State Skeleton Placeholder */}
            <div className="mt-12 space-y-4 opacity-30 pointer-events-none">
                <div className="h-4 bg-muted w-32 rounded animate-pulse" />
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-6 bg-card/50">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-muted rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted w-1/3 rounded" />
                                    <div className="h-3 bg-muted w-2/3 rounded" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
