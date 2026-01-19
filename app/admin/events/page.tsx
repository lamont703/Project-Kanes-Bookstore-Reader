import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Search, MapPin, Video, Users, ExternalLink } from "lucide-react"

export default function AdminEventsPage() {
    return (
        <div className="p-4 md:p-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
                        <span className="text-primary">COSMIC</span> <span className="text-secondary">EVENTS</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground">Schedule and manage virtual author meetups</p>
                </div>
                <Button className="font-display tracking-wider text-sm px-6 w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    CREATE EVENT
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                <Card className="p-5 md:p-6 bg-card/50 backdrop-blur border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Upcoming</p>
                    <p className="font-display text-3xl md:text-4xl">0</p>
                </Card>
                <Card className="p-5 md:p-6 bg-card/50 backdrop-blur border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Attendees</p>
                    <p className="font-display text-3xl md:text-4xl">12.4K</p>
                </Card>
                <Card className="p-5 md:p-6 bg-card/50 backdrop-blur border-border sm:col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                    <p className="font-display text-3xl md:text-4xl">48</p>
                </Card>
            </div>

            {/* Empty State / Placeholder for List */}
            <Card className="p-8 md:p-16 border-dashed border-2 border-border bg-card/10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-8 h-8 md:w-10 md:h-10 text-primary opacity-50" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-wide mb-3 uppercase">Clear Galactic Skies</h3>
                <p className="text-sm md:text-lg text-muted-foreground max-w-sm mb-8">
                    No events are scheduled for this cycle. Time to plan some intergalactic gatherings!
                </p>
                <Button size="lg" className="w-full sm:w-auto px-8 font-display tracking-widest text-lg">
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
