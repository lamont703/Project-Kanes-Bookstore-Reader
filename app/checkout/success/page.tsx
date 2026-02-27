"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function CheckoutSuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const orderId = searchParams.get('orderId')
    const paymentIntent = searchParams.get('payment_intent')

    useEffect(() => {
        async function verifyPayment() {
            if (!orderId) {
                setStatus('error')
                return
            }

            const { data: order, error } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single()

            if (error || !order) {
                setStatus('error')
            } else if (order.status === 'confirmed' || order.status === 'fulfilled') {
                setStatus('success')
            } else {
                setStatus('success')
            }
        }

        verifyPayment()
    }, [orderId, supabase])

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h1 className="font-display text-2xl tracking-widest">VERIFYING PAYMENT...</h1>
                </div>
            </div>
        )
    }

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
                    Thank you for your purchase. Your digital items are now available in your dashboard, and physical items are being prepared for shipment.
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

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h1 className="font-display text-2xl tracking-widest">LOADING...</h1>
                </div>
            </div>
        }>
            <CheckoutSuccessContent />
        </Suspense>
    )
}
