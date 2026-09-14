import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import DiscussionThreadClient from "../discussion-thread-client"
import { getViewerContext } from "@/lib/view-as/server"
import { redirect } from "next/navigation"

export default async function DiscussionThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // `userId` is the member being viewed during a View As session, `user` stays
  // the real signed-in account — a post or a vote cast from inside a view is
  // still the admin's, so DiscussionThreadClient blocks both. See
  // lib/view-as/server.ts.
  const { realUser: user, userId, db: supabase } = await getViewerContext()

  // Auth check
  if (!user || !userId) redirect(`/login?redirect=/book-club/discussions/${id}`)

  // Fetch the topic
  const { data: topic, error: topicError } = await supabase
    .from("discussion_topics")
    .select("*, books(title, cover_image_url)")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (topicError || !topic) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Discussion not found</h1>
          <p className="text-muted-foreground mb-6">This room may have been removed or you may not have access.</p>
          <Link href="/book-club/discussions">
            <Button>Back to Discussions</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Fetch top-level posts (flat fetch — client will display nested via parent_id)
  const { data: posts } = await supabase
    .from("discussion_posts")
    .select(`
      id,
      topic_id,
      parent_id,
      author_id,
      content,
      likes,
      created_at,
      updated_at,
      users (
        id,
        full_name,
        display_name
      )
    `)
    .eq("topic_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  // Fetch current user's votes for this topic's posts
  const postIds = (posts ?? []).map((p: any) => p.id)
  let userVotes: Record<string, "up" | "down"> = {}
  if (postIds.length > 0) {
    const { data: votes } = await supabase
      .from("discussion_votes")
      .select("post_id, vote_type")
      .eq("user_id", userId)
      .in("post_id", postIds)

    for (const v of votes ?? []) {
      userVotes[v.post_id] = v.vote_type as "up" | "down"
    }
  }

  return (
    <DiscussionThreadClient
      topic={topic}
      initialPosts={posts ?? []}
      currentUser={user}
      initialUserVotes={userVotes}
    />
  )
}
