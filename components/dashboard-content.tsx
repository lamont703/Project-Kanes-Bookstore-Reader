"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LibraryBookCard } from "@/components/library-book-card"
import { BookOpen, Package, User, CreditCard, ChevronRight, Clock } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { createClient } from "@/lib/supabase/client"
import React from "react"

interface DashboardContentProps {
    initialUser: any
    initialLibrary: any[]
    initialOrders: any[]
    initialSubscription: any
}

export function DashboardContent({
    initialUser,
    initialLibrary,
    initialOrders,
    initialSubscription
}: DashboardContentProps) {
    const [isSaving, setIsSaving] = useState(false)
    const { user: authUser } = useAuth()
    const supabase = createClient()
    const [profile, setProfile] = useState(initialUser || {
        full_name: '',
        display_name: '',
        phone: '',
        mailing_address: '',
        date_of_birth: '',
        tshirt_size: ''
    })

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        const { error } = await supabase
            .from('users')
            .update({
                full_name: profile.full_name,
                display_name: profile.display_name,
                phone: profile.phone,
                mailing_address: profile.mailing_address,
                date_of_birth: profile.date_of_birth,
                tshirt_size: profile.tshirt_size,
                updated_at: new Date().toISOString()
            })
            .eq('id', authUser?.id)

        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Identity synchronized!")
        }
        setIsSaving(false)
    }

    const mostRecentOrder = initialOrders[0]

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-10">
                <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
                    <span className="text-primary">COMMAND</span> <span className="text-secondary">CENTER</span>
                </h1>
                <p className="text-lg text-muted-foreground">Monitor your acquisitions and progress through the Komet sectors</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="bg-card border border-border w-auto overflow-x-auto justify-start h-auto p-1">
                    <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
                    <TabsTrigger value="library" className="px-6 py-2">My Library</TabsTrigger>
                    <TabsTrigger value="orders" className="px-6 py-2">Order History</TabsTrigger>
                    <TabsTrigger value="settings" className="px-6 py-2">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 animate-fade-up">
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-display text-2xl tracking-wider uppercase">Current Transmissions</h2>
                                    <Link href="/browse" className="text-xs text-primary hover:underline">Continue Reading</Link>
                                </div>
                                {initialLibrary.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {initialLibrary.slice(0, 2).map((item) => (
                                            <LibraryBookCard
                                                key={item.id}
                                                book={{
                                                    id: item.books.id,
                                                    title: item.books.title,
                                                    author: item.books.author,
                                                    coverImage: item.books.cover_image_url || "/placeholder.webp",
                                                    price: 0, // Not needed here
                                                    genre: item.books.genre,
                                                    description: item.books.description,
                                                    variants: []
                                                }}
                                                userBook={{
                                                    bookId: item.books.id,
                                                    purchaseDate: new Date(item.acquired_at),
                                                    progress: item.reading_progress?.[0]?.progress_percent || 0,
                                                    status: item.reading_progress?.[0]?.progress_percent === 100 ? "finished" : (item.reading_progress?.[0]?.progress_percent > 0 ? "reading" : "not-started")
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-8 text-center bg-muted/10 border-dashed">
                                        <p className="text-muted-foreground italic mb-4">No active reading signals detected.</p>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/browse">Acquire New Data</Link>
                                        </Button>
                                    </Card>
                                )}
                            </section>


                        </div>

                        <div className="space-y-6">
                            <h2 className="font-display text-2xl tracking-wider uppercase">Recent Acquisition</h2>
                            {mostRecentOrder ? (
                                <Card className="overflow-hidden border-primary/20">
                                    <div className="bg-primary/10 p-4 border-b border-primary/20 flex justify-between items-center">
                                        <span className="text-xs font-mono font-bold">{mostRecentOrder.id.slice(0, 8)}</span>
                                        <span className={cn(
                                            "text-[10px] uppercase px-2 py-0.5 rounded-full font-bold",
                                            mostRecentOrder.status === 'delivered' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                                        )}>
                                            {mostRecentOrder.status}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {mostRecentOrder.order_items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="truncate pr-4">{item.books.title}</span>
                                                <span className="text-muted-foreground flex-shrink-0">x{item.quantity}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-border pt-3 mt-3 flex justify-between items-center font-bold">
                                            <span>Total</span>
                                            <span className="text-primary">${mostRecentOrder.total}</span>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="p-6 text-center bg-muted/10 border-dashed">
                                    <p className="text-sm text-muted-foreground italic">No historical acquisitions found.</p>
                                </Card>
                            )}

                            <Card className="p-6 bg-gradient-to-br from-secondary/20 to-primary/20 border-secondary/30">
                                <h3 className="font-display text-xl tracking-wide mb-3">ELITE MEMBERSHIP</h3>
                                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                    Access exclusive sectors, advance-release content, and elite community badges.
                                </p>
                                <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold tracking-widest text-xs h-9" asChild>
                                    <Link href="/book-club">UPGRADE ACCESS</Link>
                                </Button>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="library" className="animate-fade-up">
                    {initialLibrary.length > 0 ? (
                        <div className="space-y-12">
                            <section>
                                <h2 className="font-display text-3xl tracking-wider uppercase mb-6">Archive Collection</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {initialLibrary.map((item) => (
                                        <LibraryBookCard
                                            key={item.id}
                                            book={{
                                                id: item.books.id,
                                                title: item.books.title,
                                                author: item.books.author,
                                                coverImage: item.books.cover_image_url || "/placeholder.webp",
                                                price: 0,
                                                genre: item.books.genre,
                                                description: item.books.description,
                                                variants: []
                                            }}
                                            userBook={{
                                                bookId: item.books.id,
                                                purchaseDate: new Date(item.acquired_at),
                                                progress: item.reading_progress?.[0]?.progress_percent || 0,
                                                status: item.reading_progress?.[0]?.progress_percent === 100 ? "finished" : (item.reading_progress?.[0]?.progress_percent > 0 ? "reading" : "not-started")
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        </div>
                    ) : (
                        <Card className="p-16 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                            <BookOpen className="w-10 h-10 text-muted-foreground opacity-50 mb-6" />
                            <h2 className="font-display text-4xl tracking-wider uppercase mb-3">Your Library is Void</h2>
                            <p className="text-muted-foreground max-w-lg mb-8 text-lg italic">
                                Start your collection and track your journey across the Komet sectors.
                            </p>
                            <Button size="lg" asChild>
                                <Link href="/browse">BEGIN EXPLORATION</Link>
                            </Button>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="orders" className="animate-fade-up">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <h2 className="font-display text-3xl tracking-wider uppercase mb-2">Past Acquisitions</h2>
                        {initialOrders.map((order) => (
                            <Card key={order.id} className="p-6 bg-card/50 hover:border-primary/30 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-primary">{order.id.slice(0, 8)}</span>
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                order.status === 'delivered' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                                            <Clock className="w-3 h-3" />
                                            {new Date(order.placed_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex-1 md:px-12">
                                        <p className="text-sm font-medium">
                                            {order.order_items.map((i: any) => i.books.title).join(", ")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                                        <p className="font-bold text-lg">${order.total}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="animate-fade-up">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="font-display text-3xl tracking-wider uppercase mb-2">Profile & Security</h2>
                        <Card className="p-8">
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            value={profile.full_name || ""}
                                            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="displayName">Explorer Call Sign (Display Name)</Label>
                                        <Input
                                            id="displayName"
                                            value={profile.display_name || ""}
                                            onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={profile.phone || ""}
                                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dob">Date of Birth</Label>
                                        <Input
                                            id="dob"
                                            type="date"
                                            value={profile.date_of_birth || ""}
                                            onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Mailing Address</Label>
                                    <Input
                                        id="address"
                                        value={profile.mailing_address || ""}
                                        onChange={e => setProfile({ ...profile, mailing_address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tshirt">T-Shirt Size</Label>
                                    <select
                                        id="tshirt"
                                        className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm outline-none focus:ring-1 focus:ring-primary"
                                        value={profile.tshirt_size || ""}
                                        onChange={e => setProfile({ ...profile, tshirt_size: e.target.value })}
                                    >
                                        <option value="">Select Size</option>
                                        <option value="xs">XS</option>
                                        <option value="s">Small</option>
                                        <option value="m">Medium</option>
                                        <option value="l">Large</option>
                                        <option value="xl">XL</option>
                                        <option value="xxl">2XL</option>
                                        <option value="xxxl">3XL</option>
                                    </select>
                                </div>
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "Syncing..." : "Save Identity"}
                                </Button>
                            </form>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
