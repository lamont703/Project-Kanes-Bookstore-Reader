"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

/**
 * Contact form for the marketing host.
 *
 * Posts straight to the `contact-submit` Edge Function, which creates the
 * contact in GoHighLevel. Deliberately does not use the Supabase browser
 * client: the apex must stay session-free, and this endpoint is public.
 */

type State = "idle" | "sending" | "sent" | "error"

export function ContactForm() {
    const [state, setState] = React.useState<State>("idle")
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setState("sending")
        setError(null)

        const form = new FormData(event.currentTarget)
        const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-submit`

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
                },
                body: JSON.stringify({
                    name: form.get("name"),
                    email: form.get("email"),
                    phone: form.get("phone"),
                    message: form.get("message"),
                    website: form.get("website"), // honeypot
                }),
            })

            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError(body?.error ?? "Something went wrong. Please try again.")
                setState("error")
                return
            }
            setState("sent")
        } catch {
            setError("Could not reach the server. Please check your connection.")
            setState("error")
        }
    }

    if (state === "sent") {
        return (
            <div className="rounded-xl border border-orange-500/30 bg-orange-600/10 p-8 text-center">
                <h2 className="text-xl font-bold">Thanks — we got your message.</h2>
                <p className="mt-2 text-muted-foreground">
                    Someone from Kane&apos;s Komet Bookstore will get back to you soon.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" required autoComplete="name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">
                    Phone <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required rows={6} maxLength={5000} />
            </div>

            {/* Honeypot — hidden from users, catches naive bots. */}
            <div aria-hidden="true" className="hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {error && (
                <p role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )}

            <Button
                type="submit"
                size="lg"
                disabled={state === "sending"}
                className="bg-orange-600 hover:bg-orange-700"
            >
                {state === "sending" ? "Sending…" : "Send Message"}
            </Button>
        </form>
    )
}
