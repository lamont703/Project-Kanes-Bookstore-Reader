"use client"

import { useCart } from "@/context/cart-context"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Check, Truck } from "lucide-react"

export default function CheckoutPage() {
    const { items, clearCart } = useCart()
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)
    const [orderComplete, setOrderComplete] = useState(false)

    // Redirect if not logged in
    useEffect(() => {
        const isLoggedIn = localStorage.getItem("komet_subscription_active") === "true"
        if (!isLoggedIn) {
            router.push("/login?redirect=/checkout&message=purchase")
        }
    }, [router])

    // Redirect if cart is empty (and not just verified)
    useEffect(() => {
        if (items.length === 0 && !orderComplete) {
            router.push("/cart")
        }
    }, [items, router, orderComplete])

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const gst = total * 0.05
    const shipping = 5.99 // Standard shipping
    const finalTotal = total + gst + shipping

    const handlePlaceOrder = (e: React.FormEvent) => {
        e.preventDefault()
        setIsProcessing(true)

        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false)
            setOrderComplete(true)
            clearCart()
        }, 2000)
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
                    <p className="text-xl text-muted-foreground max-w-lg mb-8">
                        Thank you for your purchase. Your items will be shipped to your galactic coordinates shortly.
                    </p>
                    <Button size="lg" onClick={() => router.push("/browse")}>
                        Continue Exploring
                    </Button>
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
                        <Card className="p-6">
                            <h2 className="font-display text-2xl tracking-wide mb-6 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" /> Shipping Details
                            </h2>
                            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" placeholder="Jane" required defaultValue="Jane" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" placeholder="Doe" required defaultValue="Doe" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" placeholder="123 Cosmic Way" required defaultValue="123 Cosmic Way" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input id="city" placeholder="Nebula City" required defaultValue="Nebula City" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="zip">Zip / Postal Code</Label>
                                        <Input id="zip" placeholder="10001" required defaultValue="10001" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input id="country" placeholder="United States" required defaultValue="United States" />
                                </div>
                            </form>
                        </Card>

                        <Card className="p-6">
                            <h2 className="font-display text-2xl tracking-wide mb-6">Payment Method</h2>
                            <div className="p-4 border rounded-lg bg-card/50 text-muted-foreground text-sm">
                                Mock Payment Integration (Card ending in 4242)
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div>
                        <Card className="p-6 sticky top-24">
                            <h2 className="font-display text-2xl tracking-wide mb-6">In Your Cart</h2>

                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-start">
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
                                            <p className="text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <div className="font-medium">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>${shipping.toFixed(2)}</span>
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

                            <Button
                                type="submit"
                                form="checkout-form"
                                className="w-full mt-6"
                                size="lg"
                                disabled={isProcessing}
                            >
                                {isProcessing ? "Processing..." : "Place Order"}
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
