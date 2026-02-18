"use client"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LibraryBookCard } from "@/components/library-book-card"
import { mockBooks } from "@/lib/mock-books"
import { mockUserLibrary, mockOrders } from "@/lib/mock-user-data"
import { BookOpen, Package, Settings, User, CreditCard, ChevronRight, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [isSaving, setIsSaving] = useState(false)

  // Get user's books
  const userBooks = mockUserLibrary.map((userBook) => {
    const book = mockBooks.find((b) => b.id === userBook.bookId)
    return { book, userBook }
  })

  const currentlyReading = userBooks.filter((ub) => ub.userBook.status === "reading")
  const mostRecentOrder = mockOrders[mockOrders.length - 1]

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("Profile updated successfully!")
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Page Header */}
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
              {/* Left Column: Recent Reading */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-2xl tracking-wider uppercase">Current Transmissions</h2>
                    {currentlyReading.length > 0 && (
                      <Link href="/browse" className="text-xs text-primary hover:underline">Continue Reading</Link>
                    )}
                  </div>
                  {currentlyReading.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentlyReading.slice(0, 2).map(
                        ({ book, userBook }) => book && <LibraryBookCard key={book.id} book={book} userBook={userBook} />,
                      )}
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

                <section>
                  <h2 className="font-display text-2xl tracking-wider uppercase mb-4">Sector Statistics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4 bg-card/50 text-center">
                      <span className="text-3xl font-bold text-primary">4</span>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Books Owned</p>
                    </Card>
                    <Card className="p-4 bg-card/50 text-center">
                      <span className="text-3xl font-bold text-secondary">7</span>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Day Streak</p>
                    </Card>
                    <Card className="p-4 bg-card/50 text-center">
                      <span className="text-3xl font-bold text-primary">1</span>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Read To End</p>
                    </Card>
                    <Card className="p-4 bg-card/50 text-center">
                      <span className="text-3xl font-bold text-secondary">2.1k</span>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total Mins</p>
                    </Card>
                  </div>
                </section>
              </div>

              {/* Right Column: Recent Order & CTA */}
              <div className="space-y-6">
                <h2 className="font-display text-2xl tracking-wider uppercase">Recent Acquisition</h2>
                <Card className="overflow-hidden border-primary/20">
                  <div className="bg-primary/10 p-4 border-b border-primary/20 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold">{mostRecentOrder.id}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-bold">
                      {mostRecentOrder.status}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {mostRecentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="truncate pr-4">{item.title}</span>
                        <span className="text-muted-foreground flex-shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 mt-3 flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span className="text-primary">${mostRecentOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full rounded-none border-t border-border group h-10 text-xs" asChild>
                    <Link href="#">
                      Track Shipments
                      <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-secondary/20 to-primary/20 border-secondary/30">
                  <h3 className="font-display text-xl tracking-wide mb-3">ELITE MEMBERSHIP</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Access exclusive sectors, advance-release chapters, and elite community badges.
                  </p>
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold tracking-widest text-xs h-9">
                    UPGRADE ACCESS
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="animate-fade-up">
            {userBooks.length > 0 ? (
              <div className="space-y-12">
                <section>
                  <h2 className="font-display text-3xl tracking-wider uppercase mb-6">Archive Collection</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {userBooks.map(({ book, userBook }) => book && (
                      <LibraryBookCard key={book.id} book={book} userBook={userBook} />
                    ))}
                  </div>
                </section>

                <Card className="p-10 bg-muted/5 border-dashed border-2 text-center">
                  <h3 className="font-display text-2xl mb-4">DISCOVER NEW WORLDS</h3>
                  <Button asChild size="lg">
                    <Link href="/browse">Explore Library</Link>
                  </Button>
                </Card>
              </div>
            ) : (
              <Card className="p-16 border-dashed border-2 border-border/50 bg-card/10 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
                <h2 className="font-display text-4xl tracking-wider uppercase mb-3">Your Library is Void</h2>
                <p className="text-muted-foreground max-w-lg mb-8 text-lg italic">
                  "A captain without a log is just a drifter." <br />
                  Start your collection and track your journey across the Komet sectors.
                </p>
                <Button size="lg" asChild className="font-display tracking-widest text-xl h-12">
                  <Link href="/browse">BEGIN EXPLORATION</Link>
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="animate-fade-up">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-display text-3xl tracking-wider uppercase mb-2">Past Acquisitions</h2>
              <p className="text-muted-foreground mb-8">Detailed log of all items brought into your personal collection.</p>

              <div className="space-y-4">
                {mockOrders.map((order) => (
                  <Card key={order.id} className="p-6 bg-card/50 hover:border-primary/30 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary">{order.id}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                            order.status === "delivered" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                          )}>
                            {order.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <Clock className="w-3 h-3" />
                          {order.date.toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex-1 md:px-12">
                        <p className="text-sm font-medium">
                          {order.items.map(i => i.title).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} total items
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[150px]">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                          <p className="font-bold text-lg">${order.total.toFixed(2)}</p>
                        </div>
                        <Button variant="outline" size="sm">Details</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-up">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-display text-3xl tracking-wider uppercase mb-2">Profile & Security</h2>
              <p className="text-muted-foreground mb-8">Update your identity and access credentials in the Komet system.</p>

              <Card className="p-8">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 relative group cursor-pointer overflow-hidden">
                      <User className="w-10 h-10 text-primary" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">Lamont Evans</h3>
                      <p className="text-sm text-muted-foreground">Komet Explorer since Dec 2024</p>
                      <Button variant="link" size="sm" className="p-0 h-auto text-primary">Change Avatar</Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="Lamont" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Evans" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="lamont@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" placeholder="Tell us about your cosmic journey..." />
                  </div>

                  <div className="pt-4 border-t border-border mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Last updated: Today at 02:40 AM
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto min-w-[120px]">
                      {isSaving ? "Syncing..." : "Save Identity"}
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="mt-8 space-y-4">
                <h3 className="font-display text-xl tracking-wide">Connected Systems</h3>
                <Card className="p-4 flex items-center justify-between border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-xs text-muted-foreground">Visa ending in 4242</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

