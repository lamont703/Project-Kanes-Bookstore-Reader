"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Calendar,
    Plus,
    Search,
    MapPin,
    Video,
    Users,
    ExternalLink,
    Edit2,
    Trash2,
    Clock,
    ArrowRight,
    ImageIcon,
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { mockEvents, type BookClubEvent } from "@/lib/mock-book-club-data"
import { toast } from "sonner"
import Image from "next/image"

export default function AdminEventsPage() {
    const [events, setEvents] = useState<BookClubEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [currentEvent, setCurrentEvent] = useState<BookClubEvent | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<BookClubEvent>>({
        title: "",
        description: "",
        date: new Date(),
        time: "",
        location: "",
        type: "virtual",
        coverImage: ""
    })

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setEvents([...mockEvents].sort((a, b) => a.date.getTime() - b.date.getTime()))
            setIsLoading(false)
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const upcomingEvents = filteredEvents.filter(e => e.status === "upcoming")
    const pastEvents = filteredEvents.filter(e => e.status === "past")

    const handleOpenCreate = () => {
        setCurrentEvent(null)
        setFormData({
            title: "",
            description: "",
            date: new Date(),
            time: "",
            location: "",
            type: "virtual",
            coverImage: ""
        })
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (event: BookClubEvent) => {
        setCurrentEvent(event)
        setFormData({
            ...event
        })
        setIsDialogOpen(true)
    }

    const handleSave = () => {
        if (!formData.title || !formData.date || !formData.time || !formData.location) {
            toast.error("Please fill in all galactic transmission coordinates")
            return
        }

        if (currentEvent) {
            // Mock Edit
            setEvents(prev => prev.map(e => e.id === currentEvent.id ? { ...e, ...formData } as BookClubEvent : e).sort((a, b) => a.date.getTime() - b.date.getTime()))
            toast.success("Event signal updated across the star system")
        } else {
            // Mock Create
            const newEvent: BookClubEvent = {
                id: `event-${Date.now()}`,
                title: formData.title!,
                description: formData.description || "",
                date: formData.date!,
                time: formData.time!,
                location: formData.location!,
                type: formData.type as any,
                coverImage: formData.coverImage,
                attendees: 0,
                status: new Date(formData.date!) > new Date() ? "upcoming" : "past"
            }
            setEvents(prev => [...prev, newEvent].sort((a, b) => a.date.getTime() - b.date.getTime()))
            toast.success("New event transmission scheduled")
        }
        setIsDialogOpen(false)
    }

    const handleDelete = () => {
        if (currentEvent) {
            setEvents(prev => prev.filter(e => e.id !== currentEvent.id))
            toast.success("Event purged from the galactic timeline")
            setIsDeleteModalOpen(false)
        }
    }

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
                        <span className="text-primary">EVENT</span> <span className="text-secondary">ORCHESTRATION</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground">Schedule and manage interstellar author meetups and workshops</p>
                </div>
                <Button size="lg" className="font-display tracking-wider text-lg w-full md:w-auto" onClick={handleOpenCreate}>
                    <Plus className="w-5 h-5 mr-2" />
                    SCHEDULE EVENT
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-5 bg-card/50 backdrop-blur border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Upcoming</p>
                    <p className="font-display text-3xl">{upcomingEvents.length}</p>
                </Card>
                <Card className="p-5 bg-card/50 backdrop-blur border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total Attendees</p>
                    <p className="font-display text-3xl">12.4K</p>
                </Card>
                <Card className="p-5 bg-card/50 backdrop-blur border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Completed</p>
                    <p className="font-display text-3xl">{events.filter(e => e.status === "past").length}</p>
                </Card>
                <Card className="p-5 bg-card/50 backdrop-blur border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Avg Engagement</p>
                    <p className="font-display text-3xl">78%</p>
                </Card>
            </div>

            {/* Controls */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search events by title..."
                        className="pl-10 bg-card/50 border-border/50 h-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Events List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-6 bg-card/30 border-border/30 animate-pulse">
                            <div className="flex gap-6">
                                <div className="hidden md:block w-32 h-20 bg-muted rounded" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 bg-muted rounded w-1/3" />
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : filteredEvents.length > 0 ? (
                <div className="space-y-12">
                    {/* Upcoming Section */}
                    {upcomingEvents.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-primary/20" />
                                <h2 className="font-display text-xl tracking-widest text-primary uppercase">Upcoming Signals</h2>
                                <div className="h-px flex-1 bg-primary/20" />
                            </div>
                            <div className="grid gap-4">
                                {upcomingEvents.map(event => (
                                    <EventListItem key={event.id} event={event} onEdit={handleOpenEdit} onDelete={(e) => { setCurrentEvent(e); setIsDeleteModalOpen(true); }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Section */}
                    {pastEvents.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-muted/20" />
                                <h2 className="font-display text-xl tracking-widest text-muted-foreground uppercase">Archived Transmissions</h2>
                                <div className="h-px flex-1 bg-muted/20" />
                            </div>
                            <div className="grid gap-4 opacity-70">
                                {pastEvents.map(event => (
                                    <EventListItem key={event.id} event={event} onEdit={handleOpenEdit} onDelete={(e) => { setCurrentEvent(e); setIsDeleteModalOpen(true); }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="p-16 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                    <Calendar className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="font-display text-3xl tracking-wide uppercase mb-2">Clear Galactic Skies</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">No event signals detected in this sector. Time to schedule a new mission.</p>
                    <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>
                </Card>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-card border-primary/20 overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl tracking-wider text-primary uppercase leading-none">
                            {currentEvent ? "Modify Mission Details" : "Schedule New Transmission"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the time, coordinates, and briefing for this book club event.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Live Q&A with Zara Nebula"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Briefing / Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about the event mission..."
                                className="h-24"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date">Deployment Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : ""}
                                    onChange={e => setFormData({ ...formData, date: new Date(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="time">Commencement Time</Label>
                                <Input
                                    id="time"
                                    placeholder="e.g., 7:00 PM EST"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Environment Type</Label>
                                <select
                                    id="type"
                                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="virtual">Virtual Simulation</option>
                                    <option value="in-person">Physical Gathering</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location">Access Point (Link or Location)</Label>
                                <Input
                                    id="location"
                                    placeholder="e.g., https://zoom.us/..."
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="image">Signals / Cover Image URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="image"
                                    placeholder="/images/event-header.jpg"
                                    value={formData.coverImage}
                                    className="flex-1"
                                    onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                                />
                                <Button variant="outline" size="icon" className="shrink-0"><ImageIcon className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Abort Mission</Button>
                        <Button className="font-display tracking-widest w-full sm:w-auto" onClick={handleSave}>
                            {currentEvent ? "UPDATE SIGNAL" : "BROADCAST EVENT"} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-md bg-card border-destructive/20">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl tracking-wider text-destructive uppercase">Delete Transmission?</DialogTitle>
                        <DialogDescription className="text-lg">
                            Are you certain you want to purge <span className="text-foreground font-bold italic">"{currentEvent?.title}"</span>? This action cannot be reversed in this timeline.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="w-full sm:w-auto">Keep Archive</Button>
                        <Button variant="destructive" className="font-display tracking-widest w-full sm:w-auto" onClick={handleDelete}>PURGE DATA</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EventListItem({ event, onEdit, onDelete }: { event: BookClubEvent, onEdit: (e: BookClubEvent) => void, onDelete: (e: BookClubEvent) => void }) {
    const isPast = event.status === "past"

    return (
        <Card className={`group relative overflow-hidden bg-card/40 backdrop-blur border-border/50 hover:border-primary/30 transition-all ${isPast ? "bg-muted/10 grayscale-[0.5]" : ""}`}>
            <div className="flex flex-col md:flex-row gap-6 p-5">
                {/* Cover Thumbnail */}
                <div className="relative w-full md:w-48 h-32 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    {event.coverImage ? (
                        <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <ImageIcon className="w-10 h-10 text-muted-foreground opacity-30" />
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${event.type === "virtual" ? "bg-primary/80 text-primary-foreground" : "bg-secondary/80 text-secondary-foreground"}`}>
                        {event.type === "virtual" ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                        {event.type}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            {event.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-muted-foreground opacity-20">•</span>
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">{event.time}</span>
                    </div>

                    <h3 className={`font-display text-2xl md:text-3xl tracking-wide mb-2 truncate ${isPast ? "text-muted-foreground" : "group-hover:text-primary transition-colors"}`}>
                        {event.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
                        {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{event.attendees} Attending</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground max-w-[200px] truncate">
                            {event.type === "virtual" ? <ExternalLink className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                            <span>{event.location}</span>
                        </div>
                        {isPast && (
                            <span className="ml-auto text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">Completed</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col justify-end md:justify-center items-center gap-2 border-t md:border-t-0 md:border-l border-border/30 pt-4 md:pt-0 md:pl-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50"
                        onClick={() => onEdit(event)}
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50"
                        onClick={() => onDelete(event)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}
