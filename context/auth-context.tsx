"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { type User, type Session, type AuthChangeEvent } from "@supabase/supabase-js"

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: any | null
    subscription: any | null
    isAdmin: boolean
    isPremium: boolean
    isLoading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<any | null>(null)
    const [subscription, setSubscription] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [supabase] = useState(() => createClient())
    const lastUserIdRef = useRef<string | null>(null)

    useEffect(() => {
        const fetchUserData = async (userId: string) => {
            const [profileRes, subRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', userId).single(),
                supabase.from('user_subscriptions').select('*').eq('user_id', userId).single()
            ])
            setProfile(profileRes.data)
            setSubscription(subRes.data)
        }

        const getInitialSession = async () => {
            console.group("🔐 Auth: Initial Session Check")
            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser()
                console.log("👤 Current User:", currentUser ? `${currentUser.id} (${currentUser.email})` : "None")
                setUser(currentUser)
                lastUserIdRef.current = currentUser?.id || null

                if (currentUser) {
                    const { data: { session } } = await supabase.auth.getSession()
                    console.log("🎟️ Session available:", !!session)
                    setSession(session)
                    await fetchUserData(currentUser.id)
                } else {
                    console.log("🚫 No active session found")
                    setSession(null)
                    setProfile(null)
                    setSubscription(null)
                }
            } catch (error) {
                console.error("❌ Session check failed:", error)
            } finally {
                setIsLoading(false)
                console.groupEnd()
            }
        }

        getInitialSession()

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            const nextUserId = session?.user?.id || null

            // Log only if it's a real transition to avoid flooding
            if (lastUserIdRef.current !== nextUserId) {
                console.log(`🔄 Auth Event: ${event}`, nextUserId ? `(New User: ${nextUserId})` : "(Logged Out)")
                setSession(session)
                setUser(session?.user ?? null)
                lastUserIdRef.current = nextUserId

                if (session?.user) {
                    await fetchUserData(session.user.id)
                } else {
                    setProfile(null)
                    setSubscription(null)
                }
            } else if (session?.access_token !== session?.access_token) {
                // Token refresh happened but user is the same
                setSession(session)
            }

            setIsLoading(false)
        })

        return () => {
            authSub.unsubscribe()
        }
    }, [supabase])

    const signOut = async () => {
        try {
            // Use local state clearing for immediate UI feedback
            setUser(null)
            setSession(null)
            setProfile(null)
            setSubscription(null)

            // Trigger Supabase sign out
            await supabase.auth.signOut()
        } catch (error) {
            console.error("Error in signOut:", error)
        }
    }

    const isAdmin = profile?.role === 'admin'
    const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active'

    return (
        <AuthContext.Provider value={{ user, session, profile, subscription, isAdmin, isPremium, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
