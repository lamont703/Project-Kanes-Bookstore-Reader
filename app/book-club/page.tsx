import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { BookClubContent } from "@/components/book-club-content"
import { sortSelections, getCurrentStatus } from "@/lib/book-club-utils"

export const dynamic = 'force-dynamic'

export default async function BookClubPage() {
  const supabase = await createClient()

  // Fetch Current Selections
  const { data: rawSelections } = await supabase
    .from('book_club_selections')
    .select('*, books(*, discussion_topics(id, category, deleted_at))')

  const processedSelections = (rawSelections || [])
    .filter((s: any) => s.books) // Ensure associated book exists
    .map((s: any) => {
      // Find the primary book club discussion for this book.
      // Priority 1: Category = 'Book Club'
      // Priority 2: Any other category (e.g. 'General') if linked to this book.
      const topics = s.books?.discussion_topics || []
      const discussion = topics.find((t: any) => t.category === 'Book Club' && !t.deleted_at)
        || topics.find((t: any) => !t.deleted_at)

      console.debug(`[BookClubPage] Mapping book: ${s.books?.title} (ID: ${s.books?.id}) | Discussion found: ${discussion ? `${discussion.id} (${discussion.category})` : 'none'}`)

      return {
        ...s,
        status: getCurrentStatus(s.month, s.year),
        discussionId: discussion?.id || null
      }
    })

  const selections = sortSelections(processedSelections)
  const currentSelection = selections.find((s: any) => s.status === 'current')
  const upcomingSelections = selections.filter((s: any) => s.status === 'upcoming')
  const pastSelections = selections.filter((s: any) => s.status === 'past')

  // Fetch Upcoming Events
  const { data: events } = await supabase
    .from('book_club_events')
    .select('*')
    .eq('status', 'upcoming')
    .order('date', { ascending: true })

  // Fetch User Subscription if logged in
  const { data: { user } } = await supabase.auth.getUser()
  let subscription = null
  let userRsvps: string[] = []

  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
    subscription = sub

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id)

    userRsvps = (rsvps || []).map(r => r.event_id)
  }

  // Fetch Eligible Book Club Books (for display)
  const { data: eligibleBooks } = await supabase
    .from('books')
    .select('*')
    .eq('is_book_club_eligible', true)
    .eq('status', 'published')

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <BookClubContent
        currentSelection={currentSelection}
        upcomingSelections={upcomingSelections}
        pastSelections={pastSelections}
        events={events || []}
        subscription={subscription}
        eligibleBooks={eligibleBooks || []}
        userRsvps={userRsvps}
      />
    </div>
  )
}
