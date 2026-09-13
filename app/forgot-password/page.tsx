"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { MailCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

/**
 * Ask for a password reset link.
 *
 * Supabase issues, emails, expires and single-uses the token; this page only
 * asks for the address. Nothing secret passes through the app, which is why this
 * is the flow to use rather than anything hand-rolled.
 */
function ForgotPasswordForm() {
    const searchParams = useSearchParams()
    const linkError = searchParams.get("error")
    const supabase = useMemo(() => createClient(), [])

    const [email, setEmail] = useState("")
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSending(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            // Through the callback rather than straight at the page: the link
            // carries a one-time code that has to be exchanged for a session on
            // the server before the reset form can do anything.
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })

        setSending(false)

        if (error) {
            // Supabase deliberately does NOT error on an unknown address, so
            // anything that lands here is a real fault — almost always the send
            // rate limit. Saying so is safe (it reveals nothing about who has an
            // account) and beats leaving someone waiting for an email that was
            // never sent.
            const tooMany = error.status === 429 || /rate|too many/i.test(error.message)
            setError(
                tooMany
                    ? "Too many reset emails requested. Please wait a little while and try again."
                    : `Could not send the reset email: ${error.message}`,
            )
            return
        }

        setSent(true)
    }

    return (
        <div className="container mx-auto max-w-md px-4 py-16 md:py-24">
            <h1 className="font-display text-4xl uppercase tracking-wider md:text-5xl">
                <span className="text-primary">RESET</span>{" "}
                <span className="text-secondary">PASSWORD</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
                Enter the email you signed up with and we&apos;ll send you a link to set a new
                password.
            </p>

            {linkError && !sent && (
                <Alert variant="destructive" className="mt-6 border-destructive/20 bg-destructive/10">
                    <AlertTitle className="font-bold tracking-wide">LINK NO LONGER VALID</AlertTitle>
                    <AlertDescription>
                        That reset link has expired or has already been used. Request a new one
                        below.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="mt-6 p-6">
                {sent ? (
                    <div className="space-y-4 text-center">
                        <MailCheck className="mx-auto size-10 text-secondary" />
                        <h2 className="font-display text-xl tracking-wide">CHECK YOUR INBOX</h2>
                        {/* Same message whether or not that address has an account:
                            answering differently would turn this form into a way to
                            find out who is registered. */}
                        <p className="text-sm text-muted-foreground">
                            If an account exists for <span className="text-foreground">{email}</span>,
                            a reset link is on its way. The link expires in one hour and can only be
                            used once.
                        </p>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/login">Back to login</Link>
                        </Button>
                    </div>
                ) : (
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <Alert variant="destructive" className="border-destructive/20 bg-destructive/10">
                                <AlertDescription className="font-medium">{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <label
                                className="text-sm font-medium text-muted-foreground"
                                htmlFor="forgot-email"
                            >
                                EMAIL
                            </label>
                            <Input
                                id="forgot-email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@komet.explorer"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full py-6 font-display text-lg tracking-wider"
                            size="lg"
                            disabled={sending}
                        >
                            {sending ? "SENDING..." : "SEND RESET LINK"}
                        </Button>
                        <p className="text-center text-sm">
                            <Link href="/login" className="text-muted-foreground hover:text-primary">
                                Back to login
                            </Link>
                        </p>
                    </form>
                )}
            </Card>
        </div>
    )
}

export default function ForgotPasswordPage() {
    return (
        <Suspense>
            <ForgotPasswordForm />
        </Suspense>
    )
}
