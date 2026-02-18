import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockDiscussionTopics } from "@/lib/mock-book-club-data"
import { MessageSquare, Eye, Users, ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"

export default function DiscussionListPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
            <span className="text-primary">COMMUNITY</span> <span className="text-secondary">DISCUSSIONS</span>
          </h1>
          <p className="text-lg text-muted-foreground">Join the conversation with fellow Komet readers</p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl tracking-wider uppercase">Active Rooms</h2>
            </div>

            <div className="space-y-4">
              {mockDiscussionTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {topic.isPinned && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                            Pinned
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/book-club/discussions/${topic.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <h3 className="font-display text-2xl md:text-3xl tracking-wide mb-2 group-hover:text-primary transition-colors">{topic.title}</h3>
                      </Link>
                      <p className="text-muted-foreground mb-4 line-clamp-2 italic">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last Pulse: {topic.lastActivity.toLocaleDateString()}</span>
                    </div>
                    <Link href={`/book-club/discussions/${topic.id}`} className="flex items-center text-sm text-primary hover:underline font-display tracking-wider">
                      <span>ENTER ROOM</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
