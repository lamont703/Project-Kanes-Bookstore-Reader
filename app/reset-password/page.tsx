"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

/** Matches the minimum the registration form already enforces. */
const MIN_PASSWORD_LENGTH = 8

/**
 * Set a new password after following a reset link.
 *
 * By the time anyone gets here /auth/callback has exchanged the emailed code for
 * a real session, so this is just an authenticated password change — no token is
 * handled, or even visible, on this page.
 *
 * Reachable only with that session. Someone who simply navigates here is told to
 * request a link rather than shown a form that cannot work.
 */
export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    const [checking, setChecking] = useState(true)
    const [hasSession, setHasSession] = useState(false)
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        let settled = false
        // First answer wins. Without this the backstop timer below fires after a
        // successful check and flips the page back to "link expired".
        const settle = (ok: boolean) => {
            if (cancelled || settled) return
            settled = true
            setHasSession(ok)
            setChecking(false)
        }

        /**
         * A link can arrive here two ways, and one of them is not ready yet.
         *
         * PKCE links were already exchanged by /auth/callback, so the session
         * cookie exists and getUser answers immediately. Implicit links arrive
         * with the tokens in the URL fragment, which supabase-js reads and trades
         * for a session ASYNCHRONOUSLY — call getUser alone and it can answer
         * "no user" before that finishes, and the page would tell someone
         * holding a perfectly good link that it had expired.
         *
         * So: listen for the client picking the fragment up, and only fall back
         * on getUser when there is no fragment to wait for.
         */
        async function resolve() {
            try {
                // Implicit-shape link: adopt the tokens explicitly rather than
                // leaving it to detectSessionInUrl, which the client is not
                // going to do — @supabase/ssr runs in PKCE mode, where that only
                // looks for a `code` in the query string and ignores a fragment.
                const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""))
                const access_token = fragment.get("access_token")
                const refresh_token = fragment.get("refresh_token")

                if (access_token && refresh_token) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    })

                    // Drop the tokens out of the address bar either way. They are
                    // credentials, and leaving them there puts them in browser
                    // history and in the Referer of anything the page links to.
                    window.history.replaceState(null, "", window.location.pathname)

                    // setSession returns the session it established, so there is
                    // nothing further to ask. Calling getUser here as well cost a
                    // second trip through supabase-js's auth lock, which the
                    // AuthProvider is already contending for on mount — the two
                    // deadlocked and the page sat on its spinner.
                    return settle(!error && Boolean(data.session))
                }

                // Otherwise /auth/callback already exchanged a PKCE code and the
                // session is in a cookie. getSession reads it locally; the real
                // check is server side, where updateUser refuses a bad token, so
                // this only decides which of two screens to draw.
                const { data } = await supabase.auth.getSession()
                settle(Boolean(data.session))
            } catch (e) {
                // Never leave the spinner up. Whatever went wrong, the honest
                // answer is "ask for another link".
                console.error("Could not verify the reset link:", e)
                settle(false)
            }
        }

        resolve()

        // Backstop for anything that hangs rather than rejecting — the auth lock
        // above times out at ten seconds, and a spinner with no end is the one
        // outcome this page must not have.
        const timer = window.setTimeout(() => settle(false), 12000)

        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [supabase])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
            return
        }
        if (password !== confirm) {
            setError("Passwords do not match.")
            return
        }

        setSaving(true)
        const { error: updateError } = await supabase.auth.updateUser({ password })

        if (updateError) {
            setSaving(false)
            setError(updateError.message)
            return
        }

        /**
         * Kick every other session.
         *
         * Someone resetting a password may be doing it because somebody else
         * got in. Changing the password alone would leave that other session
         * signed in and working, which defeats the point of the reset. 'others'
         * keeps this browser signed in so they land on the site, not the login
         * page.
         */
        const { error: signOutError } = await supabase.auth.signOut({ scope: "others" })
        if (signOutError) {
            // Not fatal — the password did change — but worth knowing about.
            console.error("Could not revoke other sessions:", signOutError.message)
        }

        setSaving(false)
        toast.success("Password updated. You're signed in.")
        router.push("/")
        router.refresh()
    }

    if (checking) {
        return (
            <div className="container mx-auto flex max-w-md items-center justify-center px-4 py-24">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!hasSession) {
        return (
            <div className="container mx-auto max-w-md px-4 py-16 md:py-24">
                <h1 className="font-display text-4xl uppercase tracking-wider md:text-5xl">
                    <span className="text-primary">LINK</span>{" "}
                    <span className="text-secondary">EXPIRED</span>
                </h1>
                <Alert variant="destructive" className="mt-6 border-destructive/20 bg-destructive/10">
                    <AlertTitle className="font-bold tracking-wide">NOTHING TO RESET</AlertTitle>
                    <AlertDescription>
                        This page needs a valid reset link. Links expire after an hour and can only
                        be used once — request a fresh one.
                    </AlertDescription>
                </Alert>
                <Button asChild className="mt-6 w-full py-6 font-display text-lg tracking-wider" size="lg">
                    <Link href="/forgot-password">REQUEST A NEW LINK</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-md px-4 py-16 md:py-24">
            <h1 className="font-display text-4xl uppercase tracking-wider md:text-5xl">
                <span className="text-primary">NEW</span>{" "}
                <span className="text-secondary">PASSWORD</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
                Choose a new password for your account. Signing in anywhere else will need the new
                one.
            </p>

            <Card className="mt-6 p-6">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {error && (
                        <Alert variant="destructive" className="border-destructive/20 bg-destructive/10">
                            <AlertDescription className="font-medium">{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground" htmlFor="new-password">
                            NEW PASSWORD
                        </label>
                        <Input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            At least {MIN_PASSWORD_LENGTH} characters.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground" htmlFor="confirm-password">
                            CONFIRM PASSWORD
                        </label>
                        <Input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full py-6 font-display text-lg tracking-wider"
                        size="lg"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                        {saving ? "UPDATING..." : "SET NEW PASSWORD"}
                    </Button>
                </form>
            </Card>
        </div>
    )
}
