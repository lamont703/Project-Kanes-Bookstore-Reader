"use client"

import { Button } from "@/components/ui/button"
import { Home, BookOpen, Users, Calendar, MessageSquare, X, Star, ShoppingBag, Shirt, FileText } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ViewAsSelect } from "@/components/admin/view-as-select"
import { employeeCanAccess, isAdminRole, type UserRole } from "@/lib/roles"

interface AdminSidebarProps {
  onClose?: () => void
  /** Decides which sections appear. Defaults to admin so existing callers are unchanged. */
  role?: UserRole
}

export function AdminSidebar({ onClose, role = "admin" }: AdminSidebarProps) {
  const pathname = usePathname()
  const isAdmin = isAdminRole(role)

  const allNavItems = [
    { href: "/admin", icon: Home, label: "Dashboard" },
    { href: "/admin/books", icon: BookOpen, label: "Catalog" },
    // Merchandise has its own list and form: books and merch share the `books`
    // table but not their shape, so /admin/books filters to product_type='book'
    // and never surfaces merch. Without this entry the products admin existed
    // but was unreachable by clicking.
    { href: "/admin/products", icon: Shirt, label: "Merchandise" },
    { href: "/admin/pages", icon: FileText, label: "Site Pages" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { href: "/admin/book-club", icon: Star, label: "Monthly Selection" },
    { href: "/admin/discussions", icon: MessageSquare, label: "Discussions" },
    { href: "/admin/events", icon: Calendar, label: "Events" },
    { href: "/admin/users", icon: Users, label: "Users" },
  ]

  // Employees see only the two catalogue sections. Filtering by the same
  // predicate the middleware redirects on (lib/roles.ts) means the menu can
  // never offer a link that would bounce.
  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter((item) => employeeCanAccess(item.href))

  return (
    <div className="w-64 h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
      {/* Logo & Close Button */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp"
            alt="Kane's Komets Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <span className="font-display text-2xl tracking-wider text-primary block leading-none">KANE'S KOMETS</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
              {isAdmin ? "Admin Panel" : "Catalog Team"}
            </span>
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
          const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/")

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
      <div className="p-4 border-t border-border space-y-3">
        {/* Borrow a member's point of view. Read-only — see lib/view-as/types.ts.
            Gates itself on the real signed-in role: a genuine employee sees
            nothing here, but an admin viewing as one still gets the exit. */}
        <ViewAsSelect onNavigate={onClose} />

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

