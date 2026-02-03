"use client"

import type React from "react"
import { useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Toaster } from "sonner"
import { Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
        <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border bg-card/30 backdrop-blur flex items-center justify-between px-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
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

      <Toaster position="top-right" theme="dark" />
    </div>
  )
}
