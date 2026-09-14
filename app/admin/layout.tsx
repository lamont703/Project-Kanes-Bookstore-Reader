import type React from "react"
import { redirect } from "next/navigation"
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell"
import { getEffectiveRole } from "@/lib/current-role"
import { isStaffRole } from "@/lib/roles"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The *effective* role: the viewed member's during a View As session, so
  // viewing as an employee shows the employee's panel rather than the admin's.
  // The middleware computes the same thing from the same helpers, so the two
  // sides cannot drift into disagreeing about who is allowed where.
  //
  // getEffectiveRole resolves the session itself and returns "reader" when there
  // is none, which the staff check below turns away.
  const role = await getEffectiveRole()

  if (!isStaffRole(role)) {
    redirect("/")
  }

  return <AdminLayoutShell role={role}>{children}</AdminLayoutShell>
}
