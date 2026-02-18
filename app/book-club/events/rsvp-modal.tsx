"use client"

import { useState } from "react"
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
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface RsvpModalProps {
    eventTitle: string
}

export function RsvpModal({ eventTitle }: RsvpModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Form states
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false)
            setIsSuccess(true)
            toast.success("RSVP Confirmed! Check your email for details.")
        }, 1500)
    }

    const handleClose = () => {
        setOpen(false)
        // Reset state after a delay to allow animation to finish
        setTimeout(() => {
            setIsSuccess(false)
            setName("")
            setEmail("")
            setPhone("")
        }, 300)
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
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-fade-up">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 relative">
                            <Check className="w-10 h-10 text-primary" />
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-3xl font-display tracking-wider uppercase">Signal Locked</DialogTitle>
                            <DialogDescription className="text-base text-muted-foreground leading-relaxed px-4">
                                Your coordinates are confirmed! We've sent an encrypted brief to <strong>{email}</strong>. Prepare for the jump to <strong>{eventTitle}</strong>.
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
                                Secure your spot! Please provide your details below.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(555) 000-0000"
                                    required
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
