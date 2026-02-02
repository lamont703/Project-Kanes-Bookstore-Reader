import { Button } from "@/components/ui/button"
import { mockDiscussions } from "@/lib/mock-book-club-data"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import DiscussionThreadClient from "../discussion-thread-client"

export default async function DiscussionThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const discussion = mockDiscussions.find((d) => d.id === id)

  if (!discussion) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Discussion not found</h1>
          <Link href="/book-club/discussions">
            <Button>Back to discussions</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <DiscussionThreadClient discussion={discussion} />
}
