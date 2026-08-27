import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { DashboardContent } from "@/components/dashboard-content"
import { getViewerContext } from "@/lib/view-as/server"

export default async function DashboardPage() {
  // `userId`/`db` are the signed-in user and their own RLS-scoped client, except
  // while an admin is viewing as a member — then they become that member's id
  // and the service-role client. Every query below filters on userId explicitly,
  // which is what keeps the second case honest. See lib/view-as/server.ts.
  const { realUser, userId, db } = await getViewerContext()

  if (!realUser || !userId) {
    redirect("/login?redirect=/dashboard")
  }

  // Fetch Public User Profile
  const { data: profile } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // Fetch User Library with Book Details
  const { data: libraryData, error: libError } = await db
    .from('user_library')
    .select(`
      *,
      books (*)
    `)
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false })

  if (libError) {
    console.error("Error fetching library:", libError)
  }

  // Fetch Reading Progress separately since there is no direct FK link for a nested join
  const { data: progressData, error: progressError } = await db
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)

  if (progressError) {
    console.error("Error fetching progress:", progressError)
  }

  // Merge library data with its corresponding progress
  const library = (libraryData || []).map((item: any) => ({
    ...item,
    reading_progress: progressData?.filter((p: any) => p.book_id === item.book_id) || []
  }))

  // Fetch Orders with Items
  const { data: orders } = await db
    .from('orders')
    .select(`
      *,
      order_items (*, books (*))
    `)
    .eq('user_id', userId)
    .order('placed_at', { ascending: false })

  // Fetch Subscription Status
  const { data: subscription } = await db
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
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
