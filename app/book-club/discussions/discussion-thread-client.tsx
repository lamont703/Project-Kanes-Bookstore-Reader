"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { useState } from "react"

interface CommentType {
    id: number
    author: { name: string }
    time: string
    content: string
    likes: number
    userVote?: 'up' | 'down' // Track user vote
    replies?: CommentType[]
}

const initialComments: CommentType[] = [
    {
        id: 1,
        author: { name: "GalaxyExplorer" },
        time: "2h ago",
        content: "I completely agree! The plot twist with the AI was something I did not see coming. It completely recontextualized the main character's journey for me. Honestly, it might be my favorite sci-fi twist of the year.",
        likes: 156,
        replies: [
            {
                id: 11,
                author: { name: "NebulaNomad" },
                time: "1h ago",
                content: "Right? checking previous chapters, the hints were there all along!",
                likes: 45,
                replies: [
                    {
                        id: 111,
                        author: { name: "DeepThinker" },
                        time: "45m ago",
                        content: "Exactly! Like the way the droid kept looking at the pilot... that wasn't random curiosity, that was data synchronization.",
                        likes: 24,
                    }
                ]
            },
            {
                id: 12,
                author: { name: "CosmicDust" },
                time: "30m ago",
                content: "I felt like it was a bit rushed, but I respect the boldness of it.",
                likes: 12,
            }
        ]
    },
    {
        id: 2,
        author: { name: "StarHopper" },
        time: "1h ago",
        content: "Does anyone have theories about the sequel? That cliffhanger was intense. I feel like the Commander isn't actually dead...",
        likes: 42,
        replies: []
    }
]

interface CommentItemProps {
    comment: CommentType
    onVote: (id: number, type: 'up' | 'down') => void
    onReply: (parentId: number, content: string) => void
    isNested?: boolean
}

function CommentItem({ comment, onVote, onReply, isNested = false }: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState("")

    const handleReplySubmit = () => {
        if (!replyContent.trim()) return
        onReply(comment.id, replyContent)
        setReplyContent("")
        setIsReplying(false)
    }

    return (
        <div className={cn("group", isNested && "mt-4 ml-4 pl-4 border-l-2 border-border/30")}>
            <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1 w-8 pt-1">
                    <div className="flex flex-col items-center group/vote">
                        <ArrowUp
                            className={cn(
                                "w-4 h-4 cursor-pointer transition-colors",
                                comment.userVote === 'up' ? "text-orange-500" : "text-muted-foreground hover:text-orange-500"
                            )}
                            onClick={() => onVote(comment.id, 'up')}
                        />
                        <span className={cn(
                            "text-xs font-bold my-1",
                            comment.userVote === 'up' ? "text-orange-500" : comment.userVote === 'down' ? "text-blue-500" : ""
                        )}>
                            {comment.likes}
                        </span>
                        <ArrowDown
                            className={cn(
                                "w-4 h-4 cursor-pointer transition-colors",
                                comment.userVote === 'down' ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
                            )}
                            onClick={() => onVote(comment.id, 'down')}
                        />
                    </div>
                </div>

                <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-bold text-foreground hover:underline cursor-pointer">{comment.author.name}</span>
                        <span className="text-muted-foreground">• {comment.time}</span>
                    </div>
                    <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{comment.content}</p>

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
                        <div className="mt-4 mb-4 animate-fade-in">
                            <Textarea
                                placeholder="What are your thoughts?"
                                className="min-h-[80px] mb-2 bg-card"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsReplying(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 text-xs" onClick={handleReplySubmit} disabled={!replyContent.trim()}>Reply</Button>
                            </div>
                        </div>
                    )}

                    {/* Recursive Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="space-y-4">
                            {comment.replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    onVote={onVote}
                                    onReply={onReply}
                                    isNested={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function DiscussionThreadClient({ discussion }: { discussion: any }) {
    const [comments, setComments] = useState<CommentType[]>(initialComments)
    const [newComment, setNewComment] = useState("")

    // Main discussion vote state
    const [discussionLikes, setDiscussionLikes] = useState(discussion.stats.likes)
    const [discussionUserVote, setDiscussionUserVote] = useState<'up' | 'down' | undefined>(undefined)

    const handlePostComment = () => {
        if (!newComment.trim()) return

        const comment: CommentType = {
            id: Date.now(),
            author: { name: "KometExplorer" },
            time: "Just now",
            content: newComment,
            likes: 1,
            userVote: 'up', // Auto-upvote own comment
            replies: []
        }

        setComments([comment, ...comments])
        setNewComment("")
    }

    const handlePostReply = (parentId: number, content: string) => {
        const reply: CommentType = {
            id: Date.now(),
            author: { name: "KometExplorer" },
            time: "Just now",
            content: content,
            likes: 1,
            userVote: 'up',
            replies: []
        }

        const addReplyRecursive = (items: CommentType[]): CommentType[] => {
            return items.map(item => {
                if (item.id === parentId) {
                    return { ...item, replies: [reply, ...(item.replies || [])] }
                }
                if (item.replies) {
                    return { ...item, replies: addReplyRecursive(item.replies) }
                }
                return item
            })
        }

        setComments(addReplyRecursive(comments))
        toast.success("Transmission sent!")
    }

    const handleDiscussionVote = (type: 'up' | 'down') => {
        if (discussionUserVote === type) {
            setDiscussionUserVote(undefined)
            setDiscussionLikes((prev: number) => type === 'up' ? prev - 1 : prev + 1)
        } else {
            const diff = discussionUserVote ? 2 : 1
            if (type === 'up') {
                setDiscussionLikes((prev: number) => prev + diff)
            } else {
                setDiscussionLikes((prev: number) => prev - diff)
            }
            setDiscussionUserVote(type)
        }
    }

    const handleCommentVote = (commentId: number, type: 'up' | 'down') => {
        const updateVoteRecursive = (items: CommentType[]): CommentType[] => {
            return items.map(c => {
                if (c.id === commentId) {
                    let newLikes = c.likes;
                    let newVote = c.userVote;

                    if (c.userVote === type) {
                        newVote = undefined;
                        newLikes = type === 'up' ? c.likes - 1 : c.likes + 1;
                    } else {
                        const diff = c.userVote ? 2 : 1;
                        newLikes = type === 'up' ? c.likes + diff : c.likes - diff;
                        newVote = type;
                    }
                    return { ...c, likes: newLikes, userVote: newVote };
                }
                if (c.replies) {
                    return { ...c, replies: updateVoteRecursive(c.replies) }
                }
                return c;
            })
        }
        setComments(updateVoteRecursive(comments))
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SiteHeader />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/book-club/discussions" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-all group">
                    <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Discussions
                </Link>

                {/* Main Discussion Post (Reddit Style) */}
                <div className="flex gap-4 mb-2">
                    {/* Vote Column */}
                    <div className="flex flex-col items-center gap-1 w-12 pt-2 hidden sm:flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 hover:bg-transparent transition-colors",
                                discussionUserVote === 'up' ? "text-orange-500" : "text-muted-foreground hover:text-orange-500"
                            )}
                            onClick={() => handleDiscussionVote('up')}
                        >
                            <ArrowUp className="w-7 h-7" />
                        </Button>
                        <span className={cn(
                            "text-lg font-bold",
                            discussionUserVote === 'up' ? "text-orange-500" : discussionUserVote === 'down' ? "text-blue-500" : ""
                        )}>
                            {discussionLikes}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 hover:bg-transparent transition-colors",
                                discussionUserVote === 'down' ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
                            )}
                            onClick={() => handleDiscussionVote('down')}
                        >
                            <ArrowDown className="w-7 h-7" />
                        </Button>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1">
                        <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
                            <div className="p-4 sm:p-8">
                                {/* Post Header */}
                                <div className="flex items-center text-xs text-muted-foreground mb-4 gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary border border-primary/30">
                                            {discussion.author.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">u/{discussion.author.name}</span>
                                            <span>{discussion.lastReply.time}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Body */}
                                <h1 className="text-2xl md:text-3xl font-bold mb-6 leading-tight tracking-tight">{discussion.title}</h1>
                                <div className="prose prose-invert max-w-none text-muted-foreground mb-8 text-lg leading-relaxed">
                                    <p>I just finished 'Cosmic Drift' and that ending completely blew my mind! The twist was unexpected but made so much sense in hindsight. What did you all think?</p>
                                    <p className="mt-4">Currently re-reading Chapter 12 to see if I missed any clues. The character development of Zara was also top-tier.</p>
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center gap-4 text-muted-foreground text-sm border-t border-border pt-4">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-full">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="font-medium">{discussion.stats.replies} Comments</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 ml-auto rounded-full">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Comment Input */}
                        <div className="mt-8 mb-10">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                <span>Comment as</span>
                                <span className="text-primary font-bold">KometExplorer</span>
                            </div>
                            <Card className="p-4 bg-card/30 border-dashed border-2">
                                <Textarea
                                    placeholder="What are your thoughts?"
                                    className="min-h-[120px] mb-3 bg-transparent border-none focus-visible:ring-0 p-0 text-lg"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <div className="flex justify-end pt-2 border-t border-border/50">
                                    <Button onClick={handlePostComment} disabled={!newComment.trim()} className="px-8 font-bold tracking-widest text-xs h-9">
                                        PUBLISH SIGNAL
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
                                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pulse Order:</span>
                                <select className="bg-transparent text-primary font-bold text-sm tracking-wider uppercase focus:outline-none cursor-pointer">
                                    <option>Priority (Best)</option>
                                    <option>Fresh (New)</option>
                                    <option>Intensity (Top)</option>
                                </select>
                            </div>

                            <div className="space-y-8 pb-20">
                                {comments.map((comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        onVote={handleCommentVote}
                                        onReply={handlePostReply}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { cn } from "@/lib/utils"
import { toast } from "sonner"

