export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminEventsContent } from "@/components/admin/admin-events-content"

export default async function AdminEventsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login?redirect=/admin/events")
    }

    // Fetch initial events on the server
    const { data, error } = await supabase
        .from("book_club_events")
        .select("*")
        .order("date", { ascending: true })

    if (error) {
        console.error("Failed to fetch events for admin:", error)
    }

    return (
        <div className="p-4 md:p-8 min-h-screen">
            <AdminEventsContent initialEvents={data || []} />
        </div>
    )
}
