"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { BookOpen, Crown, Gift, ShoppingBag, Sparkles, Loader2, AlertTriangle } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface LibraryItem {
    id: string
    bookId: string
    title: string
    author: string | null
    coverImage: string | null
    productType: string | null
    source: "purchase" | "subscription_signup" | "book_club_monthly" | "admin_gift"
    acquiredAt: string
}

interface Choice {
    bookId: string
    title: string | null
    inLibrary: boolean
}

/** How each library entry got there, in the words an admin would use. */
const SOURCE = {
    purchase: { label: "Purchased", icon: ShoppingBag, className: "text-green-500 border-green-500/20 bg-green-500/10" },
    subscription_signup: { label: "Book Club pick", icon: Crown, className: "text-primary border-primary/20 bg-primary/10" },
    book_club_monthly: { label: "Monthly selection", icon: Sparkles, className: "text-secondary border-secondary/20 bg-secondary/10" },
    admin_gift: { label: "Granted by admin", icon: Gift, className: "text-sky-400 border-sky-400/20 bg-sky-400/10" },
} as const

/**
 * Read-only view of one member's library.
 *
 * Separate from the Identity Modification dialog on purpose: that one exists to
 * change things, this one only answers "what do they have?" — most often "which
 * two books did they pick when they joined the book club?", which nothing in the
 * admin surfaced before.
 */
export function UserLibraryDialog({
    userId,
    userName,
    open,
    onOpenChange,
}: {
    userId: string | null
    userName: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const [items, setItems] = useState<LibraryItem[]>([])
    const [choices, setChoices] = useState<Choice[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async (id: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/users/${id}/library`)
            if (!res.ok) throw new Error((await res.json()).error ?? "Could not load the library")
            const data = await res.json()
            setItems(data.items ?? [])
            setChoices(data.choices ?? [])
        } catch (err: any) {
            setError(err.message)
            setItems([])
            setChoices([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!open || !userId) return
        load(userId)
    }, [open, userId, load])

    // A pick that is not in the library means the book was deleted from the
    // catalogue: user_library cascades on book delete, the recorded choice does
    // not. Worth calling out rather than showing a short list with no reason.
    const brokenChoices = choices.filter((c) => !c.inLibrary)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] border-primary/20 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-3xl tracking-wider text-primary uppercase">
                        Library
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Everything in{" "}
                        <span className="font-bold italic text-foreground">{userName}</span>&apos;s
                        collection, and how it got there.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : error ? (
                    <p className="py-12 text-center text-sm text-destructive">{error}</p>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="flex items-baseline gap-2">
                            <span className="font-display text-4xl text-primary">{items.length}</span>
                            <span className="text-xs uppercase tracking-widest text-muted-foreground">
                                volume{items.length === 1 ? "" : "s"}
                            </span>
                        </div>

                        {brokenChoices.length > 0 && (
                            <div className="flex gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                                <div className="text-xs leading-relaxed">
                                    <p className="font-bold text-yellow-500">
                                        {brokenChoices.length} book club pick
                                        {brokenChoices.length === 1 ? "" : "s"} missing from this library
                                    </p>
                                    <p className="text-muted-foreground">
                                        {userName} chose {choices.length} book
                                        {choices.length === 1 ? "" : "s"} at signup, but{" "}
                                        {brokenChoices.length === 1 ? "one is" : "they are"} no longer
                                        held. Deleting a book removes it from every library it was in,
                                        so this usually means the title was deleted from the catalogue.
                                        {brokenChoices.some((c) => c.title) && (
                                            <>
                                                {" "}
                                                Still in the catalogue:{" "}
                                                {brokenChoices
                                                    .filter((c) => c.title)
                                                    .map((c) => c.title)
                                                    .join(", ")}
                                                .
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                This library is empty.
                            </p>
                        ) : (
                            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                                {items.map((item) => {
                                    const meta = SOURCE[item.source] ?? {
                                        label: item.source,
                                        icon: BookOpen,
                                        className: "text-muted-foreground border-border bg-muted/20",
                                    }
                                    const Icon = meta.icon
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-2"
                                        >
                                            <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                                                {item.coverImage && (
                                                    <Image
                                                        src={item.coverImage}
                                                        alt=""
                                                        width={80}
                                                        height={112}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{item.title}</p>
                                                {item.author && (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {item.author}
                                                    </p>
                                                )}
                                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {new Date(item.acquiredAt).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                            <span
                                                className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.className}`}
                                            >
                                                <Icon className="h-2.5 w-2.5" />
                                                {meta.label}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
