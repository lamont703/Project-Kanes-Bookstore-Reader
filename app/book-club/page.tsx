import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { BookClubContent } from "@/components/book-club-content"

export default async function BookClubPage() {
  const supabase = await createClient()

  // Fetch Current Selections
  const { data: selections } = await supabase
    .from('book_club_selections')
    .select('*, books(*)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const currentSelection = selections?.find(s => s.status === 'current')
  const upcomingSelections = selections?.filter(s => s.status === 'upcoming') || []
  const pastSelections = selections?.filter(s => s.status === 'past') || []

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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <BookClubContent
        currentSelection={currentSelection}
        upcomingSelections={upcomingSelections}
        pastSelections={pastSelections}
        events={events || []}
        subscription={subscription}
      />
    </div>
  )
}
