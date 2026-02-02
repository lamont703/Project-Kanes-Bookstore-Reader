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
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Check className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl mb-2">You're In!</DialogTitle>
                            <DialogDescription>
                                Thanks for RSVPing to <strong>{eventTitle}</strong>. We've sent a confirmation to {email} with all the details.
                            </DialogDescription>
                        </div>
                        <Button onClick={handleClose} className="mt-4">
                            Close
                        </Button>
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
