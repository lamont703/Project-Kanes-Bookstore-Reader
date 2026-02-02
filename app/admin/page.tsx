import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockAdminUsers } from "@/lib/mock-admin-data"
import { mockBooks } from "@/lib/mock-books"
import { mockBookClubSelections } from "@/lib/mock-book-club-data"
import { TrendingUp, BookOpen, Calendar, MessageSquare, ArrowRight, LayoutDashboard } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const recentUsers = mockAdminUsers.slice(0, 5)
  const currentSelection = mockBookClubSelections.find((s) => s.status === "current")
  const currentBook = currentSelection ? mockBooks.find((b) => b.id === currentSelection.bookId) : null

  const adminNavCards = [
    {
      title: "Catalog",
      description: "Manage Komet book collection, inventory and categories",
      href: "/admin/books",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      count: mockBooks.length
    },
    {
      title: "Monthly Selection",
      description: "Curate and schedule future book club monthly picks",
      href: "/admin/book-club",
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      borderColor: "border-secondary/30",
      count: mockBookClubSelections.length
    },
    {
      title: "Discussion Topics",
      description: "Moderate community conversations and forum categories",
      href: "/admin/discussions",
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
    {
      title: "Events",
      description: "Schedule and manage virtual author meetups and club events",
      href: "/admin/events",
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      borderColor: "border-secondary/30",
    },
  ]

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight text-center md:text-left">
            <span className="text-primary">ADMIN</span> <span className="text-secondary">DASHBOARD</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground text-center md:text-left">Manage your Komet bookstore ecosystem</p>
        </div>

      </div>



      {/* Navigation Shell Grid */}
      <div className="mb-12">
        <h2 className="font-display text-3xl tracking-wider mb-6">
          <span className="text-primary">MANAGEMENT</span> CONSOLE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminNavCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.title} href={card.href}>
                <Card className={`p-6 bg-card/50 backdrop-blur ${card.borderColor} hover:bg-card/80 transition-all group h-full cursor-pointer relative overflow-hidden`}>
                  <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <h3 className="font-display text-2xl tracking-wide mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.description}</p>

                  <div className="flex items-center justify-between mt-auto">
                    {card.count !== undefined ? (
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
                        {card.count} Items
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
                        Manage
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Icon className="w-24 h-24" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>



      {/* Recent Users - Reduced height */}
      <Card className="p-4 md:p-6 bg-card/50 backdrop-blur mt-8 border-border/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl tracking-wide uppercase leading-none">Community Snapshot</h2>
          <Button size="sm" variant="outline" className="bg-transparent" asChild>
            <Link href="/admin/users">All Users</Link>
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">User</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Tier</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Activity</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0">
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded font-bold ${user.subscription === "premium" ? "bg-primary/20 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border"}`}
                    >
                      {user.subscription}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground text-right">
                    {user.lastActive.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

