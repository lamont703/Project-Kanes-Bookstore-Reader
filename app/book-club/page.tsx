export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/nav/site-footer"
import { BookClubContent } from "@/components/book-club-content"
import { sortSelections, getCurrentStatus, isEventPast } from "@/lib/book-club-utils"
import { getPublishedPage, type PageDocument } from "@/lib/page-content"

export default async function BookClubPage({
  previewDocument,
}: {
  /**
   * Supplied only by the admin draft preview, which renders this component so
   * the preview is the page rather than a copy of it.
   */
  previewDocument?: PageDocument
} = {}) {
  const supabase = await createClient()
  const copyDoc = previewDocument ?? (await getPublishedPage("book-club"))

  // Fetch Current Selections
  const { data: rawSelections } = await supabase
    .from('book_club_selections')
    .select('*, books(*)')

  const processedSelections = (rawSelections || [])
    .filter((s: any) => s.books) // Ensure associated book exists
    .map((s: any) => ({
      ...s,
      status: getCurrentStatus(s.month, s.year)
    }))

  // Fetch Events
  const { data: allEvents, error: eventsError } = await supabase
    .from('book_club_events')
    .select('*')
  
  if (eventsError) {
    console.error("Supabase Events Error:", eventsError)
  }

  const events = (allEvents || [])
    .filter(e => !isEventPast(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

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
    .eq('product_type', 'book')

  // Fetch linked discussions for all books in selections
  const bookIds = processedSelections.map((s: any) => s.book_id)
  const { data: discussions } = await supabase
    .from('discussion_topics')
    .select('id, book_id')
    .in('book_id', bookIds)
    .is('deleted_at', null)

  const selectionsWithDiscussions = processedSelections.map((s: any) => ({
    ...s,
    discussionId: discussions?.find((d: any) => d.book_id === s.book_id)?.id
  }))

  const finalSelections = sortSelections(selectionsWithDiscussions)
  const currentSelection = finalSelections.find((s: any) => s.status === 'current')
  const upcomingSelections = finalSelections.filter((s: any) => s.status === 'upcoming')
  const pastSelections = finalSelections.filter((s: any) => s.status === 'past')

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
        copy={copyDoc}
      />

      <SiteFooter mode="app" />
    </div>
  )
}
