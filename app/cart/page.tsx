"use client"

import { useCart } from "@/context/cart-context"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function CartPage() {
    const { items, removeFromCart, clearCart } = useCart()
    const router = useRouter()

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const gst = total * 0.05
    const finalTotal = total + gst

    const handleCheckout = () => {
        const isLoggedIn = localStorage.getItem("komet_subscription_active") === "true"
        if (isLoggedIn) {
            router.push("/checkout")
        } else {
            router.push("/login?redirect=/cart&message=purchase")
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />

            <div className="container mx-auto px-4 py-8 md:py-12">
                <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-8">
                    <span className="text-primary">YOUR</span> CART
                </h1>

                {items.length === 0 ? (
                    <div className="text-center py-16 space-y-6">
                        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Looks like you haven't added any books yet. Check out our collection to find your next adventure.
                        </p>
                        <Button size="lg" asChild>
                            <Link href="/browse">Browse Books</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items List */}
                        <div className="lg:col-span-2 space-y-6">
                            {items.map((item) => (
                                <Card key={item.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <div className="relative w-24 aspect-[2/3] bg-muted rounded overflow-hidden flex-shrink-0">
                                        <Image
                                            src={item.coverImage}
                                            alt={item.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <h3 className="font-display text-xl tracking-wide">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                                        <p className="font-medium text-primary">${item.price.toFixed(2)}</p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </Card>
                            ))}

                            <div className="flex justify-between items-center pt-4">
                                <Button variant="outline" asChild>
                                    <Link href="/browse">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Continue Shopping
                                    </Link>
                                </Button>
                                <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={clearCart}>
                                    Clear Cart
                                </Button>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <Card className="p-6 sticky top-24">
                                <h3 className="font-display text-2xl tracking-wide mb-6">Order Summary</h3>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Calculated GST (5%)</span>
                                        <span>${gst.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span className="text-primary">${finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button className="w-full mt-6" size="lg" onClick={handleCheckout}>
                                    Proceed to Checkout
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-4">
                                    Secure checkout powered by Stripe
                                </p>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
