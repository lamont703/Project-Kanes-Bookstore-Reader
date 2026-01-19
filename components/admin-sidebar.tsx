"use client"

import { Button } from "@/components/ui/button"
import { Home, BookOpen, Users, Calendar, BarChart3, Settings, Sparkles, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminSidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", icon: Home, label: "Dashboard" },
    { href: "/admin/books", icon: BookOpen, label: "Catalog" },
    { href: "/admin/book-club", icon: Calendar, label: "Monthly Selection" },
    { href: "/admin/discussions", icon: MessageSquare, label: "Discussions" },
    { href: "/admin/events", icon: Calendar, label: "Events" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="w-64 h-screen border-r border-border bg-card/30 backdrop-blur flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display text-2xl tracking-wider text-primary block">KOMET</span>
            <span className="text-xs text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${!isActive && "bg-transparent"}`}
              asChild
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
        <Button variant="outline" className="w-full bg-transparent" asChild>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Site
          </Link>
        </Button>
      </div>
    </div>
  )
}
