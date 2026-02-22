import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, BookOpen, Calendar, MessageSquare, ArrowRight, Star, Users, Crown } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // 1. Fetch Counts
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
  const { count: booksCount } = await supabase.from('books').select('*', { count: 'exact', head: true })
  const { count: selectionCount } = await supabase.from('book_club_selections').select('*', { count: 'exact', head: true })
  const { count: eventCount } = await supabase.from('book_club_events').select('*', { count: 'exact', head: true })
  const { count: topicCount } = await supabase.from('discussion_topics').select('*', { count: 'exact', head: true })

  // 2. Fetch Recent Users snapshot
  const { data: recentUsersRaw } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      display_name,
      email,
      last_active_at,
      created_at,
      user_subscriptions (plan)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentUsers = (recentUsersRaw || []).map(u => ({
    id: u.id,
    name: u.full_name || u.display_name || "Unknown Traveler",
    email: u.email,
    subscription: (u.user_subscriptions as any)?.[0]?.plan || 'free',
    lastActive: u.last_active_at || u.created_at
  }))

  const adminNavCards = [
    {
      title: "Catalog",
      description: "Manage Komet book collection and inventory",
      href: "/admin/books",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      count: booksCount || 0
    },
    {
      title: "Monthly Selection",
      description: "Curate and schedule future book club monthly picks",
      href: "/admin/book-club",
      icon: Star,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      borderColor: "border-secondary/30",
      count: selectionCount || 0
    },
    {
      title: "Discussion Topics",
      description: "Moderate community conversations and forum topics",
      href: "/admin/discussions",
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      count: topicCount || 0
    },
    {
      title: "Events",
      description: "Schedule and manage virtual author meetups and club events",
      href: "/admin/events",
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      borderColor: "border-secondary/30",
      count: eventCount || 0
    },
    {
      title: "Identity Hub",
      description: "Manage explorer clearance levels and access credentials",
      href: "/admin/users",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      count: usersCount || 0
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
                    <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full">
                      {card.count} Items
                    </span>
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

      {/* Recent Users - Community Snapshot */}
      <Card className="p-4 md:p-6 bg-card/50 backdrop-blur mt-8 border-border/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl tracking-wide uppercase leading-none text-primary">Community Snapshot</h2>
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
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground italic">No explorer transmissions detected</td>
                </tr>
              ) : recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors group">
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit ${user.subscription === "premium" ? "bg-primary/20 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border"}`}
                    >
                      {user.subscription === "premium" && <Crown className="w-2.5 h-2.5" />}
                      {user.subscription}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground text-right">
                    {new Date(user.lastActive).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
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
