"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookClubSelectionCard } from "@/components/book-club-selection-card"
import { Star, Check, Crown, Clock, Video, MapPin, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SubscriptionModal } from "@/components/subscription-modal"
import { useAuth } from "@/context/auth-context"

interface BookClubContentProps {
    currentSelection: any
    upcomingSelections: any[]
    pastSelections: any[]
    events: any[]
    subscription: any
    eligibleBooks: any[]
}



const bookClubBenefits = [
    {
        title: "Official Komet T-Shirt",
        description: "Receive an exclusive Kane's Komet Book Club Membership T-Shirt as part of your welcome package.",
    },
    {
        title: "2 Free E-Books",
        description: "Select any 2 titles from the Kane's Komet Book Club Collection to instantly kickstart your digital library.",
    },
    {
        title: "Surprise Gift Item",
        description: "Unbox Mystery item along with your membership kit.",
    },
    {
        title: "Kane Dealer Code (35% OFF)",
        description: "Get a special code that grants you 35% off all future purchases when used at checkout.",
    },
    {
        title: "$3.99/mo E-Book Access",
        description: "Enjoy ongoing access to 1 E-Komet Book per month for just $3.99/month. Cancel anytime.",
    },
    {
        title: "Community Access",
        description: "Join exclusive book club discussions and member-only events with authors and fellow readers.",
    },
]

export function BookClubContent({
    currentSelection,
    upcomingSelections,
    pastSelections,
    events,
    subscription,
    eligibleBooks
}: BookClubContentProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { user } = useAuth()
    const isMember = subscription?.plan === 'premium'

    return (
        <div className="animate-in fade-in duration-500">
            {/* Hero Section */}
            <section className="relative overflow-hidden border-b border-border -mt-12 mb-12">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 via-background to-background" />
                <div className="container relative mx-auto px-4 py-20 md:py-32">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <div className="inline-flex items-center gap-2 bg-orange-600/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-full">
                            <Crown className="w-4 h-4" />
                            <span className="text-xs font-bold tracking-widest uppercase">Premium Access</span>
                        </div>

                        <div className="inline-block px-10 py-12 md:px-16 md:py-16 neon-sign-board mx-auto">
                            <h1 className="flex flex-col items-center gap-2">
                                <span className="komet-neon-text komet-neon-text-flicker text-5xl md:text-7xl lg:text-8xl">
                                    KANE&apos;S KOMET
                                </span>
                                <span className="komet-neon-text text-6xl md:text-8xl lg:text-9xl">
                                    BOOK CLUB
                                </span>
                            </h1>
                        </div>

                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Unlock the full Komet Book experience. Get exclusive E-Komet Books, member-only perks, and access to the growing World of Kane's Komet Book library.
                        </p>

                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-baseline gap-2">
                                <span className="font-display text-6xl text-primary">$49.99</span>
                                <span className="text-xl text-muted-foreground">initial</span>
                            </div>
                            <p className="text-lg text-muted-foreground">then $3.99/month • Cancel anytime</p>
                        </div>

                        {!isMember ? (
                            <Button size="lg" className="text-lg px-10 animate-pulse-glow" onClick={() => setIsModalOpen(true)}>
                                <Star className="w-5 h-5 mr-2" />
                                Subscribe Now
                            </Button>
                        ) : (
                            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/30 px-6 py-3 rounded-lg">
                                <Check className="w-5 h-5" />
                                <span className="font-medium">Active Member</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4">
                {/* Current Selection */}
                {currentSelection && (
                    <section className="mb-16">
                        <div className="mb-8">
                            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                                <span className="text-primary">THIS MONTH'S</span> SELECTION
                            </h2>
                        </div>
                        <BookClubSelectionCard
                            selection={{
                                ...currentSelection,
                                discussionDate: new Date(currentSelection.discussion_date)
                            }}
                            book={{
                                id: currentSelection.books.id,
                                title: currentSelection.books.title,
                                author: currentSelection.books.author,
                                coverImage: currentSelection.books.cover_image_url || "/placeholder.webp",
                                price: 0,
                                genre: currentSelection.books.genre,
                                description: currentSelection.books.description,
                                variants: []
                            }}
                            isMember={isMember}
                        />
                    </section>
                )}

                {/* Benefits Grid */}
                <section className="mb-16">
                    <div className="mb-8 text-center">
                        <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                            <span className="text-secondary">MEMBERSHIP</span> BENEFITS
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookClubBenefits.map((benefit, index) => (
                            <Card key={index} className="p-6 bg-card/50 backdrop-blur border-border">
                                <div className="flex items-start gap-4">
                                    <Check className="w-5 h-5 text-primary mt-1" />
                                    <div>
                                        <h3 className="font-display text-lg tracking-wide mb-2">{benefit.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Eligible Books Display (Pick 2) */}
                {eligibleBooks && eligibleBooks.length > 0 && (
                    <section className="mb-24 px-6 py-16 rounded-3xl bg-secondary/5 border border-secondary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative text-center mb-16 max-w-2xl mx-auto">
                            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-4 uppercase">
                                CHOOSE YOUR <span className="text-secondary">2 FREE</span> E-BOOKS
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                When you subscribe to the Book Club, you get to instantly pick any two titles from our exclusive eligible collection to keep forever.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12 max-w-6xl mx-auto">
                            {eligibleBooks.map((book: any) => (
                                <div key={book.id} className="group relative">
                                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:-translate-y-2 border-2 border-transparent group-hover:border-secondary/50">
                                        <Image
                                            src={book.cover_image_url || "/placeholder.webp"}
                                            alt={book.title}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Available</p>
                                            <h4 className="text-white font-display text-sm leading-tight">{book.title}</h4>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <h3 className="font-display text-base tracking-wide line-clamp-1">{book.title}</h3>
                                        <p className="text-xs text-muted-foreground italic mt-1 font-medium">{book.author}</p>
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300">
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 text-center">
                            <Button size="lg" variant="outline" className="border-secondary/50 text-secondary hover:bg-secondary hover:text-secondary-foreground" onClick={() => setIsModalOpen(true)}>
                                View All Eligible Titles
                            </Button>
                        </div>
                    </section>
                )}


                {/* Past Selections */}
                {pastSelections && pastSelections.length > 0 && (
                    <section className="mb-24">
                        <div className="mb-12">
                            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                                <span className="text-muted-foreground">MISSION</span> ARCHIVES
                            </h2>
                            <p className="text-muted-foreground">Explore our past collective reading journeys</p>
                        </div>
                        <div className="grid gap-8">
                            {pastSelections.map((selection) => (
                                <BookClubSelectionCard
                                    key={selection.id}
                                    selection={{
                                        ...selection,
                                        discussionDate: new Date(selection.discussion_date)
                                    }}
                                    book={{
                                        id: selection.books.id,
                                        title: selection.books.title,
                                        author: selection.books.author,
                                        coverImage: selection.books.cover_image_url || "/placeholder.webp",
                                        price: 0,
                                        genre: selection.books.genre,
                                        description: selection.books.description,
                                        variants: []
                                    }}
                                    isMember={isMember}
                                />
                            ))}
                        </div>
                    </section>
                )}


                {/* Events Section */}
                <section className="mb-16">
                    <div className="mb-8">
                        <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                            <span className="text-secondary">ELITE</span> EVENTS
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {events.map((event) => (
                            <Card key={event.id} className="p-6 bg-card/50 backdrop-blur border-border flex flex-col">
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-primary">
                                        {new Date(event.date).toLocaleDateString()}
                                    </p>
                                    <h3 className="font-display text-2xl tracking-wide mt-1">{event.title}</h3>
                                </div>
                                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                                    {event.description}
                                </p>
                                <div className="mt-auto space-y-2 text-sm border-t border-border pt-4">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-secondary" />
                                        <span>{event.time}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-secondary" />
                                        <span>{event.location}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>

            <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    )
}
