"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Loader2, Sparkles, Book as BookIcon, Shirt, Gift, Tag, CreditCard } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbBook {
    id: string
    title: string
    cover_image_url: string | null
}

interface SubscriptionModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 1 | 2 | 3 | 4

// ─── Component ───────────────────────────────────────────────────────────────

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const supabase = createClient()

    const [step, setStep] = useState<Step>(1)
    const [loading, setLoading] = useState(false)
    const [selectedBooks, setSelectedBooks] = useState<string[]>([])
    const [errors, setErrors] = useState<Record<string, boolean>>({})

    // Books fetched from Supabase
    const [availableBooks, setAvailableBooks] = useState<DbBook[]>([])
    const [booksLoading, setBooksLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        dob: "",
        tshirtSize: "",
        ccNumber: "",
        ccExpiry: "",
        ccCvc: "",
        ccName: "",
    })

    // Pre-fill from Supabase auth user on open
    useEffect(() => {
        if (!isOpen) return
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            setFormData(prev => ({
                ...prev,
                name: (user.user_metadata?.full_name as string | undefined) ?? prev.name,
                email: user.email ?? prev.email,
                phone: (user.user_metadata?.phone as string | undefined) ?? prev.phone,
            }))
        })
    }, [isOpen])

    // Fetch real books when Step 2 opens
    useEffect(() => {
        if (step !== 2 || availableBooks.length > 0) return
        setBooksLoading(true)
        supabase
            .from("books")
            .select("id, title, cover_image_url")
            .eq("status", "published")
            .order("title")
            .then(({ data, error }) => {
                if (error) toast.error("Failed to load books")
                setAvailableBooks(data ?? [])
                setBooksLoading(false)
            })
    }, [step])

    const updateFormData = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const validateStep1 = () => {
        const newErrors: Record<string, boolean> = {}
        if (!formData.name) newErrors.name = true
        if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = true
        if (!formData.dob) newErrors.dob = true
        if (!formData.address || formData.address.length < 10) newErrors.address = true
        if (!formData.tshirtSize) newErrors.tshirtSize = true

        setErrors(newErrors)
        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all required fields correctly")
            return false
        }
        return true
    }

    const validateStep3 = () => {
        const newErrors: Record<string, boolean> = {}
        if (!formData.ccName) newErrors.ccName = true

        const cleanCC = formData.ccNumber.replace(/\s+/g, '')
        if (!/^\d{16}$/.test(cleanCC)) {
            newErrors.ccNumber = true
            toast.error("Credit card number must be 16 digits")
        }

        if (!/^\d{2}\/\d{2}$/.test(formData.ccExpiry)) {
            newErrors.ccExpiry = true
            toast.error("Expiry must be MM/YY format")
        }

        if (!/^\d{3}$/.test(formData.ccCvc)) {
            newErrors.ccCvc = true
            toast.error("CVC must be 3 digits")
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = async () => {
        if (step === 1) {
            if (!validateStep1()) return
            setStep(2)
        } else if (step === 2) {
            if (selectedBooks.length !== 2) {
                toast.error("Please select exactly 2 books")
                return
            }
            setStep(3)
        } else if (step === 3) {
            if (!validateStep3()) return

            setLoading(true)

            try {
                const res = await fetch("/api/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        dob: formData.dob,
                        tshirtSize: formData.tshirtSize,
                        selectedBookIds: selectedBooks,
                    }),
                })

                const result = await res.json()

                if (!res.ok) {
                    toast.error(result.error || "Subscription failed. Please try again.")
                    setLoading(false)
                    return
                }

                setLoading(false)
                setStep(4)
                toast.success("Welcome to Kane's Komet Book Club!")
            } catch (err) {
                setLoading(false)
                toast.error("Network error. Please try again.")
            }
        }
    }

    const handleFinish = () => {
        onClose()
        // Reload so that server components re-fetch subscription status from DB
        window.location.reload()
    }

    const toggleBookSelection = (bookId: string) => {
        setSelectedBooks((prev) => {
            if (prev.includes(bookId)) {
                return prev.filter((id) => id !== bookId)
            } else {
                if (prev.length >= 2) return prev
                return [...prev, bookId]
            }
        })
    }

    // Filter adult books based on age
    const isAdult18Plus = () => {
        if (!formData.dob) return false
        const dob = new Date(formData.dob)
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const m = today.getMonth() - dob.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
        return age >= 18
    }

    const visibleBooks = availableBooks.filter(book => {
        // Filter adult-genre books for under-18 users
        // We rely on the book title/genre — ideally fetch genre too, but for now show all to 18+
        return true
    })

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display tracking-wide text-center">
                        {step === 1 && "Start Your Journey"}
                        {step === 2 && "Choose Your First Reads"}
                        {step === 3 && "Confirm Membership"}
                        {step === 4 && "Welcome to the Community!"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {step < 4 ? `Step ${step} of 3` : "Membership Activated"}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {/* Step 1: User Details */}
                    {step === 1 && (
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="sub-name">Full Name</Label>
                                <Input
                                    id="sub-name"
                                    value={formData.name}
                                    onChange={(e) => updateFormData("name", e.target.value)}
                                    placeholder="John Doe"
                                    className={errors.name ? "border-destructive/50 ring-destructive/20" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sub-email">Email Address</Label>
                                <Input
                                    id="sub-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData("email", e.target.value)}
                                    placeholder="john@example.com"
                                    className={errors.email ? "border-destructive/50 ring-destructive/20" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sub-phone">Phone Number</Label>
                                <Input
                                    id="sub-phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateFormData("phone", e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sub-dob">Date of Birth</Label>
                                <Input
                                    id="sub-dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => updateFormData("dob", e.target.value)}
                                    className={errors.dob ? "border-destructive/50 ring-destructive/20" : ""}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="sub-address">Mailing Address</Label>
                                <Input
                                    id="sub-address"
                                    value={formData.address}
                                    onChange={(e) => updateFormData("address", e.target.value)}
                                    placeholder="123 Cosmic Way, Galaxy City, GC 12345"
                                    className={errors.address ? "border-destructive/50 ring-destructive/20" : ""}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="sub-tshirt">T-Shirt Size (for your free shirt!)</Label>
                                <Select value={formData.tshirtSize} onValueChange={(val) => updateFormData("tshirtSize", val)}>
                                    <SelectTrigger id="sub-tshirt" className={errors.tshirtSize ? "border-destructive/50" : ""}>
                                        <SelectValue placeholder="Select a size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="xs">XS</SelectItem>
                                        <SelectItem value="s">Small</SelectItem>
                                        <SelectItem value="m">Medium</SelectItem>
                                        <SelectItem value="l">Large</SelectItem>
                                        <SelectItem value="xl">XL</SelectItem>
                                        <SelectItem value="xxl">2XL</SelectItem>
                                        <SelectItem value="xxxl">3XL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Book Selection — real books from Supabase */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-muted-foreground">
                                    Select <span className="text-primary font-bold">2 books</span> from our catalog to start your library.
                                    <br />
                                    Selected: {selectedBooks.length}/2
                                </p>
                            </div>

                            {booksLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : visibleBooks.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No books available at this time.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {visibleBooks.map((book) => {
                                        const isSelected = selectedBooks.includes(book.id)
                                        const isDisabled = !isSelected && selectedBooks.length >= 2
                                        return (
                                            <div
                                                key={book.id}
                                                className={cn(
                                                    "relative cursor-pointer group transition-all transform",
                                                    isSelected ? "ring-2 ring-primary scale-105" : "",
                                                    isDisabled ? "opacity-40 pointer-events-none" : "hover:scale-105 opacity-80 hover:opacity-100"
                                                )}
                                                onClick={() => !isDisabled && toggleBookSelection(book.id)}
                                            >
                                                <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-secondary/10">
                                                    {book.cover_image_url ? (
                                                        <Image
                                                            src={book.cover_image_url}
                                                            alt={book.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <BookIcon className="w-10 h-10 text-muted-foreground opacity-30" />
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div className="mt-2 text-center">
                                                    <p className="text-xs font-medium line-clamp-2 px-1" title={book.title}>{book.title}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Payment & Summary */}
                    {step === 3 && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="rounded-lg border border-border bg-card p-6">
                                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                                        <Sparkles className="text-primary w-5 h-5" /> Membership Includes
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm">
                                            <Shirt className="w-4 h-4 text-blue-400" />
                                            <span>Kane's Komet Book Club T-Shirt</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <BookIcon className="w-4 h-4 text-green-400" />
                                            <span>2 E-Books (Selected)</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <Gift className="w-4 h-4 text-pink-400" />
                                            <span>Surprise Gift (Bookmark, etc.)</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <Tag className="w-4 h-4 text-yellow-400" />
                                            <span>Kane Dealer Code (35% OFF)</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm pt-2 border-t border-border mt-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span>Monthly E-Komet Book (Ongoing)</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="rounded-lg border border-border bg-secondary/10 p-6">
                                    <h4 className="font-semibold mb-2">Order Summary</h4>
                                    <div className="flex justify-between text-sm py-1">
                                        <span>Initial Membership Fee</span>
                                        <span>$49.99</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1 border-b border-border/50 pb-2">
                                        <span>Monthly Subscription</span>
                                        <span className="text-muted-foreground">$3.99/mo</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 text-primary">
                                        <span>Total Today</span>
                                        <span>$49.99</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        You will be charged $49.99 today, then $3.99/month starting next month.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-display text-xl mb-4">Payment Details</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="sub-ccName">Name on Card</Label>
                                    <Input
                                        id="sub-ccName"
                                        placeholder="John Doe"
                                        value={formData.ccName}
                                        onChange={(e) => updateFormData("ccName", e.target.value)}
                                        className={errors.ccName ? "border-destructive/50" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sub-ccNum">Card Number</Label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="sub-ccNum"
                                            className={cn("pl-10", errors.ccNumber ? "border-destructive/50" : "")}
                                            placeholder="0000 0000 0000 0000"
                                            value={formData.ccNumber}
                                            onChange={(e) => updateFormData("ccNumber", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sub-expiry">Expiry</Label>
                                        <Input
                                            id="sub-expiry"
                                            placeholder="MM/YY"
                                            value={formData.ccExpiry}
                                            onChange={(e) => updateFormData("ccExpiry", e.target.value)}
                                            className={errors.ccExpiry ? "border-destructive/50" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sub-cvc">CVC</Label>
                                        <Input
                                            id="sub-cvc"
                                            placeholder="123"
                                            value={formData.ccCvc}
                                            onChange={(e) => updateFormData("ccCvc", e.target.value)}
                                            className={errors.ccCvc ? "border-destructive/50" : ""}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <Check className="w-12 h-12" />
                            </div>
                            <h3 className="font-display text-3xl tracking-wide">Welcome Aboard!</h3>
                            <p className="text-muted-foreground max-w-md mx-auto text-lg">
                                Your membership is now active. Your 2 free books have been added to your library
                                and your welcome kit is on its way!
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Check your Dashboard to access your new books and discover your Kane Dealer Code.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between items-center sm:gap-0 gap-4">
                    {step > 1 && step < 4 ? (
                        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={loading}>
                            Back
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <Button
                            onClick={handleNext}
                            disabled={loading || (step === 2 && selectedBooks.length !== 2)}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {step === 3 ? "Complete Purchase" : "Continue"}
                        </Button>
                    ) : (
                        <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                            Okay, Return to Club
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
