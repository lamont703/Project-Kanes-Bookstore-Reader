import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { mockDiscussions } from "@/lib/mock-book-club-data"
import { ThumbsUp, MessageSquare, CornerDownRight } from "lucide-react"
import Link from "next/link"

// Mock comments for a discussion
const mockComments = [
  {
    id: 1,
    author: { name: "GalaxyExplorer" },
    time: "2h ago",
    content: "I completely agree! The plot twist with the AI was something I did not see coming. It completely recontextualized the main character's journey for me.",
    likes: 15,
  },
  {
    id: 2,
    author: { name: "StarHopper" },
    time: "1h ago",
    content: "Does anyone have theories about the sequel? That cliffhanger was intense.",
    likes: 8,
  },
]

export default function DiscussionThreadPage({ params }: { params: { id: string } }) {
  const discussion = mockDiscussions.find((d) => d.id === params.id)

  if (!discussion) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold">Discussion not found</h1>
        <Link href="/book-club/discussions">
          <Button variant="link">Back to discussions</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/book-club/discussions">
          <Button variant="outline" className="mb-4">
            &larr; Back to Discussions
          </Button>
        </Link>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">{discussion.title}</h1>
        <p className="text-md text-muted-foreground">
          Started by <span className="text-primary font-medium">{discussion.author.name}</span> in{" "}
          <span className="text-secondary font-medium">{discussion.category}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Original Post */}
        <Card className="p-6 bg-card/50 backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
              {discussion.author.name.charAt(0)}
            </div>
            <div className="w-full">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">{discussion.author.name}</p>
                <p className="text-xs text-muted-foreground">Original Post</p>
              </div>
              <p className="mt-2 text-lg">I just finished 'Cosmic Drift' and that ending completely blew my mind! The twist was unexpected but made so much sense in hindsight. What did you all think?</p>
              <div className="flex items-center gap-4 mt-4 text-muted-foreground">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> {discussion.stats.likes} Likes
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Reply
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Comments */}
        {mockComments.map((comment) => (
          <Card key={comment.id} className="p-6 ml-0 sm:ml-10 bg-card/40 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-secondary">
                {comment.author.name.charAt(0)}
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-secondary">{comment.author.name}</p>
                  <p className="text-xs text-muted-foreground">{comment.time}</p>
                </div>
                <p className="mt-2">{comment.content}</p>
                <div className="flex items-center gap-4 mt-4 text-muted-foreground">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" /> {comment.likes} Likes
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Reply
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Reply Box */}
        <Card className="p-6 bg-card/50 backdrop-blur mt-8">
          <h3 className="font-display text-2xl tracking-wide mb-4">LEAVE A REPLY</h3>
          <Textarea placeholder="Share your thoughts..." className="mb-4" rows={4} />
          <Button size="lg">
            <CornerDownRight className="w-4 h-4 mr-2" />
            Post Reply
          </Button>
        </Card>
      </div>
    </div>
  )
}
