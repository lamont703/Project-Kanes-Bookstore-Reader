"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, Loader2, Search, X, Crown, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useViewAs } from "@/context/view-as-context"
import { useDebounce } from "@/hooks/use-debounce"
import type { UserRole } from "@/lib/roles"

interface MemberOption {
    id: string
    name: string
    email: string
    plan: "free" | "premium"
    role: UserRole
}

/**
 * The admin sidebar's "View As" picker.
 *
 * Reuses /api/admin/users for the member list — the same admin-gated endpoint
 * the Manage Users table reads — rather than querying Supabase from the browser,
 * because the members table is not readable under the admin's RLS grant.
 */
export function ViewAsSelect({ onNavigate }: { onNavigate?: () => void }) {
    const { viewingAs, isSwitching, startViewAs, stopViewAs } = useViewAs()
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [members, setMembers] = useState<MemberOption[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const debouncedQuery = useDebounce(query, 300)

    const fetchMembers = useCallback(async (q: string) => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (q) params.set("q", q)
            const res = await fetch(`/api/admin/users?${params}`)
            if (!res.ok) throw new Error("Failed to load members")
            const { users } = (await res.json()) as { users: any[] }
            setMembers(
                (users ?? []).map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    plan: u.plan,
                    role: u.role,
                }))
            )
        } catch {
            toast.error("Could not load the member list.")
            setMembers([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Only fetch once the picker is actually open — the sidebar renders on every
    // admin page and this list is otherwise dead weight on each one.
    useEffect(() => {
        if (!isOpen) return
        fetchMembers(debouncedQuery)
    }, [isOpen, debouncedQuery, fetchMembers])

    const selectable = useMemo(
        () => members.filter((m) => m.id !== viewingAs?.id),
        [members, viewingAs]
    )

    const handleSelect = async (member: MemberOption) => {
        onNavigate?.()
        const result = await startViewAs(member.id)
        if (!result.ok) toast.error(result.error ?? "Could not start the view.")
    }

    // Already impersonating: the sidebar is only reachable by re-entering /admin
    // mid-session, so the useful control here is the way out.
    if (viewingAs) {
        return (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                    <Eye className="h-3 w-3" />
                    Viewing As
                </span>
                <div className="min-w-0">
                    <span className="block truncate text-sm font-bold">{viewingAs.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                        {viewingAs.email}
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-yellow-500/40 bg-transparent text-xs"
                    disabled={isSwitching}
                    onClick={() => stopViewAs("/admin/users")}
                >
                    {isSwitching ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <X className="mr-2 h-3.5 w-3.5" />
                    )}
                    Exit View
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <Button
                variant="ghost"
                className="w-full justify-between bg-transparent px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
            >
                <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View As
                </span>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {isOpen && (
                <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search members..."
                            className="h-8 bg-card pl-8 text-xs"
                        />
                    </div>

                    <div className="max-h-56 space-y-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : selectable.length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted-foreground">
                                No members found
                            </p>
                        ) : (
                            selectable.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelect(member)}
                                    disabled={isSwitching}
                                    className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10 disabled:opacity-50"
                                >
                                    <span className="flex w-full items-center gap-1.5">
                                        <span className="truncate text-xs font-medium">
                                            {member.name}
                                        </span>
                                        {member.plan === "premium" && (
                                            <Crown className="h-2.5 w-2.5 shrink-0 text-primary" />
                                        )}
                                        {member.role !== "reader" && (
                                            <span
                                                className={`shrink-0 text-[8px] font-bold uppercase tracking-widest ${
                                                    member.role === "admin" ? "text-yellow-500" : "text-sky-400"
                                                }`}
                                            >
                                                {member.role}
                                            </span>
                                        )}
                                    </span>
                                    <span className="w-full truncate text-[10px] text-muted-foreground">
                                        {member.email}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    <p className="px-1 pb-1 text-[10px] leading-relaxed text-muted-foreground">
                        Opens the site as that member, read-only. Exit from the badge in the
                        corner.
                    </p>
                </div>
            )}
        </div>
    )
}
