import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Search, MapPin, Video, Users, ExternalLink } from "lucide-react"

export default function AdminEventsPage() {
    return (
        <div className="p-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="font-display text-5xl tracking-wider mb-2">
                        <span className="text-primary">COSMIC</span> <span className="text-secondary">EVENTS</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">Schedule and manage virtual author meetups</p>
                </div>
                <Button className="font-display tracking-wider text-sm px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    CREATE EVENT
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Upcoming</p>
                    <p className="font-display text-4xl">0</p>
                </Card>
                <Card className="p-6 bg-card/50 backdrop-blur border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Attendees</p>
                    <p className="font-display text-4xl">12.4K</p>
                </Card>
                <Card className="p-6 bg-card/50 backdrop-blur border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                    <p className="font-display text-4xl">48</p>
                </Card>
            </div>

            {/* Empty State / Placeholder for List */}
            <Card className="p-16 border-dashed border-2 border-border bg-card/10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-primary opacity-50" />
                </div>
                <h3 className="font-display text-3xl tracking-wide mb-3">CLEAR GALACTIC SKIES</h3>
                <p className="text-muted-foreground max-w-sm mb-8 text-lg">
                    No events are scheduled for this cycle. Time to plan some intergalactic gatherings!
                </p>
                <Button size="lg" className="px-8 font-display tracking-widest text-lg">
                    PLAN FIRST EVENT
                </Button>
            </Card>

            {/* Loading Skeleton */}
            <div className="mt-12 opacity-20 space-y-4">
                <div className="h-6 bg-muted w-48 rounded mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <Card key={i} className="p-6 bg-card">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-muted w-1/4 rounded" />
                                    <div className="h-6 bg-muted w-3/4 rounded" />
                                </div>
                                <div className="w-8 h-8 bg-muted rounded" />
                            </div>
                            <div className="h-10 bg-muted w-full rounded" />
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
