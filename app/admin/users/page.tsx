"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, MoreVertical, Loader2, ShieldAlert, ShieldCheck, Crown, UserX, Gift, Copy, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useDebounce } from "@/hooks/use-debounce"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  role: "reader" | "admin"
  isBanned: boolean
  joinDate: string
  lastActive: string | null
  booksOwned: number
  plan: "free" | "premium"
  subscriptionStatus: string | null
  dealerInfo: {
    code: string
    discount: number
    isActive: boolean
    totalUses: number
  } | null
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function DealerCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success(`Code ${code} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 group/copy hover:bg-secondary/20 transition-colors px-2 py-1 rounded border border-secondary/20"
    >
      <code className="text-secondary font-mono font-bold">
        {code}
      </code>
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-secondary opacity-50 group-hover/copy:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"users" | "dealers">("users")
  const [filterTier, setFilterTier] = useState<"all" | "premium">("all")

  // Subscription management dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [newPlan, setNewPlan] = useState<"free" | "premium">("free")
  const [newRole, setNewRole] = useState<"reader" | "admin">("reader")
  const [allBooks, setAllBooks] = useState<{ id: string, title: string }[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>("")

  const [isMounted, setIsMounted] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const debouncedSearch = useDebounce(searchQuery, 400)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("q", debouncedSearch)
    if (filterType === "dealers") {
      params.set("type", "dealers")
    } else if (filterTier !== "all") {
      params.set("tier", filterTier)
    }

    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) {
      toast.error("Failed to fetch users")
      setIsLoading(false)
      return
    }
    const { users: data } = (await res.json()) as { users: AdminUser[] }
    setUsers(data ?? [])
    setIsLoading(false)
  }, [debouncedSearch, filterTier, filterType])

  useEffect(() => {
    setIsMounted(true)
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    supabase.from("books")
      .select("id, title")
      .eq("status", "published")
      .order("title")
      .then(({ data }: { data: any }) => setAllBooks(data || []))
  }, [supabase])

  // ── Manage subscription dialog ─────────────────────────────────────────────
  const openManageDialog = (user: AdminUser) => {
    setSelectedUser(user)
    setNewPlan(user.plan)
    setNewRole(user.role)
    setIsDialogOpen(true)
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return
    setIsSaving(true)

    const changes: Promise<Response>[] = []

    // Update plan if changed
    if (newPlan !== selectedUser.plan) {
      changes.push(
        fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUser.id, action: "set_plan", plan: newPlan }),
        })
      )
    }

    // Update role if changed
    if (newRole !== selectedUser.role) {
      changes.push(
        fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUser.id, action: "set_role", role: newRole }),
        })
      )
    }

    try {
      const results = await Promise.all(changes)
      const allOk = results.every(r => r.ok)

      if (!allOk) {
        const errs = await Promise.all(results.filter(r => !r.ok).map(r => r.json()))
        toast.error(errs[0]?.error ?? "Update failed")
        setIsSaving(false)
        return
      }

      // Optimistically update local state
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id
          ? { ...u, plan: newPlan, role: newRole }
          : u
      ))
      toast.success(`${selectedUser.name} updated successfully.`)
      setIsDialogOpen(false)
    } catch {
      toast.error("Network error. Please try again.")
    }

    setIsSaving(false)
  }

  const handleGiftBook = async () => {
    if (!selectedUser || !selectedBookId) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, bookId: selectedBookId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Failed to gift book")
      }
      toast.success("Book granted successfully")
      setSelectedBookId("")
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, booksOwned: u.booksOwned + 1 } : u
      ))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Ban / Unban ────────────────────────────────────────────────────────────
  const handleBanToggle = async (user: AdminUser) => {
    const action = user.isBanned ? "unban" : "ban"
    const label = user.isBanned ? "unbanned" : "banned"

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, action }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? "Action failed")
      return
    }

    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, isBanned: !u.isBanned } : u
    ))
    toast.success(`${user.name} has been ${label}.`)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isMounted) return null

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 text-center md:text-left">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
            <span className="text-primary">MANAGE</span> USERS
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            {isLoading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""} in orbit`}
          </p>
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
            variant={filterType === "users" && filterTier === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterType("users")
              setFilterTier("all")
            }}
            className={`text-xs h-8 ${filterType === "users" && filterTier === "all" ? "" : "bg-transparent"}`}
          >
            All Users
          </Button>
          <Button
            variant={filterType === "dealers" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("dealers")}
            className={`text-xs h-8 ${filterType === "dealers" ? "" : "bg-transparent"}`}
          >
            Kane Dealers
          </Button>
          <Button
            variant={filterType === "users" && filterTier === "premium" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterType("users")
              setFilterTier("premium")
            }}
            className={`text-xs h-8 ${filterType === "users" && filterTier === "premium" ? "" : "bg-transparent"}`}
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
                {filterType === "dealers" ? (
                  <>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Dealer Code</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Discount</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Uses</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Join Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tier</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Library</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Last Active</th>
                  </>
                )}
                <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                // Skeleton rows
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-48 opacity-60" />
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell"><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="p-4"><div className="h-5 bg-muted rounded w-16" /></td>
                    <td className="p-4 hidden sm:table-cell"><div className="h-3 bg-muted rounded w-10" /></td>
                    <td className="p-4 hidden md:table-cell"><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="p-4 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className={`hover:bg-primary/5 transition-colors group ${user.isBanned ? "opacity-50" : ""}`}>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm md:text-base">{user.name}</span>
                        {user.role === "admin" && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Admin</span>
                        )}
                        {user.isBanned && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">Banned</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">{user.email}</span>
                    </div>
                  </td>

                  {filterType === "dealers" ? (
                    <>
                      <td className="p-4">
                        <DealerCodeCopy code={user.dealerInfo?.code || ""} />
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-display text-lg text-primary">{user.dealerInfo?.discount}%</span>
                      </td>
                      <td className="p-4 text-center">
                        {user.dealerInfo?.isActive ? (
                          <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase">Active</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground bg-muted/10 px-2 py-0.5 rounded border border-border font-bold uppercase">Inactive</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-sm">
                        {user.dealerInfo?.totalUses}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-xs text-muted-foreground hidden lg:table-cell">
                        {new Date(user.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded font-bold border flex items-center gap-1 w-fit ${user.plan === "premium"
                            ? "bg-primary/20 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border"
                            }`}
                        >
                          {user.plan === "premium" && <Crown className="w-2.5 h-2.5" />}
                          {user.plan}
                        </span>
                      </td>
                      <td className="p-4 text-sm hidden sm:table-cell">
                        <span className="font-medium">{user.booksOwned}</span>
                        <span className="text-xs text-muted-foreground ml-1">Volumes</span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">
                        {user.lastActive
                          ? new Date(user.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "Never"}
                      </td>
                    </>
                  )}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openManageDialog(user)}>
                            <Crown className="w-4 h-4 mr-2" />
                            Manage Subscription
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={user.isBanned ? "text-green-500 focus:text-green-500" : "text-destructive focus:text-destructive"}
                            onClick={() => handleBanToggle(user)}
                          >
                            {user.isBanned
                              ? <><ShieldCheck className="w-4 h-4 mr-2" />Unban User</>
                              : <><UserX className="w-4 h-4 mr-2" />Ban User</>
                            }
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

      {/* Manage User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] border-primary/20 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wider text-primary uppercase">Identity Modification</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Update clearance level and subscription tier for{" "}
              <span className="text-foreground font-bold italic">"{selectedUser?.name}"</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* Subscription Plan */}
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-xs uppercase tracking-widest text-primary font-bold">
                Subscription Tier
              </Label>
              <Select value={newPlan} onValueChange={(v) => setNewPlan(v as "free" | "premium")}>
                <SelectTrigger id="plan" className="w-full bg-background/50 border-border/50 h-12">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Standard (Free)</SelectItem>
                  <SelectItem value="premium">Elite (Book Club Access)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {newPlan === "premium"
                  ? "Grants access to exclusive forum sectors and monthly features."
                  : "Standard access to the public library catalog."}
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs uppercase tracking-widest text-yellow-500 font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Admin Role
              </Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "reader" | "admin")}>
                <SelectTrigger id="role" className="w-full bg-background/50 border-border/50 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader (Standard)</SelectItem>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {newRole === "admin"
                  ? "⚠️ Admins have unrestricted access to all data and admin panels."
                  : "Standard reader — no admin privileges."}
              </p>
            </div>

            {/* Gift a Book */}
            <div className="pt-6 border-t border-border/50 space-y-3">
              <Label className="text-xs uppercase tracking-widest text-secondary font-bold flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Manual Library Grant
              </Label>
              <div className="flex gap-2">
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger className="flex-1 bg-background/50 border-border/50 h-10">
                    <SelectValue placeholder="Choose a book to gift..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allBooks.map(book => (
                      <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!selectedBookId || isSaving}
                  onClick={handleGiftBook}
                  className="h-10 px-4"
                >
                  Grant Access
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                This adds the selected volume directly to the user's personal library.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
              Abort Mission
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || (newPlan === selectedUser?.plan && newRole === selectedUser?.role)}
              className="font-display tracking-widest w-full sm:w-auto"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              SYNC IDENTITY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
