import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockUserAnalytics, mockAdminUsers } from "@/lib/mock-admin-data"
import { mockBooks } from "@/lib/mock-books"
import { mockBookClubSelections } from "@/lib/mock-book-club-data"
import { Users, DollarSign, TrendingUp, BookOpen, UserPlus, AlertCircle } from "lucide-react"

export default function AdminDashboard() {
  const recentUsers = mockAdminUsers.slice(0, 5)
  const currentSelection = mockBookClubSelections.find((s) => s.status === "current")
  const currentBook = currentSelection ? mockBooks.find((b) => b.id === currentSelection.bookId) : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-wider mb-2">
          <span className="text-primary">ADMIN</span> <span className="text-secondary">DASHBOARD</span>
        </h1>
        <p className="text-lg text-muted-foreground">Manage your cosmic bookstore</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="font-display text-4xl tracking-wide mb-1">
                {mockUserAnalytics.totalUsers.toLocaleString()}
              </p>
              <p className="text-xs text-primary flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />+{mockUserAnalytics.newUsersThisMonth} this month
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur border-secondary/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Subscribers</p>
              <p className="font-display text-4xl tracking-wide mb-1">
                {mockUserAnalytics.activeSubscribers.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {((mockUserAnalytics.activeSubscribers / mockUserAnalytics.totalUsers) * 100).toFixed(1)}% of users
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur border-primary/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
              <p className="font-display text-4xl tracking-wide mb-1">
                ${(mockUserAnalytics.revenueThisMonth / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-muted-foreground">${mockUserAnalytics.totalRevenue.toLocaleString()} total</p>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Churn Rate</p>
              <p className="font-display text-4xl tracking-wide mb-1">{mockUserAnalytics.churnRate}%</p>
              <p className="text-xs text-muted-foreground">Below industry average</p>
            </div>
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Current Book Club Selection */}
        <Card className="p-6 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-wide">CURRENT BOOK CLUB</h2>
            <Button size="sm" variant="outline" className="bg-transparent">
              Manage
            </Button>
          </div>
          {currentBook && currentSelection ? (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-medium">{currentBook.title}</p>
                <p className="text-sm text-muted-foreground">by {currentBook.author}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded border border-primary/30">
                <p className="text-sm font-medium text-primary mb-1">{currentSelection.theme}</p>
                <p className="text-xs text-muted-foreground">
                  Discussion:{" "}
                  {currentSelection.discussionDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">Active Members</span>
                <span className="font-medium">{mockUserAnalytics.activeSubscribers.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No current selection</p>
          )}
        </Card>

        {/* Library Stats */}
        <Card className="p-6 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-wide">LIBRARY STATS</h2>
            <Button size="sm" variant="outline" className="bg-transparent">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Books</p>
                  <p className="text-xs text-muted-foreground">In catalog</p>
                </div>
              </div>
              <span className="font-display text-2xl">{mockBooks.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Book Club Selections</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </div>
              <span className="font-display text-2xl">{mockBookClubSelections.length}</span>
            </div>

            <div className="pt-3 border-t border-border">
              <Button className="w-full" size="sm">
                Add New Book
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="p-6 bg-card/50 backdrop-blur mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl tracking-wide">RECENT USERS</h2>
          <Button size="sm" variant="outline" className="bg-transparent">
            View All Users
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Email</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Subscription</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Books Owned</th>
                <th className="pb-3 text-sm font-medium text-muted-foreground">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-border">
                  <td className="py-4 text-sm">{user.name}</td>
                  <td className="py-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${user.subscription === "premium" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {user.subscription}
                    </span>
                  </td>
                  <td className="py-4 text-sm">{user.booksOwned}</td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {user.lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
