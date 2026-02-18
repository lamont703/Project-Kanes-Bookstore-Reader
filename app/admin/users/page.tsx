"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockAdminUsers } from "@/lib/mock-admin-data"
import { Search, Filter, MoreVertical, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function AdminUsersPage() {
  const [users, setUsers] = useState(mockAdminUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSubscription, setFilterSubscription] = useState<"all" | "premium">("all")

  // State for subscription management dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<typeof mockAdminUsers[0] | null>(null)
  const [newSubscription, setNewSubscription] = useState<"free" | "premium">("free")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterSubscription === "all" || user.subscription === filterSubscription
    return matchesSearch && matchesFilter
  })

  const openManageSubscription = (user: typeof mockAdminUsers[0]) => {
    setSelectedUser(user)
    setNewSubscription(user.subscription as "free" | "premium")
    setIsDialogOpen(true)
  }

  const handleUpdateSubscription = () => {
    if (!selectedUser) return

    setUsers(users.map(u =>
      u.id === selectedUser.id ? { ...u, subscription: newSubscription } : u
    ))

    setIsDialogOpen(false)
    toast.success("Subscription updated", {
      description: `${selectedUser.name} is now a ${newSubscription} user.`
    })
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 text-center md:text-left">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
            <span className="text-primary">MANAGE</span> USERS
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">{users.length} total users in orbit</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            className="pl-10 bg-card h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          <Button
            variant={filterSubscription === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSubscription("all")}
            className={`text-xs h-8 ${filterSubscription === "all" ? "" : "bg-transparent"}`}
          >
            All Users
          </Button>
          <Button
            variant={filterSubscription === "premium" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSubscription("premium")}
            className={`text-xs h-8 ${filterSubscription === "premium" ? "" : "bg-transparent"}`}
          >
            Book Club Users
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden bg-card/50 backdrop-blur border-border/50">
        <div className="overflow-x-auto -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:pb-0">
          <table className="w-full min-w-[600px] md:min-w-0">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">User</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Join Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tier</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Inventory</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Last Active</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm md:text-base">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">{user.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs hidden lg:table-cell">
                    {user.joinDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded font-bold border ${user.subscription === "premium" ? "bg-primary/20 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
                    >
                      {user.subscription}
                    </span>
                  </td>
                  <td className="p-4 text-sm hidden sm:table-cell">
                    <span className="font-medium">{user.booksOwned}</span>
                    <span className="text-xs text-muted-foreground ml-1">Volumes</span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">
                    {user.lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openManageSubscription(user)}>
                            Manage Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            Ban User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manage Subscription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wider text-primary uppercase">Identity Modification</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Update the clearance level and subscription tier for <span className="text-foreground font-bold italic">"{selectedUser?.name}"</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-xs uppercase tracking-widest text-primary font-bold">Clearance Level</Label>
              <Select
                value={newSubscription}
                onValueChange={(value) => setNewSubscription(value as "free" | "premium")}
              >
                <SelectTrigger id="plan" className="w-full bg-background/50 border-border/50 h-12">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Standard (Free)</SelectItem>
                  <SelectItem value="premium">Elite (Book Club Access)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {newSubscription === "premium"
                  ? "Grants access to exclusive forum sectors and monthly features."
                  : "Standard access to the public library catalog."}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Abort Mission</Button>
            <Button onClick={handleUpdateSubscription} className="font-display tracking-widest w-full sm:w-auto">
              SYNC IDENTITY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
