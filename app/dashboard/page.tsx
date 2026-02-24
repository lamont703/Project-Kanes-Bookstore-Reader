import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site-header"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/dashboard")
  }

  // Fetch Public User Profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch User Library with Book Details
  const { data: libraryData, error: libError } = await supabase
    .from('user_library')
    .select(`
      *,
      books (*)
    `)
    .eq('user_id', user.id)
    .order('acquired_at', { ascending: false })

  if (libError) {
    console.error("Error fetching library:", libError)
  }

  // Fetch Reading Progress separately since there is no direct FK link for a nested join
  const { data: progressData } = await supabase
    .from('reading_progress')
    .eq('user_id', user.id)

  // Merge library data with its corresponding progress
  const library = (libraryData || []).map(item => ({
    ...item,
    reading_progress: progressData?.filter(p => p.book_id === item.book_id) || []
  }))

  // Fetch Orders with Items
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*, books (*))
    `)
    .eq('user_id', user.id)
    .order('placed_at', { ascending: false })

  // Fetch Subscription Status
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 md:py-12">
        <DashboardContent
          initialUser={profile}
          initialLibrary={library || []}
          initialOrders={orders || []}
          initialSubscription={subscription}
        />
      </div>
    </div>
  )
}

