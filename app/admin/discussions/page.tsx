"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    MessageSquare,
    Search,
    Plus,
    Edit2,
    Trash2,
    Pin,
    Star,
    Users,
    ArrowRight,
    Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface DiscussionTopic {
    id: string
    title: string
    description: string | null
    category: string
    book_id: string | null
    is_pinned: boolean
    is_featured: boolean
    post_count: number
    member_count: number
    last_activity_at: string | null
    created_at: string
    deleted_at: string | null
}

interface BookOption {
    id: string
    title: string
}

const CATEGORY_OPTIONS = [
    "General", "Book Club", "News", "Crime", "Children",
    "PTP", "Spiritual", "Adult", "Sports", "Self-Help", "Cooking"
]

export default function AdminDiscussionsPage() {
    const supabase = createClient()
    const [topics, setTopics] = useState<DiscussionTopic[]>([])
    const [books, setBooks] = useState<BookOption[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [currentTopic, setCurrentTopic] = useState<DiscussionTopic | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "General",
        book_id: "",
        is_pinned: false,
        is_featured: false,
    })

    useEffect(() => {
        fetchTopics()
        fetchBooks()
    }, [])

    const fetchTopics = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from("discussion_topics")
            .select("*")
            .is("deleted_at", null)
            .order("is_pinned", { ascending: false })
            .order("last_activity_at", { ascending: false })

        if (error) {
            toast.error("Failed to load discussion topics")
            console.error(error)
        } else {
            setTopics(data ?? [])
        }
        setIsLoading(false)
    }

    const fetchBooks = async () => {
        const { data } = await supabase
            .from("books")
            .select("id, title")
            .order("title")
        setBooks(data ?? [])
    }

    const filteredTopics = topics.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleOpenCreate = () => {
        setCurrentTopic(null)
        setFormData({ title: "", description: "", category: "General", book_id: "", is_pinned: false, is_featured: false })
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (topic: DiscussionTopic) => {
        setCurrentTopic(topic)
        setFormData({
            title: topic.title,
            description: topic.description ?? "",
            category: topic.category,
            book_id: topic.book_id ?? "",
            is_pinned: topic.is_pinned,
            is_featured: topic.is_featured,
        })
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.error("Please enter a title for the discussion")
            return
        }

        setIsSaving(true)

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            book_id: formData.book_id || null,
            is_pinned: formData.is_pinned,
            is_featured: formData.is_featured,
        }

        if (currentTopic) {
            const { data, error } = await supabase
                .from("discussion_topics")
                .update(payload)
                .eq("id", currentTopic.id)
                .select()
                .single()

            if (error) {
                toast.error("Failed to update topic")
                console.error(error)
            } else {
                setTopics(prev => prev.map(t => t.id === currentTopic.id ? data : t))
                toast.success("Discussion topic updated")
                setIsDialogOpen(false)
            }
        } else {
            const { data, error } = await supabase
                .from("discussion_topics")
                .insert(payload)
                .select()
                .single()

            if (error) {
                toast.error("Failed to create topic")
                console.error(error)
            } else {
                setTopics(prev => [data, ...prev])
                toast.success("New discussion room created")
                setIsDialogOpen(false)
            }
        }

        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!currentTopic) return
        setIsDeleting(true)

        // Soft-delete by setting deleted_at
        const { error } = await supabase
            .from("discussion_topics")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", currentTopic.id)

        if (error) {
            toast.error("Failed to delete topic")
            console.error(error)
        } else {
            setTopics(prev => prev.filter(t => t.id !== currentTopic.id))
            toast.success("Discussion topic removed")
            setIsDeleteModalOpen(false)
        }
        setIsDeleting(false)
    }

    const togglePin = async (topic: DiscussionTopic) => {
        const { error } = await supabase
            .from("discussion_topics")
            .update({ is_pinned: !topic.is_pinned })
            .eq("id", topic.id)

        if (error) { toast.error("Failed to update pin status"); return }
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, is_pinned: !t.is_pinned } : t))
        toast.success(topic.is_pinned ? "Topic unpinned" : "Topic pinned to the top")
    }

    const toggleFeatured = async (topic: DiscussionTopic) => {
        const { error } = await supabase
            .from("discussion_topics")
            .update({ is_featured: !topic.is_featured })
            .eq("id", topic.id)

        if (error) { toast.error("Failed to update featured status"); return }
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, is_featured: !t.is_featured } : t))
        toast.success(topic.is_featured ? "Removed from featured" : "Topic now featured")
    }

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
                        <span className="text-primary">DISCUSSION</span> <span className="text-secondary">MANAGEMENT</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground">Orchestrate community dialogue and flagship topics</p>
                </div>
                <Button size="lg" className="font-display tracking-wider text-lg w-full md:w-auto" onClick={handleOpenCreate}>
                    <Plus className="w-5 h-5 mr-2" />
                    NEW TOPIC
                </Button>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search topics by title or content..."
                        className="pl-10 bg-card/50 border-border/50 h-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Topics List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="p-6 bg-card/30 border-border/30 animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-muted rounded-full" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 bg-muted rounded w-1/3" />
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : filteredTopics.length > 0 ? (
                <div className="grid gap-4">
                    {filteredTopics.map((topic) => (
                        <Card key={topic.id} className="p-5 md:p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all group overflow-hidden relative">
                            {topic.is_pinned && (
                                <div className="absolute top-0 right-0 p-1 bg-primary/20 rounded-bl-lg">
                                    <Pin className="w-3 h-3 text-primary fill-primary" />
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                                            {topic.category}
                                        </span>
                                        {topic.book_id && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/50">
                                                Linked Volume
                                            </span>
                                        )}
                                        {topic.is_featured && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                                                <Star className="w-2.5 h-2.5 fill-yellow-500" /> Featured
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-display text-2xl md:text-3xl tracking-wide mb-2 group-hover:text-primary transition-colors truncate">
                                        {topic.title}
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground line-clamp-2 mb-4 italic">
                                        {topic.description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>{topic.post_count} Transmissions</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{topic.member_count} Explorers</span>
                                        </div>
                                        <div className="hidden sm:block">
                                            Last Pulse:{" "}
                                            {topic.last_activity_at
                                                ? new Date(topic.last_activity_at).toLocaleDateString()
                                                : "No activity"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col justify-between md:justify-center items-center gap-3 border-t md:border-t-0 md:border-l border-border/30 pt-4 md:pt-0 md:pl-6">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-9 w-9 border border-border/50 ${topic.is_pinned ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                                            onClick={() => togglePin(topic)}
                                            title={topic.is_pinned ? "Unpin Topic" : "Pin Topic"}
                                        >
                                            <Pin className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-9 w-9 border border-border/50 ${topic.is_featured ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground"}`}
                                            onClick={() => toggleFeatured(topic)}
                                            title={topic.is_featured ? "Unfeature" : "Feature Topic"}
                                        >
                                            <Star className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50"
                                            onClick={() => handleOpenEdit(topic)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50"
                                            onClick={() => { setCurrentTopic(topic); setIsDeleteModalOpen(true) }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-12 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="font-display text-3xl tracking-wide uppercase mb-2">Silent Transmission</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">No discussion topics found. {searchQuery ? "Try a different search." : "Create the first room!"}</p>
                    {searchQuery && <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>}
                </Card>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl tracking-wider text-primary uppercase">
                            {currentTopic ? "Modify Discussion Forge" : "Initialize New Room"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the metadata and visibility settings for this community hub.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Topic Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Brute Syndicate: Crime & Justice"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Mission Description</Label>
                            <Textarea
                                id="description"
                                placeholder="What exactly are we exploring in this room?"
                                className="h-24"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <select
                                    id="category"
                                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORY_OPTIONS.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="book">Linked Volume (Optional)</Label>
                                <select
                                    id="book"
                                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.book_id}
                                    onChange={e => setFormData({ ...formData, book_id: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {books.map(book => (
                                        <option key={book.id} value={book.id}>{book.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label className="text-xs uppercase tracking-widest">Pin to Top</Label>
                                    <p className="text-[10px] text-muted-foreground">Force-dock at the summit</p>
                                </div>
                                <Switch
                                    checked={formData.is_pinned}
                                    onCheckedChange={checked => setFormData({ ...formData, is_pinned: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label className="text-xs uppercase tracking-widest text-yellow-500">Feature Topic</Label>
                                    <p className="text-[10px] text-muted-foreground">Highlight with golden aura</p>
                                </div>
                                <Switch
                                    checked={formData.is_featured}
                                    onCheckedChange={checked => setFormData({ ...formData, is_featured: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                            Abort Mission
                        </Button>
                        <Button className="font-display tracking-widest" onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {currentTopic ? "UPDATE FORGE" : "INITIALIZE ROOM"} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-destructive/20">
                    <DialogHeader>
                        <DialogTitle className="font-display text-3xl tracking-wider text-destructive uppercase">Purge Archive?</DialogTitle>
                        <DialogDescription className="text-lg">
                            Are you certain you want to erase <span className="text-foreground font-bold italic">"{currentTopic?.title}"</span>? All posts in this room will also be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                            Keep Active
                        </Button>
                        <Button variant="destructive" className="font-display tracking-widest" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            PURGE DATA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
