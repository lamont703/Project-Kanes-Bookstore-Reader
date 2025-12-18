"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockAdminUsers } from "@/lib/mock-admin-data"
import { Search, Filter, Mail, MoreVertical } from "lucide-react"

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSubscription, setFilterSubscription] = useState<"all" | "free" | "premium">("all")

  const filteredUsers = mockAdminUsers.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterSubscription === "all" || user.subscription === filterSubscription
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-5xl tracking-wider mb-2">
            <span className="text-primary">MANAGE</span> USERS
          </h1>
          <p className="text-lg text-muted-foreground">{mockAdminUsers.length} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            className="pl-10 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Button
            variant={filterSubscription === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSubscription("all")}
            className={filterSubscription === "all" ? "" : "bg-transparent"}
          >
            All Users
          </Button>
          <Button
            variant={filterSubscription === "premium" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSubscription("premium")}
            className={filterSubscription === "premium" ? "" : "bg-transparent"}
          >
            Premium
          </Button>
          <Button
            variant={filterSubscription === "free" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSubscription("free")}
            className={filterSubscription === "free" ? "" : "bg-transparent"}
          >
            Free
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden bg-card/50 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left text-sm font-medium">Name</th>
                <th className="p-4 text-left text-sm font-medium">Email</th>
                <th className="p-4 text-left text-sm font-medium">Join Date</th>
                <th className="p-4 text-left text-sm font-medium">Subscription</th>
                <th className="p-4 text-left text-sm font-medium">Books Owned</th>
                <th className="p-4 text-left text-sm font-medium">Last Active</th>
                <th className="p-4 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <p className="font-medium">{user.name}</p>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="p-4 text-sm">
                    {user.joinDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${user.subscription === "premium" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {user.subscription}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{user.booksOwned}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {user.lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
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
