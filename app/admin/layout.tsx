import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  
  // 1. Check for basic user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/login?redirect=/admin")
  }

  // 2. Verify admin role in database
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "admin") {
    redirect("/")
  }

  // 3. Render the shell if authorized
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}
