"use client"

import { Button } from "@/components/ui/button"
import { Home, BookOpen, Users, Calendar, MessageSquare, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", icon: Home, label: "Dashboard" },
    { href: "/admin/books", icon: BookOpen, label: "Catalog" },
    { href: "/admin/book-club", icon: Calendar, label: "Monthly Selection" },
    { href: "/admin/discussions", icon: MessageSquare, label: "Discussions" },
    { href: "/admin/events", icon: Calendar, label: "Events" },
    { href: "/admin/users", icon: Users, label: "Users" },
  ]

  return (
    <div className="w-64 h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
      {/* Logo & Close Button */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
            alt="Kane's Komets Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <span className="font-display text-2xl tracking-wider text-primary block leading-none">KANE'S KOMETS</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Admin Panel</span>
          </div>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start font-medium transition-all ${!isActive && "bg-transparent hover:bg-primary/10"}`}
              asChild
              onClick={onClose}
            >
              <Link href={item.href}>
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full bg-transparent border-border/50" asChild onClick={onClose}>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Site
          </Link>
        </Button>
      </div>
    </div>
  )
}

