"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
    MapPin,
    Video,
    Users,
    ExternalLink,
    Edit2,
    Trash2,
    Clock,
    ArrowRight,
    ImageIcon,
    Eye,
    EyeOff,
    Loader2,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface BookClubEvent {
    id: string
    title: string
    description: string | null
    date: string          // DATE stored as ISO string
    time: string
    location: string
    type: "virtual" | "in_person"
    cover_image_url: string | null
    is_public: boolean
    status: "upcoming" | "past"
    attendee_count: number
    created_at: string
    updated_at: string
}

type EventFormData = {
    title: string
    description: string
    date: string
    time: string
    location: string
    type: "virtual" | "in_person"
    cover_image_url: string
    is_public: boolean
    status: "upcoming" | "past"
}

const BLANK_FORM: EventFormData = {
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    location: "",
    type: "virtual",
    cover_image_url: "",
    is_public: true,
    status: "upcoming",
}

export default function AdminEventsPage() {
    const [isMounted, setIsMounted] = useState(false)
    const supabase = useMemo(() => createClient(), [])

    const [events, setEvents] = useState<BookClubEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [currentEvent, setCurrentEvent] = useState<BookClubEvent | null>(null)
    const [formData, setFormData] = useState<EventFormData>(BLANK_FORM)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from("book_club_events")
            .select("*")
            .order("date", { ascending: true })

        if (error) {
            toast.error("Failed to load events")
            console.error(error)
        } else {
            setEvents(data ?? [])
        }
        setIsLoading(false)
    }

    const upcomingEvents = events.filter(e => e.status === "upcoming")
    const pastEvents = events.filter(e => e.status === "past")

    const handleOpenCreate = () => {
        setCurrentEvent(null)
        setFormData(BLANK_FORM)
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (event: BookClubEvent) => {
        setCurrentEvent(event)
        setFormData({
            title: event.title,
            description: event.description ?? "",
            date: event.date,
            time: event.time,
            location: event.location,
            type: event.type,
            cover_image_url: event.cover_image_url ?? "",
            is_public: event.is_public,
            status: event.status,
        })
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.date || !formData.time.trim() || !formData.location.trim()) {
            toast.error("Please fill in all required fields (title, date, time, location)")
            return
        }

        setIsSaving(true)

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            date: formData.date,
            time: formData.time.trim(),
            location: formData.location.trim(),
            type: formData.type,
            cover_image_url: formData.cover_image_url.trim() || null,
            is_public: formData.is_public,
            status: formData.status,
        }

        if (currentEvent) {
            const { data, error } = await supabase
                .from("book_club_events")
                .update(payload)
                .eq("id", currentEvent.id)
                .select()
                .single()

            if (error) {
                toast.error("Failed to update event")
                console.error(error)
            } else {
                setEvents(prev =>
                    prev
                        .map(e => e.id === currentEvent.id ? data : e)
                        .sort((a, b) => a.date.localeCompare(b.date))
                )
                toast.success("Event signal updated")
                setIsDialogOpen(false)
            }
        } else {
            const { data, error } = await supabase
                .from("book_club_events")
                .insert(payload)
                .select()
                .single()

            if (error) {
                toast.error("Failed to create event")
                console.error(error)
            } else {
                setEvents(prev =>
                    [...prev, data].sort((a, b) => a.date.localeCompare(b.date))
                )
                toast.success("New event transmission scheduled")
                setIsDialogOpen(false)
            }
        }

        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!currentEvent) return
        setIsDeleting(true)

        const { error } = await supabase
            .from("book_club_events")
            .delete()
            .eq("id", currentEvent.id)

        if (error) {
            toast.error("Failed to delete event")
            console.error(error)
        } else {
            setEvents(prev => prev.filter(e => e.id !== currentEvent.id))
            toast.success("Event purged from the galactic timeline")
            setIsDeleteModalOpen(false)
        }
        setIsDeleting(false)
    }

    const handleImageUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Basic validation
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file")
            return
        }

        setIsUploadingImage(true)
        const loadingToast = toast.loading("Uploading image to the cloud...")

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `event-images/${fileName}`

            const { data, error } = await supabase.storage
                .from('book-covers')
                .upload(filePath, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('book-covers')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, cover_image_url: publicUrl }))
            toast.success("Image transmission complete", { id: loadingToast })
        } catch (error: any) {
            toast.error(`Image upload failed: ${error.message || "Unknown error"}`, { id: loadingToast })
            console.error(error)
        } finally {
            setIsUploadingImage(false)
            // Clear the input value so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    if (!isMounted) return null

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
            ) : events.length > 0 ? (
                <div className="space-y-12">
                    {/* Upcoming */}
                    {upcomingEvents.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-primary/20" />
                                <h2 className="font-display text-xl tracking-widest text-primary uppercase">Upcoming Signals</h2>
                                <div className="h-px flex-1 bg-primary/20" />
                            </div>
                            <div className="grid gap-4">
                                {upcomingEvents.map(event => (
                                    <EventListItem
                                        key={event.id}
                                        event={event}
                                        onEdit={handleOpenEdit}
                                        onDelete={(e) => { setCurrentEvent(e); setIsDeleteModalOpen(true) }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past */}
                    {pastEvents.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-muted/20" />
                                <h2 className="font-display text-xl tracking-widest text-muted-foreground uppercase">Archived Transmissions</h2>
                                <div className="h-px flex-1 bg-muted/20" />
                            </div>
                            <div className="grid gap-4 opacity-70">
                                {pastEvents.map(event => (
                                    <EventListItem
                                        key={event.id}
                                        event={event}
                                        onEdit={handleOpenEdit}
                                        onDelete={(e) => { setCurrentEvent(e); setIsDeleteModalOpen(true) }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="p-16 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                    <Calendar className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="font-display text-3xl tracking-wide uppercase mb-2">Clear Galactic Skies</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">No event signals detected. Time to schedule a new mission.</p>
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
                            <Label htmlFor="ev-title">Event Title</Label>
                            <Input
                                id="ev-title"
                                placeholder="e.g., Live Q&A with Author"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ev-desc">Briefing / Description</Label>
                            <Textarea
                                id="ev-desc"
                                placeholder="Details about the event mission..."
                                className="h-24"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ev-date">Deployment Date</Label>
                                <Input
                                    id="ev-date"
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({
                                        ...formData,
                                        date: e.target.value,
                                        // Auto-set status based on date
                                        status: new Date(e.target.value) >= new Date() ? "upcoming" : "past"
                                    })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ev-time">Commencement Time</Label>
                                <Input
                                    id="ev-time"
                                    placeholder="e.g., 7:00 PM EST"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ev-type">Environment Type</Label>
                                <select
                                    id="ev-type"
                                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as "virtual" | "in_person" })}
                                >
                                    <option value="virtual">Virtual Simulation</option>
                                    <option value="in_person">Physical Gathering</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ev-location">Access Point (Link or Location)</Label>
                                <Input
                                    id="ev-location"
                                    placeholder="e.g., https://zoom.us/..."
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ev-image">Cover Image URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="ev-image"
                                    placeholder="/images/event-header.jpg"
                                    value={formData.cover_image_url}
                                    className="flex-1"
                                    onChange={e => setFormData({ ...formData, cover_image_url: e.target.value })}
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={handleImageUploadClick}
                                    disabled={isUploadingImage}
                                >
                                    {isUploadingImage ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ImageIcon className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border border-border p-4 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Public Transmission</Label>
                                <p className="text-sm text-muted-foreground">
                                    Broadcast this event to all Komet users, including non-members.
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_public}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
                            Abort Mission
                        </Button>
                        <Button className="font-display tracking-widest w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                            Are you certain you want to purge{" "}
                            <span className="text-foreground font-bold italic">"{currentEvent?.title}"</span>?
                            All RSVPs for this event will also be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="w-full sm:w-auto">
                            Keep Archive
                        </Button>
                        <Button variant="destructive" className="font-display tracking-widest w-full sm:w-auto" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            PURGE DATA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EventListItem({
    event,
    onEdit,
    onDelete,
}: {
    event: BookClubEvent
    onEdit: (e: BookClubEvent) => void
    onDelete: (e: BookClubEvent) => void
}) {
    const isPast = event.status === "past"

    return (
        <Card className={`group relative overflow-hidden bg-card/40 backdrop-blur border-border/50 hover:border-primary/30 transition-all ${isPast ? "bg-muted/10 grayscale-[0.5]" : ""}`}>
            <div className="flex flex-col md:flex-row gap-6 p-5">
                {/* Cover Thumbnail */}
                <div className="relative w-full md:w-48 h-32 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    {event.cover_image_url ? (
                        <Image
                            src={event.cover_image_url}
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
                            {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
                            <span>{event.attendee_count} Attending</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground max-w-[200px] truncate">
                            {event.type === "virtual" ? <ExternalLink className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                            <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            {event.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{event.is_public ? "Public" : "Private"}</span>
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
