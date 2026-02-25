"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, MoreHorizontal, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// ─── DB Row Types ────────────────────────────────────────────────────────────

interface DbPost {
    id: string
    topic_id: string
    parent_id: string | null
    author_id: string
    content: string
    likes: number
    created_at: string
    updated_at: string
    // Supabase returns joined users as array[] from raw select, or single from typed client
    users: {
        id: string
        full_name: string | null
        display_name: string | null
    } | { id: string; full_name: string | null; display_name: string | null }[] | null
}

interface DbTopic {
    id: string
    title: string
    description: string | null
    category: string
    post_count: number
    member_count: number
    last_activity_at: string | null
    is_pinned: boolean
    is_featured: boolean
    books?: { title: string; cover_image_url: string | null } | null
}

// ─── Client-Side Nested Post Type ───────────────────────────────────────────

interface PostNode extends DbPost {
    userVote?: "up" | "down"
    replies: PostNode[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nestPosts(flat: DbPost[], userVotes: Record<string, "up" | "down">): PostNode[] {
    const map: Record<string, PostNode> = {}
    const roots: PostNode[] = []

    // First pass — build map
    for (const p of flat) {
        map[p.id] = { ...p, userVote: userVotes[p.id], replies: [] }
    }

    // Second pass — attach children
    for (const p of flat) {
        if (p.parent_id && map[p.parent_id]) {
            map[p.parent_id].replies.push(map[p.id])
        } else {
            roots.push(map[p.id])
        }
    }

    return roots
}

function getAuthorName(post: DbPost): string {
    const u = Array.isArray(post.users) ? post.users[0] : post.users
    return u?.display_name ?? u?.full_name ?? "Komet Explorer"
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

// ─── CommentItem Component ───────────────────────────────────────────────────

interface CommentItemProps {
    post: PostNode
    currentUser: User
    onVote: (postId: string, type: "up" | "down") => Promise<void>
    onReply: (parentId: string, content: string) => Promise<void>
    depth?: number
}

function CommentItem({ post, currentUser, onVote, onReply, depth = 0 }: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [replyContent, setReplyContent] = useState("")
    const [isPendingVote, startVote] = useTransition()
    const [isPendingReply, startReply] = useTransition()

    const handleReplySubmit = () => {
        if (!replyContent.trim()) return
        startReply(async () => {
            await onReply(post.id, replyContent)
            setReplyContent("")
            setIsReplying(false)
        })
    }

    const hasReplies = post.replies.length > 0
    const authorName = getAuthorName(post)

    // Indentation capping
    const canIndent = depth > 0 && depth < 5

    if (isCollapsed) {
        return (
            <div className={cn("group mt-4", canIndent && "ml-4 pl-4 border-l-2 border-border/10")}>
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">+</div>
                    <span>{authorName} transmission minimized • {post.replies.length + 1} signals hidden</span>
                </button>
            </div>
        )
    }

    return (
        <div className={cn(
            "group",
            depth > 0 && "mt-3 md:mt-4",
            canIndent ? "ml-3 md:ml-4 pl-3 md:pl-4 border-l-2 border-border/30" : (depth >= 5 ? "ml-0 pl-3 md:pl-4 border-l-2 border-primary/20" : "")
        )}>
            <div className="flex gap-2 md:gap-3 relative">
                {/* Clickable Collapse Line (Vertical) */}
                {depth > 0 && (
                    <div
                        className="absolute -left-3 md:-left-4 top-0 bottom-0 w-3 md:w-4 cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => setIsCollapsed(true)}
                        title="Collapse thread"
                    />
                )}

                {/* Vote Column */}
                <div className="flex flex-col items-center gap-0.5 md:gap-1 w-6 md:w-8 pt-0.5">
                    <div className="flex flex-col items-center">
                        <ArrowUp
                            className={cn(
                                "w-3.5 h-3.5 md:w-4 md:h-4 cursor-pointer transition-colors",
                                isPendingVote ? "opacity-40" : "",
                                post.userVote === "up" ? "text-orange-500" : "text-muted-foreground hover:text-orange-500"
                            )}
                            onClick={() => !isPendingVote && startVote(() => onVote(post.id, "up"))}
                        />
                        <span
                            className={cn(
                                "text-[10px] md:text-xs font-bold my-0.5 md:my-1",
                                post.userVote === "up" ? "text-orange-500" : post.userVote === "down" ? "text-blue-500" : ""
                            )}
                        >
                            {post.likes}
                        </span>
                        <ArrowDown
                            className={cn(
                                "w-3.5 h-3.5 md:w-4 md:h-4 cursor-pointer transition-colors",
                                isPendingVote ? "opacity-40" : "",
                                post.userVote === "down" ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
                            )}
                            onClick={() => !isPendingVote && startVote(() => onVote(post.id, "down"))}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-1 md:pb-2 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] md:text-xs mb-1">
                        <span className="font-bold text-foreground hover:text-primary cursor-pointer truncate max-w-[120px] md:max-w-none" onClick={() => setIsCollapsed(true)}>{authorName}</span>
                        <span className="text-muted-foreground whitespace-nowrap">• {timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm md:text-base text-foreground/90 mb-2 leading-relaxed break-words">{post.content}</p>

                    <div className="flex items-center gap-4">
                        <button
                            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors uppercase tracking-wider"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <MessageSquare className="w-3 h-3" />
                            Reply
                        </button>
                    </div>

                    {isReplying && (
                        <div className="mt-4 mb-4">
                            <Textarea
                                placeholder="What are your thoughts?"
                                className="min-h-[80px] mb-2 bg-card"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsReplying(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={handleReplySubmit}
                                    disabled={!replyContent.trim() || isPendingReply}
                                >
                                    {isPendingReply && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                                    Reply
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Recursive Replies */}
                    {post.replies.length > 0 && (
                        <div className="space-y-4">
                            {post.replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    post={reply}
                                    currentUser={currentUser}
                                    onVote={onVote}
                                    onReply={onReply}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface Props {
    topic: DbTopic
    initialPosts: DbPost[]
    currentUser: User
    initialUserVotes: Record<string, "up" | "down">
}

export default function DiscussionThreadClient({ topic, initialPosts, currentUser, initialUserVotes }: Props) {
    const supabase = createClient()

    const [posts, setPosts] = useState<PostNode[]>(() => nestPosts(initialPosts, initialUserVotes))
    const [userVotes, setUserVotes] = useState<Record<string, "up" | "down">>(initialUserVotes)
    const [newComment, setNewComment] = useState("")
    const [isPosting, setIsPosting] = useState(false)

    // Author display name
    const myDisplayName =
        (currentUser.user_metadata?.display_name as string | undefined) ??
        (currentUser.user_metadata?.full_name as string | undefined) ??
        "Komet Explorer"

    // ── Post a top-level comment ──────────────────────────────────────────────
    const handlePostComment = async () => {
        if (!newComment.trim()) return
        setIsPosting(true)

        const { data, error } = await supabase
            .from("discussion_posts")
            .insert({
                topic_id: topic.id,
                parent_id: null,
                author_id: currentUser.id,
                content: newComment.trim(),
            })
            .select(`
        id, topic_id, parent_id, author_id, content, likes, created_at, updated_at,
        users ( id, full_name, display_name )
      `)
            .single()

        setIsPosting(false)

        if (error) {
            toast.error("Failed to post. You may need Book Club access.")
            console.error(error)
            return
        }

        // Optimistically prepend to flat list, renest
        const newNode: PostNode = { ...(data as unknown as DbPost), replies: [], userVote: undefined }
        setPosts((prev) => [newNode, ...prev])
        setNewComment("")
        toast.success("Transmission sent!")
    }

    // ── Post a reply ──────────────────────────────────────────────────────────
    const handlePostReply = async (parentId: string, content: string) => {
        const { data, error } = await supabase
            .from("discussion_posts")
            .insert({
                topic_id: topic.id,
                parent_id: parentId,
                author_id: currentUser.id,
                content: content.trim(),
            })
            .select(`
        id, topic_id, parent_id, author_id, content, likes, created_at, updated_at,
        users ( id, full_name, display_name )
      `)
            .single()

        if (error) {
            toast.error("Failed to post reply. You may need Book Club access.")
            console.error(error)
            return
        }

        const newReply: PostNode = { ...(data as unknown as DbPost), replies: [], userVote: undefined }

        const insertReply = (nodes: PostNode[]): PostNode[] =>
            nodes.map((n) => {
                if (n.id === parentId) return { ...n, replies: [...n.replies, newReply] }
                return { ...n, replies: insertReply(n.replies) }
            })

        setPosts((prev) => insertReply(prev))
        toast.success("Reply sent!")
    }

    // ── Vote on a post ────────────────────────────────────────────────────────
    const handleVote = async (postId: string, type: "up" | "down") => {
        const currentVote = userVotes[postId]

        // Toggle off if same vote
        if (currentVote === type) {
            const { error } = await supabase
                .from("discussion_votes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", currentUser.id)

            if (error) { toast.error("Vote failed"); return }

            setUserVotes((prev) => { const next = { ...prev }; delete next[postId]; return next })
            updatePostLikes(postId, type === "up" ? -1 : 1, undefined)
        } else {
            // Upsert vote
            const { error } = await supabase
                .from("discussion_votes")
                .upsert({ post_id: postId, user_id: currentUser.id, vote_type: type }, { onConflict: "post_id,user_id" })

            if (error) { toast.error("Vote failed"); return }

            const diff = currentVote ? (type === "up" ? 2 : -2) : (type === "up" ? 1 : -1)
            setUserVotes((prev) => ({ ...prev, [postId]: type }))
            updatePostLikes(postId, diff, type)
        }
    }

    const updatePostLikes = (postId: string, delta: number, newVote: "up" | "down" | undefined) => {
        const update = (nodes: PostNode[]): PostNode[] =>
            nodes.map((n) => {
                if (n.id === postId) return { ...n, likes: n.likes + delta, userVote: newVote }
                return { ...n, replies: update(n.replies) }
            })
        setPosts((prev) => update(prev))
    }

    const totalPosts = countAllPosts(posts)

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SiteHeader />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/book-club/discussions" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-all group">
                    <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Discussions
                </Link>

                {/* Main Topic Card */}
                <div className="flex gap-4 mb-4 md:mb-8">
                    <div className="flex-1">
                        <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
                            <div className="p-4 md:p-8">
                                {/* Topic Header */}
                                <div className="flex items-center text-xs text-muted-foreground mb-4 gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/20 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-primary border border-primary/30">
                                            K
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">Kane's Komet</span>
                                            <span className="text-[10px] md:text-xs">
                                                {topic.last_activity_at ? timeAgo(topic.last_activity_at) : "New room"}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="ml-auto text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-1.5 md:px-2 py-0.5 rounded border border-secondary/20">
                                        {topic.category}
                                    </span>
                                </div>

                                {/* Title & Body */}
                                <h1 className="text-xl md:text-3xl font-bold mb-4 leading-tight tracking-tight">{topic.title}</h1>
                                {topic.description && (
                                    <div className="prose prose-invert max-w-none text-muted-foreground mb-6 md:mb-8 text-base md:text-lg leading-relaxed">
                                        <p>{topic.description}</p>
                                    </div>
                                )}

                                {/* Action Bar */}
                                <div className="flex items-center gap-3 md:gap-4 text-muted-foreground text-xs md:text-sm border-t border-border pt-4">
                                    <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-muted/30 rounded-full">
                                        <MessageSquare className="w-3 md:w-4 h-3 md:h-4" />
                                        <span className="font-medium">{totalPosts} Comments</span>
                                    </div>
                                    <div className="text-[10px] md:text-xs">
                                        {topic.member_count} Explorers
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Comment Input */}
                        <div className="mt-6 md:mt-8 mb-8 md:mb-10">
                            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3">
                                <span>Comment as</span>
                                <span className="text-primary font-bold">{myDisplayName}</span>
                            </div>
                            <Card className="p-3 md:p-4 bg-card/30 border-dashed border-2">
                                <Textarea
                                    placeholder="What are your thoughts?"
                                    className="min-h-[100px] md:min-h-[120px] mb-3 bg-transparent border-none focus-visible:ring-0 p-0 text-base md:text-lg"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <div className="flex justify-end pt-2 border-t border-border/50">
                                    <Button
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim() || isPosting}
                                        className="px-6 md:px-8 font-bold tracking-widest text-[10px] md:text-xs h-8 md:h-9"
                                    >
                                        {isPosting ? <Loader2 className="w-3 md:w-4 h-3 md:h-4 animate-spin mr-2" /> : null}
                                        PUBLISH SIGNAL
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-2 mb-6 md:mb-8 border-b border-border pb-4">
                                <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    {totalPosts} Transmission{totalPosts !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {posts.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-display tracking-wide">Be the first to transmit</p>
                                    <p className="text-sm mt-1">Share your thoughts above to start the conversation.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 pb-20">
                                    {posts.map((post) => (
                                        <CommentItem
                                            key={post.id}
                                            post={post}
                                            currentUser={currentUser}
                                            onVote={handleVote}
                                            onReply={handlePostReply}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function countAllPosts(nodes: PostNode[]): number {
    return nodes.reduce((acc, n) => acc + 1 + countAllPosts(n.replies), 0)
}
