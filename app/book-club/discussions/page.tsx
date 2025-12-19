import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockDiscussions } from "@/lib/mock-book-club-data"
import { MessageSquare, Eye, ThumbsUp, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function DiscussionListPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
          <span className="text-primary">COMMUNITY</span> <span className="text-secondary">DISCUSSIONS</span>
        </h1>
        <p className="text-lg text-muted-foreground">Join the conversation with fellow cosmic readers</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/4">
          <Card className="p-4 bg-card/50 backdrop-blur border-border">
            <h2 className="font-display text-2xl tracking-wide mb-4">CATEGORIES</h2>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-primary">
                All Discussions
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Current Selection
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Past Selections
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Sci-Fi
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Fantasy
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                General Chat
              </Button>
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-3/4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-3xl tracking-wider">ALL DISCUSSIONS</h2>
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              Start New Topic
            </Button>
          </div>

          <div className="space-y-4">
            {mockDiscussions.map((discussion) => (
              <Card
                key={discussion.id}
                className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <Link
                      href={`/book-club/discussions/${discussion.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <h3 className="font-display text-2xl tracking-wide mb-2">{discussion.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mb-3">
                      Started by <span className="text-primary font-medium">{discussion.author.name}</span> in{" "}
                      <span className="text-secondary font-medium">{discussion.category}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2 sm:mt-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>{discussion.stats.replies}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{discussion.stats.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>{discussion.stats.views}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Last reply {discussion.lastReply.time} by {discussion.lastReply.author}
                  </p>
                  <Link href={`/book-club/discussions/${discussion.id}`} className="flex items-center text-sm text-primary hover:underline">
                    <span>View Discussion</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
