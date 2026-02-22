import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { MessageSquare, ArrowRight, Clock, Pin, Star } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { redirect } from "next/navigation"

export default async function DiscussionListPage() {
  const supabase = await createClient()

  // Auth check — only premium members can access discussions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?redirect=/book-club/discussions")

  const { data: topics, error } = await supabase
    .from("discussion_topics")
    .select("*")
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })

  if (error) {
    console.error("Error fetching discussion topics:", error)
  }

  const topicList = topics ?? []

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
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                {topicList.length} room{topicList.length !== 1 ? "s" : ""}
              </span>
            </div>

            {topicList.length === 0 ? (
              <Card className="p-16 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="font-display text-3xl tracking-wide uppercase mb-2">Silent Transmission</h3>
                <p className="text-muted-foreground max-w-sm">No discussion rooms are active yet. Check back soon.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {topicList.map((topic) => (
                  <Card
                    key={topic.id}
                    className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors group relative overflow-hidden"
                  >
                    {/* Pinned indicator stripe */}
                    {topic.is_pinned && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    )}

                    <div className="flex flex-col sm:flex-row justify-between gap-4 pl-2">
                      <div className="flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-2">
                          {topic.is_pinned && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              <Pin className="w-2.5 h-2.5 fill-primary" /> Pinned
                            </span>
                          )}
                          {topic.is_featured && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                              <Star className="w-2.5 h-2.5 fill-yellow-500" /> Featured
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                            {topic.category}
                          </span>
                        </div>

                        <Link
                          href={`/book-club/discussions/${topic.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <h3 className="font-display text-2xl md:text-3xl tracking-wide mb-2 group-hover:text-primary transition-colors">
                            {topic.title}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground mb-4 line-clamp-2 italic">
                          {topic.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{topic.post_count ?? 0} Posts</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>{topic.member_count ?? 0} Explorers</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50 pl-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Last Pulse:{" "}
                          {topic.last_activity_at
                            ? new Date(topic.last_activity_at).toLocaleDateString()
                            : "No activity yet"}
                        </span>
                      </div>
                      <Link
                        href={`/book-club/discussions/${topic.id}`}
                        className="flex items-center text-sm text-primary hover:underline font-display tracking-wider"
                      >
                        <span>ENTER ROOM</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
