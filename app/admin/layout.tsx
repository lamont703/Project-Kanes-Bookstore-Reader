import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Toaster } from "sonner"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      <Toaster position="top-right" theme="dark" />
    </div>
  )
}
