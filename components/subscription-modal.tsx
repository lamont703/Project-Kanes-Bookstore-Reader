"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Loader2, Sparkles, Book as BookIcon, Shirt, Gift, Tag, CreditCard, Crown, Users } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useAuth } from "@/context/auth-context"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
    const supabase = useMemo(() => createClient(), [])
    const router = useRouter()

    const [step, setStep] = useState<Step>(1)
    const [loading, setLoading] = useState(false)
    const [selectedBooks, setSelectedBooks] = useState<string[]>([])
    const [errors, setErrors] = useState<Record<string, boolean>>({})
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [showAuthPrompt, setShowAuthPrompt] = useState(false)
    const { user } = useAuth()

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
    })

    // Pre-fill from Supabase auth user on open
    useEffect(() => {
        if (!isOpen) return
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
            if (!user) return
            setFormData(prev => ({
                ...prev,
                name: (user.user_metadata?.full_name as string | undefined) ?? prev.name,
                email: user.email ?? prev.email,
                phone: (user.user_metadata?.phone as string | undefined) ?? prev.phone,
            }))
        })
    }, [isOpen, supabase])

    // Fetch real books when Step 2 opens
    useEffect(() => {
        if (step !== 2 || availableBooks.length > 0) return
        setBooksLoading(true)

        // Calculate age
        let isAdult = false
        if (formData.dob) {
            const birthDate = new Date(formData.dob)
            const today = new Date()
            let age = today.getFullYear() - birthDate.getFullYear()
            const m = today.getMonth() - birthDate.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--
            }
            isAdult = age >= 18
        }

        let query = supabase
            .from("books")
            .select("id, title, cover_image_url, is_age_restricted")
            .eq("status", "published")
            .eq("is_book_club_eligible", true)

        // Apply age restriction if user is not an adult
        if (!isAdult) {
            query = query.eq("is_age_restricted", false)
        }

        query.order("title")
            .limit(5)
            .then(({ data, error }: { data: any[] | null; error: any }) => {
                if (error) toast.error("Failed to load books")
                setAvailableBooks(data || [])
                setBooksLoading(false)
            })
    }, [step, availableBooks.length, supabase, formData.dob])

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

    const handleNext = async () => {
        if (!user) {
            setShowAuthPrompt(true)
            return
        }

        if (step === 1) {
            if (!validateStep1()) return
            setStep(2)
        } else if (step === 2) {
            if (selectedBooks.length !== 2) {
                toast.error("Please select exactly 2 books")
                return
            }

            setLoading(true)
            try {
                const { data, error: functionError } = await supabase.functions.invoke('create-subscription', {
                    body: {
                        fullName: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        mailingAddress: formData.address,
                        tshirtSize: formData.tshirtSize,
                        selectedBookIds: selectedBooks,
                    },
                })

                if (functionError) {
                    throw new Error(functionError.message || "Failed to prepare subscription")
                }

                setClientSecret(data.clientSecret)
                setStep(3)
            } catch (err: any) {
                toast.error(err.message)
            } finally {
                setLoading(false)
            }
        }
    }

    const handleFinish = () => {
        onClose()
        router.refresh()
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display tracking-wide text-center">
                        {showAuthPrompt ? "Authentication Required" : (
                            <>
                                {step === 1 && "Start Your Journey"}
                                {step === 2 && "Choose Your First Reads"}
                                {step === 3 && "Confirm Membership"}
                                {step === 4 && "Welcome to the Community!"}
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {showAuthPrompt ? "Please sign in to continue" : (
                            step < 4 ? `Step ${step} of 3` : "Membership Activated"
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {/* Auth Prompt */}
                    {showAuthPrompt && (
                        <div className="text-center space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-10 h-10" />
                            </div>
                            <h3 className="font-display text-2xl tracking-wide">Join the Inner Circle</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                You need to be logged in to subscribe to the Book Club and access exclusive member benefits.
                            </p>
                            <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
                                <Button onClick={() => router.push('/login')} className="w-full">
                                    Sign In / Register
                                </Button>
                                <Button variant="outline" onClick={() => setShowAuthPrompt(false)} className="w-full">
                                    Go Back
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 1: User Details */}
                    {!showAuthPrompt && step === 1 && (
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

                    {/* Step 2: Book Selection */}
                    {!showAuthPrompt && step === 2 && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-muted-foreground text-sm">
                                    Select <span className="text-primary font-bold">2 books</span> from our catalog to start your library.
                                    <br />
                                    Selected: {selectedBooks.length}/2
                                </p>
                            </div>

                            {booksLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto px-2">
                                    {availableBooks.map((book) => {
                                        const isSelected = selectedBooks.includes(book.id)
                                        const isDisabled = !isSelected && selectedBooks.length >= 2
                                        return (
                                            <div
                                                key={book.id}
                                                className={cn(
                                                    "relative cursor-pointer group transition-all transform mb-2",
                                                    isSelected ? "ring-2 ring-primary scale-105" : "",
                                                    isDisabled ? "opacity-40 pointer-events-none" : "hover:scale-105 opacity-80 hover:opacity-100"
                                                )}
                                                onClick={() => !isDisabled && toggleBookSelection(book.id)}
                                            >
                                                <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-secondary/10">
                                                    {book.cover_image_url ? (
                                                        <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" />
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
                                                <div className="mt-1 text-center text-[10px] font-medium line-clamp-1">{book.title}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Payment */}
                    {!showAuthPrompt && step === 3 && clientSecret && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="rounded-lg border border-border bg-card p-6">
                                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                                        <Sparkles className="text-primary w-5 h-5" /> Membership Includes
                                    </h3>
                                    <ul className="grid grid-cols-1 gap-y-3 gap-x-6 text-sm">
                                        <li className="flex items-center gap-2"><Shirt className="w-4 h-4 text-blue-400" /> Official Komet T-Shirt</li>
                                        <li className="flex items-center gap-2"><BookIcon className="w-4 h-4 text-green-400" /> 2 Free E-Books (Selected)</li>
                                        <li className="flex items-center gap-2"><Gift className="w-4 h-4 text-purple-400" /> Surprise Gift Item</li>
                                        <li className="flex items-center gap-2"><Tag className="w-4 h-4 text-orange-400" /> Kane Dealer Code (35% OFF)</li>
                                        <li className="flex items-center gap-2 font-medium">
                                            <Crown className="w-4 h-4 text-primary" /> Monthly E-Komet Book Access
                                        </li>
                                        <li className="flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Community Access</li>
                                    </ul>
                                </div>

                                <div className="rounded-lg border border-border bg-secondary/10 p-6">
                                    <div className="flex justify-between font-bold text-lg text-primary">
                                        <span>Total Today</span>
                                        <span>$49.99</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        Charged $49.99 today, then $3.99/month starting next month.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-display text-xl mb-4">Secure Payment</h3>
                                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                                    <SubscriptionStripeForm onCardsuccess={() => setStep(4)} />
                                </Elements>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {!showAuthPrompt && step === 4 && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-12 h-12" />
                            </div>
                            <h3 className="font-display text-3xl tracking-wide uppercase tracking-widest">Welcome Aboard!</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Your membership is now active. Your 2 free books have been added to your library.
                            </p>
                        </div>
                    )}
                </div>

                {!showAuthPrompt && (
                    <DialogFooter>
                        {step > 1 && step < 3 ? (
                            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={loading}>
                                Back
                            </Button>
                        ) : null}

                        {step < 3 ? (
                            <Button onClick={handleNext} disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Continue
                            </Button>
                        ) : step === 4 ? (
                            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                                Return to Club
                            </Button>
                        ) : null}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

function SubscriptionStripeForm({ onCardsuccess }: { onCardsuccess: () => void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) return
        setLoading(true)

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.origin}/book-club` },
            redirect: "if_required",
        })

        if (error) {
            toast.error(error.message || "Payment failed")
        } else if (paymentIntent?.status === "succeeded") {
            toast.success("Payment successful!")
            onCardsuccess()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <Button type="submit" className="w-full" disabled={!stripe || loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Complete Membership"}
            </Button>
        </form>
    )
}
