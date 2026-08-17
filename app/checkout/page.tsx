"use client"

import { useCart } from "@/context/cart-context"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { Check, Truck, Tag, Package, CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { StripeCheckoutForm } from "@/components/checkout/stripe-checkout-form"
import { STRIPE_PUBLISHABLE_KEY, assertStripeMode } from "@/lib/stripe-config"

assertStripeMode()
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

export default function CheckoutPage() {
    const { items, clearCart } = useCart()
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const supabase = useMemo(() => createClient(), [])
    const [isProcessing, setIsProcessing] = useState(false)
    const [orderComplete, setOrderComplete] = useState(false)
    const [orderId, setOrderId] = useState<string | null>(null)
    const [clientSecret, setClientSecret] = useState<string | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Redirect if not logged in (check Supabase auth)
    useEffect(() => {
        if (!isMounted) return
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login?redirect=/checkout&message=purchase")
            }
        }
        checkAuth()
    }, [router, supabase, isMounted])

    // Redirect if cart is empty (and not just completed)
    useEffect(() => {
        if (!isMounted) return
        if (items.length === 0 && !orderComplete) {
            router.push("/cart")
        }
    }, [items, router, orderComplete, isMounted])

    // Dealer Code State
    const [dealerCode, setDealerCode] = useState("")
    const [dealerCodeApplied, setDealerCodeApplied] = useState(false)
    const [dealerDiscount, setDealerDiscount] = useState(0)
    const [isApplyingCode, setIsApplyingCode] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        zip: "",
        country: "United States",
    })
    const [errors, setErrors] = useState<Record<string, boolean>>({})

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    // Check if any item requires shipping (physical items)
    const hasPhysicalItems = items.some(item => item.format !== "ebook")
    const FLAT_SHIPPING_RATE = 5.99

    const validate = () => {
        const newErrors: Record<string, boolean> = {}

        // Address validation — only required if physical items
        if (hasPhysicalItems) {
            if (!formData.firstName) newErrors.firstName = true
            if (!formData.lastName) newErrors.lastName = true
            if (!formData.address || formData.address.length < 5) newErrors.address = true
            if (!formData.city) newErrors.city = true
            if (!formData.zip || !/^\d{5}(-\d{4})?$/.test(formData.zip)) newErrors.zip = true
        }

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all shipping details correctly.")
            return false
        }
        return true
    }

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-8 md:py-12">
                    <div className="h-12 w-64 bg-muted animate-pulse rounded mb-8" />
                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-xl border border-border" />
                            <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-xl border border-border" />
                        </div>
                        <div className="h-[500px] w-full bg-muted/20 animate-pulse rounded-xl border border-border" />
                    </div>
                </div>
            </div>
        )
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const gst = total * 0.05
    const shipping = hasPhysicalItems ? FLAT_SHIPPING_RATE : 0
    const discountAmount = dealerCodeApplied ? total * (dealerDiscount / 100) : 0
    const finalTotal = total + gst + shipping - discountAmount

    // ── Dealer Code Validation (via API) ────────────────────
    const handleApplyDealerCode = async () => {
        if (!dealerCode.trim()) {
            toast.error("Please enter a dealer code")
            return
        }

        setIsApplyingCode(true)

        try {
            const res = await fetch("/api/validate-dealer-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: dealerCode }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || "Invalid dealer code.")
                return
            }

            setDealerCodeApplied(true)
            setDealerDiscount(data.discountPercent)
            toast.success(data.message)
        } catch {
            toast.error("Failed to validate dealer code. Please try again.")
        } finally {
            setIsApplyingCode(false)
        }
    }

    const handleRemoveDealerCode = () => {
        setDealerCode("")
        setDealerCodeApplied(false)
        setDealerDiscount(0)
        toast.success("Dealer code removed")
    }

    // ── Place Order (via API) ───────────────────────────────
    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        // Stripe USD minimum is $0.50. Prevent calling backend if we know it's too small.
        if (finalTotal > 0 && finalTotal < 0.50) {
            toast.error("Stripe requires a minimum purchase of $0.50. Please add more items to your cart.")
            return
        }

        setIsProcessing(true)

        try {
            const checkoutPayload = {
                items: items.map(item => ({
                    bookId: item.id,
                    variantId: item.variantId,
                    format: item.format,
                    quantity: item.quantity,
                })),
                promoCode: dealerCodeApplied ? dealerCode.trim().toUpperCase() : undefined,
                shippingAddress: hasPhysicalItems ? {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    address: formData.address,
                    city: formData.city,
                    zip: formData.zip,
                    country: formData.country,
                } : undefined,
            }

            // Call Supabase Edge Function via the official client
            const { data: { session } } = await supabase.auth.getSession()
            console.log('Current session for checkout:', session ? 'Valid' : 'None')

            const { data, error: functionError } = await supabase.functions.invoke('process-checkout', {
                body: checkoutPayload,
            })

            if (functionError) {
                // Try to parse the error message if it's JSON from our standardized errors
                let errorMessage = "Checkout failed. Please try again."
                try {
                    // supabase-js might return the error in functionError.context?.json
                    const errorDetails = functionError as any
                    if (errorDetails.context && typeof errorDetails.context.json === 'function') {
                        const json = await errorDetails.context.json()
                        errorMessage = json.error?.message || errorMessage
                    } else if (errorDetails.message) {
                        errorMessage = errorDetails.message
                    }
                } catch {
                    errorMessage = functionError.message || errorMessage
                }

                toast.error(errorMessage)
                return
            }

            // Success! We have a client secret and order ID
            setOrderId(data.orderId)

            if (data.isFree) {
                setOrderComplete(true)
                clearCart()
                toast.success("Order processed successfully!")
            } else {
                setClientSecret(data.clientSecret)
            }
        } catch (err) {
            console.error(err)
            toast.error("An unexpected error occurred. Please try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Check className="w-12 h-12" />
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-4">ORDER CONFIRMED!</h1>
                    {orderId && (
                        <p className="text-sm text-muted-foreground mb-2 font-mono">
                            Order #{orderId.slice(0, 8).toUpperCase()}
                        </p>
                    )}
                    <p className="text-xl text-muted-foreground max-w-lg mb-8">
                        {hasPhysicalItems
                            ? "Thank you for your purchase. Your physical items will be shipped to your galactic coordinates shortly. Digital items are available immediately."
                            : "Thank you for your purchase. Your digital items are now available in your dashboard!"
                        }
                    </p>
                    <div className="flex gap-4">
                        <Button size="lg" variant="outline" onClick={() => router.push("/dashboard")}>
                            Go to Dashboard
                        </Button>
                        <Button size="lg" onClick={() => router.push("/browse")}>
                            Continue Exploring
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />

            <div className="container mx-auto px-4 py-8 md:py-12">
                <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-8">
                    <span className="text-primary">SECURE</span> CHECKOUT
                </h1>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Column: Shipping & Payment */}
                    <div className="space-y-8">
                        {/* Shipping Details — only shown for physical items */}
                        {hasPhysicalItems ? (
                            <Card className="p-6">
                                <h2 className="font-display text-2xl tracking-wide mb-6 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-primary" /> Shipping Details
                                </h2>
                                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input
                                                id="firstName"
                                                placeholder="Jane"
                                                required
                                                value={formData.firstName}
                                                onChange={e => updateFormData("firstName", e.target.value)}
                                                className={errors.firstName ? "border-destructive/50 ring-destructive/20" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                placeholder="Doe"
                                                required
                                                value={formData.lastName}
                                                onChange={e => updateFormData("lastName", e.target.value)}
                                                className={errors.lastName ? "border-destructive/50 ring-destructive/20" : ""}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            placeholder="123 Cosmic Way"
                                            required
                                            value={formData.address}
                                            onChange={e => updateFormData("address", e.target.value)}
                                            className={errors.address ? "border-destructive/50 ring-destructive/20" : ""}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="city">City</Label>
                                            <Input
                                                id="city"
                                                placeholder="Nebula City"
                                                required
                                                value={formData.city}
                                                onChange={e => updateFormData("city", e.target.value)}
                                                className={errors.city ? "border-destructive/50 ring-destructive/20" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="zip">Zip / Postal Code</Label>
                                            <Input
                                                id="zip"
                                                placeholder="10001"
                                                required
                                                value={formData.zip}
                                                onChange={e => updateFormData("zip", e.target.value)}
                                                className={errors.zip ? "border-destructive/50 ring-destructive/20" : ""}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            placeholder="United States"
                                            required
                                            value={formData.country}
                                            onChange={e => updateFormData("country", e.target.value)}
                                        />
                                    </div>
                                </form>
                            </Card>
                        ) : (
                            <Card className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                        <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-display text-2xl tracking-wide">Digital Delivery</h2>
                                        <p className="text-sm text-muted-foreground">Your ebooks will be available instantly in your library after purchase.</p>
                                    </div>
                                </div>
                                {/* Hidden form for ebook-only checkout */}
                                <form id="checkout-form" onSubmit={handlePlaceOrder} className="hidden" />
                            </Card>
                        )}

                        <Card className="p-6">
                            <h2 className="font-display text-2xl tracking-wide mb-6">Payment Method</h2>
                            {!clientSecret ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Safe & Secure Payment</p>
                                            <p className="text-xs text-muted-foreground">Complete shipping & discount info to reveal encrypted Stripe payment portal.</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        Payments processed securely by Stripe
                                    </p>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            appearance: {
                                                theme: 'night',
                                                variables: {
                                                    colorPrimary: "#E11D48",
                                                }
                                            }
                                        }}
                                    >
                                        <StripeCheckoutForm
                                            orderId={orderId!}
                                            onSuccess={() => {
                                                setOrderComplete(true)
                                                clearCart()
                                            }}
                                        />
                                    </Elements>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-4 text-xs"
                                        onClick={() => setClientSecret(null)}
                                    >
                                        Change Shipping Details
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div>
                        <Card className="p-6 sticky top-24">
                            <h2 className="font-display text-2xl tracking-wide mb-6">In Your Cart</h2>

                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                {items.map((item) => (
                                    <div key={item.variantId} className="flex gap-4 items-start">
                                        <div className="relative w-12 aspect-[2/3] bg-muted rounded overflow-hidden flex-shrink-0">
                                            <Image
                                                src={item.coverImage}
                                                alt={item.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <p className="font-medium line-clamp-1">{item.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-secondary/20 text-secondary rounded border border-secondary/30">
                                                    {item.format.replace('_', ' ')}
                                                </span>
                                                {item.size && (
                                                    <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-muted text-muted-foreground rounded border border-border">
                                                        {item.size}
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground">x{item.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="font-medium">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Dealer Code Section */}
                            <div className="border-t pt-4 mb-4">
                                <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
                                    <Tag className="w-3 h-3" /> Dealer Code
                                </Label>
                                {dealerCodeApplied ? (
                                    <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-green-400">
                                                {dealerCode.toUpperCase()} — {dealerDiscount}% OFF
                                            </p>
                                            <p className="text-xs text-muted-foreground">-${discountAmount.toFixed(2)} saved</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={handleRemoveDealerCode} className="text-xs">
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter dealer code"
                                            value={dealerCode}
                                            onChange={(e) => setDealerCode(e.target.value)}
                                            className="text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault()
                                                    handleApplyDealerCode()
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleApplyDealerCode}
                                            disabled={isApplyingCode}
                                            className="flex-shrink-0"
                                        >
                                            {isApplyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                                {dealerCodeApplied && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Dealer Discount ({dealerDiscount}%)</span>
                                        <span>-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>{hasPhysicalItems ? `$${shipping.toFixed(2)}` : "Free (Digital)"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">GST (5%)</span>
                                    <span>${gst.toFixed(2)}</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-primary">${finalTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {!clientSecret && (
                                <Button
                                    type="submit"
                                    form="checkout-form"
                                    className="w-full mt-6"
                                    size="lg"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Initializing Secure Payment...
                                        </>
                                    ) : (
                                        "Continue to Payment"
                                    )}
                                </Button>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
