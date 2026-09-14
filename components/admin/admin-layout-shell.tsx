"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { UserRole } from "@/lib/roles"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function AdminLayoutShell({
  children,
  role,
}: {
  children: React.ReactNode
  /** Decides which nav entries and which destructive controls appear. */
  role: UserRole
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  /**
   * Mark <body> as admin so the light form fields reach dialogs and select
   * menus too.
   *
   * Radix portals those to the end of <body>, outside this shell, and most of
   * the admin's fields live inside a dialog — so scoping the styling to the
   * wrapper alone would leave the busiest forms dark. The wrapper keeps its own
   * class as well: that one is server-rendered, so the fields on the page are
   * correct on first paint rather than after hydration.
   */
  useEffect(() => {
    document.body.classList.add("admin-ui")
    return () => document.body.classList.remove("admin-ui")
  }, [])

  return (
    <div className="admin-ui flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed left, Mobile: drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AdminSidebar role={role} onClose={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border bg-card/30 backdrop-blur flex items-center justify-between px-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"
              alt="Kane's Komets Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-display text-xl tracking-wider text-primary">KANE'S KOMETS</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-0">
          {children}
        </main>
      </div>

    </div>
  )
}
