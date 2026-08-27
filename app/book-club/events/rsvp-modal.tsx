"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, CalendarCheck } from "lucide-react"
import { useViewAsGuard } from "@/hooks/use-view-as-guard"
import { toast } from "sonner"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface RsvpModalProps {
    eventId: string
    eventTitle: string
    isPublic: boolean
    currentUser: User | null
    alreadyRsvped: boolean
}

export function RsvpModal({ eventId, eventTitle, isPublic, currentUser, alreadyRsvped: initialRsvped }: RsvpModalProps) {
    const supabase = useMemo(() => createClient(), [])
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [hasRsvped, setHasRsvped] = useState(initialRsvped)

    // Pre-fill from Supabase user metadata if available
    const [name, setName] = useState(
        (currentUser?.user_metadata?.full_name as string | undefined) ?? ""
    )
    const [email, setEmail] = useState(currentUser?.email ?? "")
    const [phone, setPhone] = useState(
        (currentUser?.user_metadata?.phone as string | undefined) ?? ""
    )

    const blockedByViewAs = useViewAsGuard()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentUser) {
            toast.error("Please log in to RSVP for this event.")
            return
        }

        // currentUser is the admin during a View As session, so this RSVP would
        // land on the admin's account while the screen shows the member's.
        if (blockedByViewAs("RSVPs are")) return

        if (!name.trim() || !email.trim()) {
            toast.error("Please fill in your name and email.")
            return
        }

        setIsLoading(true)

        const { error } = await supabase
            .from("event_rsvps")
            .insert({
                event_id: eventId,
                user_id: currentUser.id,
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                rsvp_status: "confirmed",
            })

        setIsLoading(false)

        if (error) {
            if (error.code === "23505") {
                // Unique constraint — already RSVP'd
                toast.info("You've already secured your spot for this event!")
                setHasRsvped(true)
                setOpen(false)
            } else {
                toast.error("Failed to confirm RSVP. Please try again.")
                console.error(error)
            }
            return
        }

        setIsSuccess(true)
        setHasRsvped(true)
        toast.success("RSVP Confirmed! See you there.")
    }

    const handleClose = () => {
        setOpen(false)
        setTimeout(() => {
            setIsSuccess(false)
        }, 300)
    }

    // If not logged in, show login prompt button
    if (!currentUser) {
        return (
            <Button asChild variant="outline" className="w-full">
                <Link href={`/login?redirect=/book-club/events`}>
                    Log in to RSVP
                </Link>
            </Button>
        )
    }

    // If already RSVP'd, show confirmed state (no dialog needed)
    if (hasRsvped) {
        return (
            <Button variant="outline" className="w-full text-green-400 border-green-400/30 bg-green-400/5 cursor-default" disabled>
                <CalendarCheck className="w-4 h-4 mr-2" />
                You're Going!
            </Button>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    RSVP Now
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 relative">
                            <Check className="w-10 h-10 text-primary" />
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-3xl font-display tracking-wider uppercase">Signal Locked</DialogTitle>
                            <DialogDescription className="text-base text-muted-foreground leading-relaxed px-4">
                                Your coordinates are confirmed! See you at{" "}
                                <strong>{eventTitle}</strong>.
                            </DialogDescription>
                        </div>
                        <div className="flex gap-4 w-full pt-4">
                            <Button onClick={handleClose} variant="outline" className="flex-1 uppercase tracking-widest text-xs h-11 font-bold">
                                Return
                            </Button>
                            <Button asChild className="flex-1 uppercase tracking-widest text-xs h-11 font-bold">
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>RSVP for {eventTitle}</DialogTitle>
                            <DialogDescription>
                                Secure your spot! We'll use your info to send event details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rsvp-name">Full Name</Label>
                                <Input
                                    id="rsvp-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rsvp-email">Email Address</Label>
                                <Input
                                    id="rsvp-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rsvp-phone">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input
                                    id="rsvp-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(555) 000-0000"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Confirming..." : "Confirm RSVP"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
