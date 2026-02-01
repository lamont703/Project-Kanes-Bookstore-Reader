"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Check, Loader2, Sparkles, Book as BookIcon, Shirt, Gift, Tag, CreditCard } from "lucide-react"
import Image from "next/image"

const bundleBooks = [
    { id: "b1", title: "Somes 3", cover: "/Somes 3 Cover.webp" },
    { id: "b2", title: "Somes 1", cover: "/Somes 1 Cover.webp" },
    { id: "b3", title: "Flying With The Chrysiridiarhipheus 1", cover: "/Flying With The Chrysiridiarhipheus 1 Cover.webp" },
    { id: "b4", title: "Brute Syndicate 5", cover: "/Brute Syndicate 5 Cover.webp" },
    { id: "b5", title: "Brute Syndicate 1", cover: "/Brute Syndicate 1 Cover.webp" },
]

interface SubscriptionModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 1 | 2 | 3 | 4

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const [step, setStep] = useState<Step>(1)
    const [loading, setLoading] = useState(false)
    const [selectedBooks, setSelectedBooks] = useState<string[]>([])

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

    const updateFormData = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleNext = () => {
        if (step === 1) {
            // Basic validation
            if (!formData.name || !formData.email || !formData.address || !formData.tshirtSize) {
                // In a real app, use better validation feedback
                return
            }
            setStep(2)
        } else if (step === 2) {
            if (selectedBooks.length !== 2) {
                return
            }
            setStep(3)
        } else if (step === 3) {
            // Submit
            setLoading(true)
            setTimeout(() => {
                setLoading(false)
                setStep(4)
            }, 2000)
        }
    }

    const handleFinish = () => {
        // Set mock login state
        localStorage.setItem("komet_subscription_active", "true")

        onClose()
        // Hard refresh as requested
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
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => updateFormData("name", e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData("email", e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateFormData("phone", e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Input
                                    id="dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => updateFormData("dob", e.target.value)}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="address">Mailing Address</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => updateFormData("address", e.target.value)}
                                    placeholder="123 Cosmic Way, Galaxy City, GC 12345"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="tshirt">T-Shirt Size (for your free shirt!)</Label>
                                <Select value={formData.tshirtSize} onValueChange={(val) => updateFormData("tshirtSize", val)}>
                                    <SelectTrigger>
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
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-muted-foreground">
                                    Select <span className="text-primary font-bold">2 books</span> from our bundle collection to start your library.
                                    <br />
                                    Selected: {selectedBooks.length}/2
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {bundleBooks.map((book) => {
                                    const isSelected = selectedBooks.includes(book.id)
                                    return (
                                        <div
                                            key={book.id}
                                            className={`relative cursor-pointer group transition-all transform ${isSelected ? "ring-2 ring-primary scale-105" : "hover:scale-105 opacity-80 hover:opacity-100"
                                                }`}
                                            onClick={() => toggleBookSelection(book.id)}
                                        >
                                            <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-secondary/10">
                                                <Image
                                                    src={book.cover}
                                                    alt={book.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>

                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="mt-2 text-center">
                                                <p className="text-xs font-medium truncate px-1" title={book.title}>{book.title}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
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
                                    <Label htmlFor="ccName">Name on Card</Label>
                                    <Input id="ccName" placeholder="John Doe" value={formData.ccName} onChange={(e) => updateFormData("ccName", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ccNum">Card Number</Label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="ccNum" className="pl-10" placeholder="0000 0000 0000 0000" value={formData.ccNumber} onChange={(e) => updateFormData("ccNumber", e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiry">Expiry</Label>
                                        <Input id="expiry" placeholder="MM/YY" value={formData.ccExpiry} onChange={(e) => updateFormData("ccExpiry", e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cvc">CVC</Label>
                                        <Input id="cvc" placeholder="123" value={formData.ccCvc} onChange={(e) => updateFormData("ccCvc", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success Message */}
                    {step === 4 && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <Check className="w-12 h-12" />
                            </div>
                            <h3 className="font-display text-3xl tracking-wide">Welcome Aboard!</h3>
                            <p className="text-muted-foreground max-w-md mx-auto text-lg">
                                Your membership is now active. Your books have been added to your library and your welcome kit is on its way.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between items-center sm:gap-0 gap-4">
                    {step > 1 && step < 4 ? (
                        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}>
                            Back
                        </Button>
                    ) : (
                        <div /> // Spacer
                    )}

                    {step < 4 ? (
                        <Button onClick={handleNext} disabled={loading || (step === 2 && selectedBooks.length !== 2)}>
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
