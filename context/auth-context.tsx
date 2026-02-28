"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { type User, type Session } from "@supabase/supabase-js"

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
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await fetchUserData(currentUser.id)
            } else {
                setProfile(null)
                setSubscription(null)
            }

            setIsLoading(false)
        }

        getInitialSession()

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await fetchUserData(currentUser.id)
            } else {
                setProfile(null)
                setSubscription(null)
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
