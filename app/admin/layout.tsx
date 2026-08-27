import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell"
import { isStaffRole, type UserRole } from "@/lib/roles"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. Check for basic user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login?redirect=/admin")
  }

  // 2. Verify the role belongs in the admin panel at all.
  //
  //    Which *sections* of it they get is decided in the middleware, which is
  //    where this app gates admin routes (see CLAUDE.md) and which runs on RSC
  //    navigations as well as full page loads. Both sides read lib/roles.ts, so
  //    they cannot drift into disagreeing about who is allowed where.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !isStaffRole(profile?.role)) {
    redirect("/")
  }

  // 3. Render the shell, telling it which sections this role may see
  return <AdminLayoutShell role={profile.role as UserRole}>{children}</AdminLayoutShell>
}
