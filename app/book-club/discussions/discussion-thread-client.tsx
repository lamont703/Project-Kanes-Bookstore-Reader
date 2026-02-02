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
    },
    {
        id: 3,
        author: { name: "VoidDrifter" },
        time: "45m ago",
        content: "I totally missed the foreshadowing in chapter 3 until my second read. The author is a genius.",
        likes: 12,
        replies: [
            {
                id: 31,
                author: { name: "StarGazer99" },
                time: "15m ago",
                content: "Chapter 3 is key! The dialogue between the pilot and the droid reveals everything.",
                likes: 8,
            }
        ]
    }
]

export default function DiscussionThreadClient({ discussion }: { discussion: any }) {
    const [comments, setComments] = useState<CommentType[]>(initialComments)
    const [newComment, setNewComment] = useState("")
    const [replyingTo, setReplyingTo] = useState<number | null>(null)
    const [replyContent, setReplyContent] = useState("")

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

    const handlePostReply = (parentId: number) => {
        if (!replyContent.trim()) return

        const reply: CommentType = {
            id: Date.now(),
            author: { name: "KometExplorer" },
            time: "Just now",
            content: replyContent,
            likes: 1,
            userVote: 'up', // Auto-upvote own reply
        }

        setComments(comments.map(c => {
            if (c.id === parentId) {
                return {
                    ...c,
                    replies: [...(c.replies || []), reply]
                }
            }
            return c
        }))
        setReplyingTo(null)
        setReplyContent("")
    }

    const handleDiscussionVote = (type: 'up' | 'down') => {
        if (discussionUserVote === type) {
            // Toggle off
            setDiscussionUserVote(undefined)
            setDiscussionLikes((prev: number) => type === 'up' ? prev - 1 : prev + 1)
        } else {
            // Switch vote or separate new vote
            const diff = discussionUserVote ? 2 : 1 // if switching (e.g. down -> up), add 2. If new, add 1.

            if (type === 'up') {
                setDiscussionLikes((prev: number) => prev + diff)
            } else {
                setDiscussionLikes((prev: number) => prev - diff)
            }
            setDiscussionUserVote(type)
        }
    }

    const handleCommentVote = (commentId: number, type: 'up' | 'down', isReplyToId?: number) => {
        // Helper to update a single comment object
        const updateCommentVote = (c: CommentType) => {
            if (c.id !== commentId) return c;

            let newLikes = c.likes;
            let newVote = c.userVote;

            if (c.userVote === type) {
                // Toggle off
                newVote = undefined;
                newLikes = type === 'up' ? c.likes - 1 : c.likes + 1;
            } else {
                // Switch or new
                const diff = c.userVote ? 2 : 1;
                if (type === 'up') {
                    newLikes = c.likes + diff;
                } else {
                    newLikes = c.likes - diff;
                }
                newVote = type;
            }
            return { ...c, likes: newLikes, userVote: newVote };
        };

        setComments(comments.map(c => {
            if (isReplyToId) {
                // It's a nested reply we are looking for inside this comment
                if (c.id === isReplyToId && c.replies) {
                    return {
                        ...c,
                        replies: c.replies.map(r => updateCommentVote(r))
                    }
                }
                return c;
            } else {
                // Top level comment
                return updateCommentVote(c);
            }
        }));
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SiteHeader />

            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/book-club/discussions" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <span className="mr-2">←</span> Back to Discussions
                </Link>

                {/* Main Discussion Post (Reddit Style) */}
                <div className="flex gap-4 mb-2">
                    {/* Vote Column */}
                    <div className="flex flex-col items-center gap-1 w-10 pt-2 hidden sm:flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 hover:bg-transparent ${discussionUserVote === 'up' ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}
                            onClick={() => handleDiscussionVote('up')}
                        >
                            <ArrowUp className="w-6 h-6" />
                        </Button>
                        <span className={`text-sm font-bold ${discussionUserVote === 'up' ? 'text-orange-500' : discussionUserVote === 'down' ? 'text-blue-500' : ''}`}>
                            {discussionLikes}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 hover:bg-transparent ${discussionUserVote === 'down' ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
                            onClick={() => handleDiscussionVote('down')}
                        >
                            <ArrowDown className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1">
                        <Card className="bg-card border-border overflow-hidden">
                            <div className="p-4 sm:p-6">
                                {/* Post Header */}
                                <div className="flex items-center text-xs text-muted-foreground mb-4 gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                                            {discussion.author.name.charAt(0)}
                                        </div>
                                        <span className="font-semibold text-foreground hover:underline cursor-pointer">r/{discussion.category.replace(" ", "")}</span>
                                        <span>•</span>
                                        <span>Posted by u/{discussion.author.name}</span>
                                        <span>•</span>
                                        <span>{discussion.lastReply.time}</span>
                                    </div>
                                </div>

                                {/* Title & Body */}
                                <h1 className="text-xl md:text-2xl font-bold mb-4 leading-snug">{discussion.title}</h1>
                                <div className="prose prose-invert max-w-none text-muted-foreground mb-6">
                                    <p>I just finished 'Cosmic Drift' and that ending completely blew my mind! The twist was unexpected but made so much sense in hindsight. What did you all think?</p>
                                    <p className="mt-4">Currently re-reading Chapter 12 to see if I missed any clues. The character development of Zara was also top-tier.</p>
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center gap-2 text-muted-foreground text-sm border-t border-border pt-3">
                                    <Button variant="ghost" size="sm" className="gap-2 px-2">
                                        <MessageSquare className="w-4 h-4" />
                                        {discussion.stats.replies} Comments
                                    </Button>
                                    <Button variant="ghost" size="sm" className="gap-2 px-2 ml-auto">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Comment Section Header */}
                        <div className="mt-8 mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-bold">Sort by:</span>
                                <select className="bg-transparent text-primary font-medium focus:outline-none cursor-pointer">
                                    <option>Best</option>
                                    <option>New</option>
                                    <option>Top</option>
                                </select>
                            </div>
                        </div>

                        {/* Reply Input */}
                        <Card className="p-4 mb-8 bg-card border-border">
                            <p className="text-sm mb-2">Comment as <span className="text-primary font-bold">KometExplorer</span></p>
                            <Textarea
                                placeholder="What are your thoughts?"
                                className="min-h-[100px] mb-2"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim()}>Comment</Button>
                            </div>
                        </Card>

                        {/* Comments List */}
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="group">
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center gap-1 w-8 pt-1">
                                            <div className="flex flex-col items-center group/vote">
                                                <ArrowUp
                                                    className={`w-4 h-4 cursor-pointer ${comment.userVote === 'up' ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}
                                                    onClick={() => handleCommentVote(comment.id, 'up')}
                                                />
                                                <span className={`text-xs font-bold my-1 ${comment.userVote === 'up' ? 'text-orange-500' : comment.userVote === 'down' ? 'text-blue-500' : ''}`}>
                                                    {comment.likes}
                                                </span>
                                                <ArrowDown
                                                    className={`w-4 h-4 cursor-pointer ${comment.userVote === 'down' ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
                                                    onClick={() => handleCommentVote(comment.id, 'down')}
                                                />
                                            </div>
                                            <div className="w-[2px] h-full bg-border/50 mt-2 group-hover:bg-border transition-colors rounded-full" />
                                        </div>

                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center gap-2 text-xs mb-2">
                                                <span className="font-bold text-foreground hover:underline cursor-pointer">{comment.author.name}</span>
                                                <span className="text-muted-foreground">• {comment.time}</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 mb-2">{comment.content}</p>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:bg-muted px-1.5 py-1 rounded transition-colors"
                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    Reply
                                                </button>
                                            </div>

                                            {/* Reply Input for Comment */}
                                            {replyingTo === comment.id && (
                                                <div className="mt-4 mb-4">
                                                    <Textarea
                                                        placeholder="What are your thoughts?"
                                                        className="min-h-[80px] mb-2"
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                        <Button size="sm" onClick={() => handlePostReply(comment.id)} disabled={!replyContent.trim()}>Reply</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nested Replies */}
                                            {comment.replies && comment.replies.length > 0 && (
                                                <div className="mt-4 space-y-4">
                                                    {comment.replies.map((reply) => (
                                                        <div key={reply.id} className="relative pl-4">
                                                            {/* Indentation line for reply */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border/30 rounded-full"></div>

                                                            <div className="flex gap-3">
                                                                <div className="flex flex-col items-center gap-1 w-6 pt-1">
                                                                    <div className="flex flex-col items-center group/vote-reply">
                                                                        <ArrowUp
                                                                            className={`w-3 h-3 cursor-pointer ${reply.userVote === 'up' ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}
                                                                            onClick={() => handleCommentVote(reply.id, 'up', comment.id)}
                                                                        />
                                                                        <span className={`text-[10px] font-bold my-0.5 ${reply.userVote === 'up' ? 'text-orange-500' : reply.userVote === 'down' ? 'text-blue-500' : ''}`}>
                                                                            {reply.likes}
                                                                        </span>
                                                                        <ArrowDown
                                                                            className={`w-3 h-3 cursor-pointer ${reply.userVote === 'down' ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
                                                                            onClick={() => handleCommentVote(reply.id, 'down', comment.id)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 text-xs mb-1">
                                                                        <span className="font-bold text-foreground hover:underline cursor-pointer">
                                                                            {reply.author.name}
                                                                        </span>
                                                                        <span className="text-muted-foreground">• {reply.time}</span>
                                                                    </div>
                                                                    <p className="text-sm text-foreground/90 mb-2">{reply.content}</p>
                                                                    <div className="flex items-center gap-4">
                                                                        <button className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors">
                                                                            <MessageSquare className="w-2.5 h-2.5" />
                                                                            Reply
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
