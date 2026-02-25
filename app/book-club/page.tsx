import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { BookClubContent } from "@/components/book-club-content"
import { sortSelections, getCurrentStatus } from "@/lib/book-club-utils"

export default async function BookClubPage() {
  const supabase = await createClient()

  // Fetch Current Selections
  const { data: rawSelections } = await supabase
    .from('book_club_selections')
    .select('*, books(*)')

  const processedSelections = (rawSelections || []).map((s: any) => ({
    ...s,
    status: getCurrentStatus(s.month, s.year)
  }))

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
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
    subscription = sub
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
      />
    </div>
  )
}
