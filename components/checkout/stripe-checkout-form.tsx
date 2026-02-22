"use client"

import { useState } from "react"
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StripeCheckoutFormProps {
    onSuccess: (orderId: string) => void
    orderId: string
}

export function StripeCheckoutForm({ onSuccess, orderId }: StripeCheckoutFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) return

        setIsProcessing(true)

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
            },
            redirect: "if_required"
        })

        if (error) {
            toast.error(error.message || "An error occurred with your payment.")
            setIsProcessing(false)
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            toast.success("Payment successful!")
            onSuccess(orderId)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{
                layout: "tabs",
                theme: "night",
                variables: {
                    colorPrimary: "#E11D48", // Using primary color from theme
                }
            }} />
            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!stripe || isProcessing}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    "Confirm Payment"
                )}
            </Button>
        </form>
    )
}
