"use client"

import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export function BrowseFilters({ genres = [] }: { genres?: string[] }) {
    // "All" is a UI affordance, not a category, so it is not stored as one.
    const options = ["All", ...genres]
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const currentGenre = searchParams.get("genre") || "All"
    const searchQuery = searchParams.get("q") || ""
    const sortBy = searchParams.get("sort") || "title"

    function updateParams(updates: Record<string, string | null>) {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "All") {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })

        // Any change to the result set invalidates the current offset. Without
        // this, filtering while on page 30 lands on an empty page past the end.
        params.delete("page")

        startTransition(() => {
            router.push(`/browse?${params.toString()}`, { scroll: false })
        })
    }

    return (
        <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search books or authors..."
                        className="pl-10 bg-card"
                        defaultValue={searchQuery}
                        onChange={(e) => {
                            // Debounce or just update on enter
                            // For simplicity in this refactor, we'll update quickly
                            updateParams({ q: e.target.value || null })
                        }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
                    <select
                        className="bg-card border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={sortBy}
                        onChange={(e) => updateParams({ sort: e.target.value })}
                    >
                        <option value="title">Title: A-Z</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {options.map((genre) => (
                    <Button
                        key={genre}
                        variant={currentGenre === genre ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateParams({ genre })}
                        className={currentGenre === genre ? "" : "bg-transparent"}
                        disabled={isPending}
                    >
                        {genre}
                    </Button>
                ))}
            </div>
        </div>
    )
}
